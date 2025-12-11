export default async function handler(req, res) {
  // -------------------------
  // CORS
  // -------------------------
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  // -------------------------
  // 1. PROVEEDOR: FAZT (API real)
  // -------------------------

  const faztApiUrl = `https://staging-api.fazt.cl/api/v2/shipments/${code}`;
  const faztToken = process.env.FAZT_TOKEN;

  try {
    const faztResponse = await fetch(faztApiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${faztToken}`,
        "Accept": "application/json"
      }
    });

    if (faztResponse.ok) {
      const faztData = await faztResponse.json();

      return res.status(200).json({
        provider: "fazt",
        tracking_url: `https://panel.fazt.cl/tracking/MjIwLExhIE1hc2NvdGE==/buscar-codigo/${code}`,
        data: faztData
      });
    }

  } catch (err) {
    console.error("Error consultando Fazt API:", err);
  }

  // -------------------------
  // 2. PROVEEDOR: SimpliRoute (HTML público)
  // -------------------------

  const srUrl = `https://livetracking.simpliroute.com/widget/account/68768/tracking/${code}`;

  try {
    // HEAD detecta si la página existe sin descargarla entera
    const srResp = await fetch(srUrl, { method: "HEAD" });

    // 200 ó 302 → existe
    if (srResp.status === 200 || srResp.status === 302) {
      return res.status(200).json({
        provider: "simpliroute",
        tracking_url: srUrl,
        data: null
      });
    }

  } catch (err) {
    console.error("Error consultando SimpliRoute:", err);
  }

  // -------------------------
  // 3. PROVEEDOR NO ENCONTRADO
  // -------------------------

  return res.status(404).json({
    provider: null,
    message: "Shipment not found in Fazt or SimpliRoute"
  });
}
