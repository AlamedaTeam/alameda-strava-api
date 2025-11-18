import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "Falta email." });
    }

    // Conectar a Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE
    );

    // Buscar tokens del atleta
    const { data: tokenRow, error: tokenError } = await supabase
      .from("strava_tokens")
      .select("*")
      .eq("email", email)
      .single();

    if (tokenError || !tokenRow) {
      return res.status(404).json({ error: "No hay tokens para este usuario." });
    }

    // Petición a Strava
    const activitiesRes = await fetch(
      "https://www.strava.com/api/v3/athlete/activities?per_page=30",
      {
        headers: {
          Authorization: `Bearer ${tokenRow.access_token}`,
        },
      }
    );

    const activities = await activitiesRes.json();

    if (!activitiesRes.ok) {
      return res.status(400).json({ error: "Strava rechazó el token.", details: activities });
    }

    // Éxito
    return res.status(200).json({
      ok: true,
      activities
    });

  } catch (e) {
    return res.status(500).json({
      error: "Error interno",
      details: e.message,
    });
  }
}
