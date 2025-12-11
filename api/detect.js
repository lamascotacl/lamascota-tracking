// =====================================
//   TOKEN DINÁMICO FAZT
// =====================================
let faztToken = null;
let faztTokenExpiresAt = 0;

async function getFaztToken() {
  const now = Date.now();

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
    const txt = await resp.text();
    throw new Error(`Error login Fazt: ${resp.status} - ${txt}`);
  }

  const data = await resp.json();
  const token = data.access_token || data.token;

  if (!token) {
    throw new Error("Fazt login no devolvió access_token/token.");
  }

  faztToken = token;
  faztTokenExpiresAt = now + 5.5 * 60 * 60 * 1000;

  return faztToken;
}


// =====================================
//   HANDLER PRINCIPAL
// =====================================
export default async function handler(req, res) {

  // --- CORS ---
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


  // =====================================
  //   1. INTENTAR FAZT (API REAL)
  // =====================================
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

    // Si FAZT encontró el envío → respuesta 200
    if (faztResponse.ok) {
      const faztData = await faztResponse.json();

      return res.status(200).json({
        provider: "fazt",
        tracking_url: `https://panel.fazt.cl/tracking/MjIwLExhIE1hc2NvdGE==/buscar-codigo/${code}`,
        data: faztData
      });
    }

    // Si no es 404, es un error
    if (faztResponse.status !== 404) {
      console.error("Error en Fazt:", faztResponse.status);
    }

  } catch (err) {
    console.error("Fazt Error:", err);
  }


  // =====================================
  //   2. SIMPLIROUTE → URL PÚBLICA
  // =====================================
  const srUrl = `https://livetracking.simpliroute.com/widget/account/68768/tracking/${code}`;

  try {
    const head = await fetch(srUrl, { method: "HEAD" });

    // HEAD 200 o 302 → Existe → Es SimpliRoute
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
    message: "Shipment not found in Fazt or SimpliRoute"
  });
}
