// /pages/api/exchange_token.js
export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).json({ error: "Access denied by user" });
  }

  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  try {
    // Llamada a Strava para intercambiar el code por tokens reales
    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: "184014",
        client_secret: "72954c29a0d9f5ab52aab4347d33a92b9c6b9",
        code: code,
        grant_type: "authorization_code",
      }),
    });

    const data = await response.json();

    if (data.errors) {
      return res.status(400).json({ message: "Authorization failed", data });
    }

    // Todo correcto ✅
    return res.status(200).json({
      message: "✅ Token exchange successful!",
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      athlete: data.athlete,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
