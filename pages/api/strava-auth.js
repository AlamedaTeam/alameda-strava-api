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

    // ----- VALIDACIONES BÁSICAS -----
    if (!code) {
      return res
        .status(400)
        .json({ error: "Falta el código de autorización." });
    }
    if (!state) {
      return res.status(400).json({ error: "Falta el email (state)." });
    }

    const email = state.trim().toLowerCase();

    // ----- PEDIR TOKENS A STRAVA -----
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

    // ----- CONECTAR A SUPABASE -----
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE
    );

    // OJO: tabla nueva = athletes_tokens
    const { data, error: upsertError } = await supabase
      .from("athletes_tokens")
      .upsert(
        {
          athlete_id,
          firstname,
          lastname,
          access_token,
          refresh_token,
          expires_at,
          // updated_at lo pisamos siempre que se conecta
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "athlete_id", // si ya existe ese atleta, lo actualiza
        }
      );

    if (upsertError) {
      console.error("Supabase error:", upsertError);
      return res.status(500).json({
        error: "Error guardando en Supabase",
        details: upsertError.message,
        code: upsertError.code,
      });
    }

    // ----- TODO OK -----
    return res.status(200).json({
      ok: true,
      message: "Strava conectado correctamente.",
      athlete_id,
      email,
      db: data,
    });
  } catch (error) {
    console.error("Error interno:", error);
    return res.status(500).json({
      error: "Error interno del servidor.",
      details: error.message,
    });
  }
}
