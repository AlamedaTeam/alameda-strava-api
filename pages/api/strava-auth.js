export default async function handler(req, res) {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("❌ Autorización cancelada por el usuario.");

    // === Intercambiar el 'code' por el 'access_token' en Strava ===
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
    if (data.error) {
      console.error("⚠️ Error con Strava:", data);
      return res.status(400).json({ error: "Error con Strava", detalles: data });
    }

    // === Guardar o actualizar el atleta en Supabase ===
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/strava_users`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
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

    // === Redirigir al mensaje de éxito (temporal en Vercel) ===
    return res.redirect(302, "https://alameda-strava-api.vercel.app/success");

  } catch (err) {
    console.error("🔥 Error interno al conectar con Strava:", err);
    res.status(500).json({ error: "Error interno al conectar con Strava" });
  }
}
