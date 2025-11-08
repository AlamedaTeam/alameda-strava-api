export default async function handler(req, res) {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("Falta el código de autorización.");

    // Intercambiamos el "code" por los tokens de acceso
    const tokenResp = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    const data = await tokenResp.json();
    if (data.errors) return res.status(400).json({ error: "Error con Strava", details: data });

    // Guardamos el atleta y los tokens en Supabase
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/strava_users`, {
      method: "POST",
      headers: {
        "apikey": process.env.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        athlete_id: data.athlete.id,
        firstname: data.athlete.firstname,
        lastname: data.athlete.lastname,
        username: data.athlete.username || null,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
      }),
    });

    // Redirige a página de éxito
    return res.redirect(302, "/success");
  } catch (err) {
    console.error("🔥 Error interno Strava Auth:", err);
    res.status(500).json({ error: "Error interno al conectar con Strava" });
  }
}
