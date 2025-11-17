import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // ----- CORS -----
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Falta el código de autorización." });
    }
    if (!state) {
      return res.status(400).json({ error: "Falta el email (state)." });
    }

    const email = state.trim().toLowerCase();

    // ----- EXCHANGE TOKEN -----
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

    if (!tokenRes.ok) {
      return res.status(400).json({
        error: "Error desde Strava",
        details: tokens,
      });
    }

    const {
      access_token,
      refresh_token,
      expires_at,
      athlete: { id: athlete_id, firstname, lastname },
    } = tokens;

    // ----- SUPABASE -----
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE
    );

    const { error: upsertError } = await supabase
      .from("strava_tokens")
      .upsert({
        athlete_id,
        email,
        firstname,
        lastname,
        access_token,
        refresh_token,
        expires_at,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      return res.status(500).json({
        error: "Error guardando en Supabase",
        details: upsertError,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Strava conectado correctamente.",
      athlete_id,
      email,
    });

  } catch (error) {
    return res.status(500).json({
      error: "Error interno del servidor.",
      details: error.message,
    });
  }
}
