export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-User-Email, X-User-Token");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const code = (req.query.code || "").trim();

  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  const senduEmail = process.env.SENDU_USER_EMAIL;
  const senduToken = process.env.SENDU_USER_TOKEN;

  if (!senduEmail || !senduToken) {
    return res.status(500).json({
      error: "SENDU_USER_EMAIL o SENDU_USER_TOKEN no configurados en Vercel."
    });
  }

  // =====================================
  //   1. INTENTAR SENDU
  // =====================================
  try {
    const senduUrl = `https://app.sendu.cl/api/work_orders.json?keywords=${encodeURIComponent(code)}`;

    const senduResponse = await fetch(senduUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-User-Email": senduEmail,
        "X-User-Token": senduToken
      }
    });

    if (senduResponse.ok) {
      const senduData = await senduResponse.json();

      // Normalizar respuesta a array
      let items = [];

      if (Array.isArray(senduData)) {
        items = senduData;
      } else if (Array.isArray(senduData.work_orders)) {
        items = senduData.work_orders;
      } else if (senduData.work_order) {
        items = [senduData.work_order];
      } else if (senduData) {
        items = [senduData];
      }

      // Buscar coincidencia razonable
      const shipment = items.find(item => {
        const order = String(item.order || "").trim();
        const courierOt = String(item.courier_ot || "").trim();
        return order === code || courierOt === code;
      });

      if (shipment) {
        return res.status(200).json({
          provider: "sendu",
          tracking_url: null,
          data: shipment
        });
      }

      // Si respondió OK pero no hubo coincidencia exacta
      if (items.length > 0) {
        return res.status(200).json({
          provider: "sendu",
          tracking_url: null,
          data: items[0]
        });
      }
    } else {
      const txt = await senduResponse.text();
      console.error("Error Sendu:", senduResponse.status, txt);
    }

  } catch (err) {
    console.error("Sendu Error:", err);
  }

  // =====================================
  //   2. SIMPLIROUTE
  // =====================================
  const srUrl = `https://livetracking.simpliroute.com/widget/account/68768/tracking/${encodeURIComponent(code)}`;

  try {
    const head = await fetch(srUrl, {
      method: "HEAD",
      redirect: "manual"
    });

    if (head.status === 200 || head.status === 302) {
      return res.status(200).json({
        provider: "simpliroute",
        tracking_url: srUrl,
        data: null
      });
    }
  } catch (err) {
    console.error("SimpliRoute Error:", err);
  }

  // =====================================
  //   3. NO ENCONTRADO
  // =====================================
  return res.status(404).json({
    provider: null,
    message: "Shipment not found in Sendu or SimpliRoute"
  });
}
