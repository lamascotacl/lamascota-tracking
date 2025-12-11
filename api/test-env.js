export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({
    fazt_token_exists: !!process.env.FAZT_TOKEN,
    fazt_token_preview: process.env.FAZT_TOKEN
      ? process.env.FAZT_TOKEN.substring(0, 10) + "..."
      : null
  });
}
