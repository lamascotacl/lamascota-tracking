export default async function handler(req, res) {
  const code = req.query.code;
  const token = process.env.FAZT_TOKEN;

  const url = `https://staging-api.fazt.cl/api/v2/shipments/${code}`;

  try {
    const faztResp = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      }
    });

    const text = await faztResp.text();

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({
      status: faztResp.status,
      statusText: faztResp.statusText,
      headers: Object.fromEntries(faztResp.headers.entries()),
      body: text
    });

  } catch (err) {
    return res.status(500).json({ error: "Request failed", details: err.message });
  }
}
