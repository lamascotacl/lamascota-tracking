export default async function handler(req, res) {
  // CORS
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
  // 1. FAZT API (con token)
  // -------------------------
  const faztApiUrl = `https://api.fazt.cl/api/v2/shipments/${code}`;
  const faztToken = process.env.FAZT_TOKEN; // lo pones en env vars de Vercel

  try {
    const faztResponse = await fetch(faztApiUrl, {
      headers: {
        "Authorization": `Bearer ${faztToken}`,
        "Content-Type": "application/json"
      }
    });

    if (faztResponse.ok) {
      const data = await faztResponse.json();
      return res.status(200).json({
        provider: "fazt",
        tracking_url: `https://panel.fazt.cl/tracking/MjIwLExhIE1hc2NvdGE==/buscar-codigo/${code}`,
        data
      });
    }
  } catch (err) {
    console.error("Error Fazt:", err);
  }

  // -------------------------
  // 2. SIMPLIROUTE HTML HEAD
  // -------------------------
  const srURL = `https://livetracking.simpliroute.com/widget/account/68768/tracking/${code}`;

  try {
    const srResp = await fetch(srURL, { method: "HEAD" });

    if (srResp.status === 200 || srResp.status === 302) {
      return res.status(200).json({
        provider: "simpliroute",
        tracking_url: srURL,
        data: null // no tenemos json hasta que SR entregue token
      });
    }
  } catch (err) {
    console.error("Error SR:", err);
  }

  // -------------------------
  // 3. NO ENCONTRADO
  // -------------------------
  return res.status(404).json({
    provider: null,
    message: "Shipment not found in Fazt or SimpliRoute"
  });
}
