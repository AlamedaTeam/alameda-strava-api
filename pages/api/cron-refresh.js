export default async function handler(req, res) {
  try {
    console.log("🚀 Iniciando CRON de refresco de tokens...");

    // 1️⃣ Obtener todos los atletas de Supabase
    const usersResp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/strava_users?select=*`, {
      headers: {
        "apikey": process.env.SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${process.env.SUPABASE_ANON_KEY}`
      }
    });
    const users = await usersResp.json();

    if (!users || users.length === 0) {
      return res.status(200).json({ message: "No hay usuarios registrados" });
    }

    const now = Math.floor(Date.now() / 1000);
    const updated = [];

    // 2️⃣ Recorremos los atletas
    for (const user of users) {
      // Si el token aún está vigente, saltamos
      if (user.expires_at && user.expires_at > now) continue;

      // 3️⃣ Pedimos un nuevo token con el refresh_token
      console.log(`🔄 Refrescando token para atleta ${user.athlete_id}...`);

      const tokenResp = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token: user.refresh_token,
        }),
      });

      const data = await tokenResp.json();

      if (!data.access_token) {
        console.error(`❌ Fallo al refrescar ${user.athlete_id}:`, data);
        continue;
      }

      // 4️⃣ Guardamos los nuevos tokens en Supabase
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/strava_users?athlete_id=eq.${user.athlete_id}`, {
        method: "PATCH",
        headers: {
          "apikey": process.env.SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
        }),
      });

      updated.push(user.athlete_id);
    }

    console.log(`✅ Tokens actualizados para:`, updated);
    res.status(200).json({
      message: `Tokens actualizados correctamente`,
      updated_count: updated.length,
      updated_ids: updated
    });

  } catch (err) {
    console.error("🔥 Error general en CRON:", err);
    res.status(500).json({ error: "Error interno en CRON de refresco", details: err.message });
  }
}
