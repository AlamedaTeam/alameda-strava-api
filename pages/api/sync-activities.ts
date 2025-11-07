import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// 🔑 Conexión a Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ⏱️ Función auxiliar para formatear minutos a “1h 34min”
const formatTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m}min`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("🚀 Sincronización iniciada...");

    // 1️⃣ Usuarios conectados a Strava
    const { data: users, error: userError } = await supabase
      .from("strava_users")
      .select("*");
    if (userError) throw new Error("Error obteniendo usuarios: " + userError.message);
    if (!users?.length) throw new Error("No hay usuarios Strava guardados");

    // 2️⃣ Procesamos cada usuario
    for (const user of users) {
      console.log(`🔄 Sincronizando actividades para atleta ${user.athlete_id}`);

      const response = await fetch("https://www.strava.com/api/v3/athlete/activities", {
        headers: { Authorization: `Bearer ${user.access_token}` },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`❌ Strava API error ${response.status}: ${text}`);
      }

      const activities = await response.json();
      console.log(`📥 ${activities.length} actividades recibidas`);

      // 3️⃣ Guardamos en ambas tablas: strava_activities y alameda_activities
      for (const act of activities) {
        const distance_km = (act.distance / 1000).toFixed(2) + " km";
        const moving_time_min = Math.round(act.moving_time / 60);
        const elapsed_time_min = Math.round(act.elapsed_time / 60);
        const elevation_gain_m = "+" + Math.round(act.total_elevation_gain) + " m";
        const avg_speed_kmh = (act.average_speed * 3.6).toFixed(1);
        const pace_min_km = act.average_speed
          ? `${Math.floor(1000 / act.average_speed / 60)}:${String(
              Math.round((1000 / act.average_speed) % 60)
            ).padStart(2, "0")}/km`
          : null;

        const dateObj = new Date(act.start_date);
        const date = `${String(dateObj.getDate()).padStart(2, "0")}-${String(
          dateObj.getMonth() + 1
        ).padStart(2, "0")}-${dateObj.getFullYear()}`;

        // 4️⃣ Insertar en strava_activities (backup crudo)
        await supabase.from("strava_activities").upsert({
          athlete_id: user.athlete_id,
          activity_id: act.id,
          name: act.name,
          sport_type: act.sport_type,
          distance_km,
          moving_time_min: formatTime(moving_time_min),
          elapsed_time_min: formatTime(elapsed_time_min),
          elevation_gain_m,
          pace_min_km,
          avg_speed_kmh,
          start_date: act.start_date,
          timezone: act.timezone,
          date,
          platform: "Strava",
          description: act.description || null,
        });

        // 5️⃣ Insertar con formato Alameda Team
        await supabase.from("alameda_activities").upsert({
          athlete_id: user.athlete_id,
          activity_id: act.id,
          platform: "Strava",
          name: act.name,
          date,
          distance_km: parseFloat((act.distance / 1000).toFixed(2)),
          elevation_gain_m: Math.round(act.total_elevation_gain),
          moving_time_min: formatTime(moving_time_min),
          elapsed_time_min: formatTime(elapsed_time_min),
          pace_min_km: pace_min_km,
        });
      }
    }

    console.log("✅ Sincronización finalizada correctamente");
    return res
      .status(200)
      .send("✅ Actividades sincronizadas correctamente (Strava + formato Alameda Team)");
  } catch (err: any) {
    console.error("💥 Error general:", err.message);
    return res.status(500).send("❌ Error interno: " + err.message);
  }
}
