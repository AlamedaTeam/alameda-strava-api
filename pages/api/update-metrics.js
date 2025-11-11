import { createClient } from '@supabase/supabase-js';

// 🧠 Función para calcular TSS, TRIMP y métricas básicas
function calcularMetricas(actividad, perfil) {
  const duracion_h = actividad.elapsed_time_min / 60 || 0;
  const fc_media = actividad.average_heart_rate || perfil.fc_reposo || 100;
  const fc_max = perfil.fc_max || 180;

  // TRIMP (Banister modificado)
  const intensidad = (fc_media - perfil.fc_reposo) / (fc_max - perfil.fc_reposo);
  const trimp = duracion_h * intensidad * 100;

  // TSS (Training Stress Score simplificado)
  const ftp = perfil.ftp || 250;
  const np = actividad.average_power || ftp * intensidad;
  const tss = (duracion_h * np * intensidad) / ftp * 100;

  // RPE Load (si el atleta marca RPE)
  const rpe = actividad.rpe || 5;
  const rpe_load = rpe * actividad.elapsed_time_min;

  return { trimp, tss, rpe_load };
}

export default async function handler(req, res) {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    const { athlete_id } = req.query;

    if (!athlete_id) return res.status(400).json({ error: "Falta athlete_id" });

    // 🔹 Obtener perfil fisiológico
    const { data: perfiles } = await supabase.from("profiles").select("*").eq("id", athlete_id).limit(1);
    const perfil = perfiles?.[0] || {};

    // 🔹 Obtener actividades recientes
    const { data: actividades, error } = await supabase
      .from("strava_activities")
      .select("*")
      .eq("athlete_id", athlete_id)
      .order("start_date", { ascending: false })
      .limit(10);

    if (error) throw error;

    // 🔹 Calcular métricas y guardar en vip_metrics
    for (const a of actividades) {
      const { trimp, tss, rpe_load } = calcularMetricas(a, perfil);

      await supabase.from("vip_metrics").upsert({
        athlete_id,
        date: a.start_date?.split('T')[0],
        trimp,
        tss,
        rpe_load,
        total_distance_km: a.distance_km,
        total_time_min: a.elapsed_time_min,
        total_elevation_m: a.elevation_gain_m,
      });
    }

    res.status(200).json({ message: "✅ Métricas actualizadas correctamente" });

  } catch (err) {
    console.error("❌ Error en update-metrics:", err);
    res.status(500).json({ error: err.message });
  }
}
