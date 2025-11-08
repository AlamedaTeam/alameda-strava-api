// pages/api/strava-auth.js
export default async function handler(req, res) {
  const { code, error } = req.query;
  if (error) return res.status(400).send("Autorización cancelada por el usuario");

  try {
    // 1️⃣ Intercambiamos el code por access_token
    const resp = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    const data = await resp.json();
    if (data.errors) return res.status(400).json({ error: "Error con Strava", details: data });

    // 2️⃣ Guardamos en Supabase los tokens y datos del atleta
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/strava_users`, {
      method: "POST",
      headers: {
        "apikey": process.env.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        athlete_id: data.athlete.id,
        username: data.athlete.username,
        firstname: data.athlete.firstname,
        lastname: data.athlete.lastname,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
      }),
    });

    // 3️⃣ Redirigimos al atleta de vuelta a su panel VIP
    return res.redirect("https://www.alamedateam.com/vip-atletas");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno al conectar con Strava" });
  }
}
