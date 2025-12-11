// /api/detect.js

export default async function handler(req, res) {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: "Missing code parameter" });
  }

  // SimpliRoute
  const simpliURL = `https://livetracking.simpliroute.com/widget/account/68768/tracking/${code}`;

  // Fazt API
  const faztApiUrl = `https://api.fazt.cl/api/v2/shipments/${code}`;

  try {
    // Primero probamos Fazt (API real)
    const faztResponse = await fetch(faztApiUrl, { method: "GET" });

    if (faztResponse.status === 200) {
      // Fazt encontró datos válidos
      const data = await faztResponse.json();
      return res.status(200).json({
        provider: "fazt",
        url: `https://panel.fazt.cl/tracking/MjIwLExhIE1hc2NvdGE==/buscar-codigo/${code}`,
        shipment: data
      });
    }
  } catch (error) {
    // error en la petición de Fazt — seguimos con SimpliRoute
  }

  try {
    // Intentamos SimpliRoute usando un GET
    const simpliResponse = await fetch(simpliURL, { method: "GET" });

    if (simpliResponse.status === 200) {
      return res.status(200).json({
        provider: "simpliroute",
        url: simpliURL
      });
    }
  } catch (error) {
    // error en SimpliRoute
  }

  // Si ambos fallan:
  return res.status(404).json({
    provider: null,
    message: "Shipment not found in either provider"
  });
}
