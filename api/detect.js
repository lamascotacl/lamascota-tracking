// /api/detect.js

export default async function handler(req, res) {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  // URLs para consulta
  const faztEncoded = "MjIwLExhIE1hc2NvdGE=="; // Base64("220,La Mascota")
  const simpliURL = `https://livetracking.simpliroute.com/widget/account/68768/tracking/${code}`;
  const faztURL = `https://panel.fazt.cl/tracking/${faztEncoded}/buscar-codigo/${code}`;

  try {
    // 1) Probar Fazt primero
    const faztResponse = await fetch(faztURL, { method: "GET" });

    if (faztResponse.status === 200) {
      return res.status(200).json({
        carrier: "fazt",
        url: faztURL
      });
    }
  } catch (err) {
    // si falla, seguimos
  }

  try {
    // 2) Probar SimpliRoute
    const srResponse = await fetch(simpliURL, { method: "GET" });

    if (srResponse.status === 200) {
      return res.status(200).json({
        carrier: "simpliroute",
        url: simpliURL
      });
    }
  } catch (err) {
    // ignoramos
  }

  // Ninguno respondió 200
  return res.status(404).json({
    carrier: "unknown",
    message: "Código no encontrado en ningún proveedor"
  });
}
