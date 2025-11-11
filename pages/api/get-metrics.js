import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    const { athlete_id, from, to, limit = 30 } = req.query;

    if (!athlete_id) {
      return res.status(400).json({ error: "❌ Falta el parámetro 'athlete_id'" });
    }

    let query = supabase
      .from("vip_metrics")
      .select("*")
      .eq("athlete_id", athlete_id)
      .order("date", { ascending: false })
      .limit(limit);

    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);

    const { data, error } = await query;
    if (error) throw error;

    // 🔹 Cálculo rápido de medias y tendencias
    const resumen = {
      total_dias: data.length,
      total_tss: data.reduce((acc, d) => acc + (d.tss || 0), 0),
      total_trimp: data.reduce((acc, d) => acc + (d.trimp || 0), 0),
      total_tiempo_horas: data.reduce((acc, d) => acc + (d.total_time_min || 0), 0) / 60,
      total_distancia_km: data.reduce((acc, d) => acc + (d.total_distance_km || 0), 0),
      total_desnivel_m: data.reduce((acc, d) => acc + (d.total_elevation_m || 0), 0),
    };

    res.status(200).json({
      message: "✅ Métricas obtenidas correctamente",
      resumen,
      data,
    });

  } catch (err) {
    console.error("❌ Error en get-metrics:", err);
    res.status(500).json({ error: err.message });
  }
}
