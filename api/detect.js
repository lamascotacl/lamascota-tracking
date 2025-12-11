// Cache en memoria del token de Fazt (dentro de la lambda)
let faztToken = null;
let faztTokenExpiresAt = 0; // timestamp en ms

async function getFaztToken() {
  const now = Date.now();

  // Si ya tenemos token y aún no "caduca", lo reutilizamos
  if (faztToken && now < faztTokenExpiresAt) {
    return faztToken;
  }

  const email = process.env.FAZT_EMAIL;
  const password = process.env.FAZT_PASSWORD;

  if (!email || !password) {
    throw new Error("FAZT_EMAIL o FAZT_PASSWORD no configurados en Vercel.");
  }

  const loginUrl = "https://api.fazt.cl/api/login";

  const resp = await fetch(loginUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `Error al hacer login en Fazt: ${resp.status} ${resp.statusText} - ${text}`
    );
  }

  const data = await resp.json();

  // Según lo que viste antes, el login devuelve:
  // {
  //   "access_token": "...",
  //   "token": "..."
  // }
  const token = data.access_token || data.token;
  if (!token) {
    throw new Error("Fazt login no devolvió access_token ni token.");
  }

  // Guardamos en memoria del proceso
  faztToken = token;
  // Lo consideramos válido por ~5.5 horas (para no llegar justo a las 6)
  const cincoHorasYMedia = 5.5 * 60 * 60 * 1000;
  faztTokenExpiresAt = Date.now() + cincoHorasYMedia;

  return faztToken;
}

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
  // 1. PROVEEDOR: FAZT (API real en PRODUCCIÓN)
  // -------------------------

  try {
    const token = await getFaztToken();

    const faztApiUrl = `https://api.fazt.cl/api/v2/shipments/${code}`;

    const faztResponse = await fetch(faztApiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
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

    // Si la API dice 404 (envío no encontrado), seguimos a SimpliRoute
    if (faztResponse.status !== 404) {
      // Para otros errores (500, 401 inesperado, etc.) logueamos
      const text = await faztResponse.text();
      console.error("Error Fazt API:", faztResponse.status, faztResponse.statusText, text);
    }

  } catch (err) {
    console.error("Error en login/consulta Fazt:", err);
    // Si el login o la llamada fallan, seguimos a SimpliRoute
  }

  // -------------------------
  // 2. PROVEEDOR: SimpliRoute (HTML público)
  // -------------------------

  const srUrl = `https://livetracking.simpliroute.com/widget/account/68768/tracking/${code}`;

  try {
    // HEAD para ver si la página existe
    const srResp = await fetch(srUrl, { method: "HEAD" });

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
  // 3. NO ENCONTRADO EN NINGÚN PROVEEDOR
  // -------------------------

  return res.status(404).json({
    provider: null,
    message: "Shipment not found in Fazt or SimpliRoute"
  });
}
