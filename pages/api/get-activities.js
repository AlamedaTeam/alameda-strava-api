// /pages/api/get-activities.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    const { athlete_id, sport_type, limit = 20, from, to } = req.query;

    if (!athlete_id) {
      return res.status(400).json({ error: "❌ Falta el parámetro 'athlete_id'" });
    }

    let query = supabase
      .from("strava_activities")
      .select("*")
      .eq("athlete_id", athlete_id) // 👈 sin parseInt si en Supabase es TEXT
      .order("start_date", { ascending: false })
      .limit(Number(limit));

    if (sport_type) query = query.eq("sport_type", sport_type);
    if (from) query = query.gte("start_date", from);
    if (to) query = query.lte("start_date", to);

    const { data, error } = await query;
    if (error) throw error;

    res.status(200).json({
      message: "✅ Actividades obtenidas correctamente",
      total: data.length,
      data,
    });
  } catch (err) {
    console.error("❌ Error en get-activities:", err);
    res.status(500).json({ error: err.message });
  }
}
