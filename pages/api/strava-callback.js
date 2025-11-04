export default async function handler(req, res) {
  const { code, scope, error } = req.query;

  if (error) {
    return res.status(400).json({ error: "Authorization denied by user" });
  }

  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  try {
    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to exchange code for token");
    }

    return res.status(200).json({
      message: "✅ Strava authorization successful",
      athlete: data.athlete,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
