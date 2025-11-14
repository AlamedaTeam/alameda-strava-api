import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const { code, state } = req.query;

    if (!code) return res.status(400).send("Falta el código de autorización.");
    if (!state) return res.status(400).send("Falta el email (state).");

    const email = state.trim().toLowerCase();

    // 1️⃣ Intercambiar el código por tokens de Strava
    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokenRes.ok || tokens.error) {
      return res.status(400).json({
        error: "Error en Strava",
        details: tokens,
      });
    }

    const {
      access_token,
      refresh_token,
      expires_at,
      athlete
    } = tokens;

    // 2️⃣ Conectar a Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE
    );

    // 3️⃣ Guardar tokens (sin duplicar)
    const { error } = await supabase
      .from("athletes_tokens")
      .upsert(
        {
          email,
          athlete_id: athlete.id,
          firstname: athlete.firstname,
          lastname: athlete.lastname,
          access_token,
          refresh_token,
          expires_at,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "athlete_id",
          returning: "minimal"
        }
      );

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({
        error: "Error guardando en Supabase",
        details: error.message,
      });
    }

    // 4️⃣ Redirigir a la zona VIP
    return res.redirect(
      302,
      "https://www.alamedatrailteam.com/pagina-en-blanco/?strava=ok"
    );

  } catch (err) {
    console.error("Error interno Strava Auth:", err);
    res.status(500).json({
      error: "Error interno en Strava Auth",
      details: err.message,
    });
  }
}
