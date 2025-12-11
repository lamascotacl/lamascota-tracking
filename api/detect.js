export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Manejar preflight (solo por seguridad)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  // Fazt API
  const faztApiUrl = `https://api.fazt.cl/api/v2/shipments/${code}`;

  // SimpliRoute API
  const simpliApiUrl = `https://api.simpliroute.com/v1/plans/visits/${code}/detail/`;
  const SIMPLI_TOKEN = process.env.SIMPLI_TOKEN || "";

  // 1) Probar Fazt
  try {
    const faztResponse = await fetch(faztApiUrl);

    if (faztResponse.ok) {
      const faztData = await faztResponse.json();

      return res.status(200).json({
        provider: "fazt",
        tracking_url: `https://panel.fazt.cl/tracking/MjIwLExhIE1hc2NvdGE==/buscar-codigo/${code}`,
        data: faztData
      });
    }
  } catch (err) {}

  // 2) Probar SimpliRoute
  try {
    const simpliResponse = await fetch(simpliApiUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${SIMPLI_TOKEN}`
      }
    });

    if (simpliResponse.ok) {
      const simpliData = await simpliResponse.json();

      return res.status(200).json({
        provider: "simpliroute",
        tracking_url: `https://livetracking.simpliroute.com/widget/account/68768/tracking/${code}`,
        data: simpliData
      });
    }
  } catch (err) {}

  // 3) Ninguno encontró el código
  return res.status(404).json({
    provider: null,
    message: "Shipment not found in Fazt or SimpliRoute"
  });
}
