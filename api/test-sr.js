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

  const token = process.env.SIMPLIROUTE_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: "SIMPLIROUTE_TOKEN no configurado"
    });
  }

  const url = `https://api.simpliroute.com/v1/routes/visits/${code}/`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Token ${token}`,
        "Accept": "application/json"
      }
    });

    const log = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    };

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        ok: false,
        info: log,
        body: text
      });
    }

    const data = await response.json();

    return res.status(200).json({
      ok: true,
      url,
      data
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}
