import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// 🔑 Conexión a Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ⏱️ Formato de tiempo: pasa minutos a “1h 34min”
const formatTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  const mm = m.toString().padStart(2, "0");
  return h > 0 ? `${h}h ${mm}min` : `${m} min`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("🚀 Sincronización Strava -> Alameda iniciada");

    // 1️⃣ Leer usuarios conectados
    const { data: users, error: userError } = await supabase
      .from("strava_users")
      .select("*");

    if (userError) throw userError;
    if (!users?.length) throw new Error("No hay usuarios Strava conectados");

    for (const user of users) {
      console.log(`🔄 Atleta ${user.athlete_id}`);

      // 2️⃣ Descargar actividades
      const response = await fetch("https://www.strava.com/api/v3/athlete/activities", {
        headers: { Authorization: `Bearer ${user.access_token}` },
      });
      const activities = await response.json();
      if (!Array.isArray(activities)) continue;

      for (const act of activities) {
        const distance_km = parseFloat((act.distance / 1000).toFixed(2));
        const moving_min = Math.round(act.moving_time / 60);
        const elapsed_min = Math.round(act.elapsed_time / 60);
        const elevation_gain_m = Math.round(act.total_elevation_gain);
        const pace_min_km = act.average_speed
          ? `${Math.floor(1000 / act.average_speed / 60)}:${String(
              Math.round((1000 / act.average_speed) % 60)
            ).padStart(2, "0")}/km`
          : null;

        const dateObj = new Date(act.start_date);
        const date = `${String(dateObj.getDate()).padStart(2, "0")}-${String(
          dateObj.getMonth() + 1
        ).padStart(2, "0")}-${dateObj.getFullYear()}`;

        // 3️⃣ Insertar en strava_activities
        await supabase.from("strava_activities").upsert({
          athlete_id: user.athlete_id,
          activity_id: act.id,
          name: act.name,
          sport_type: act.sport_type,
          distance_km: `${distance_km} km`,
          moving_time_min: formatTime(moving_min),
          elapsed_time_min: formatTime(elapsed_min),
          elevation_gain_m: `+${elevation_gain_m} m`,
          pace_min_km,
          avg_speed_kmh: (act.average_speed * 3.6).toFixed(1),
          start_date: act.start_date,
          timezone: act.timezone,
          date,
          platform: "Strava",
          description: act.description || null,
        });

        // 4️⃣ Insertar en formato Alameda Team
        await supabase.from("alameda_activities").upsert({
          athlete_id: user.athlete_id,
          activity_id: act.id,
          platform: "Strava",
          name: act.name,
          date,
          distance_km,
          elevation_gain_m,
          moving_time_min: formatTime(moving_min),
          elapsed_time_min: formatTime(elapsed_min),
          pace_min_km,
        });
      }
    }

    console.log("✅ Sincronización + formateo completados");
    return res
      .status(200)
      .send("✅ Actividades sincronizadas correctamente (formato Alameda automático)");
  } catch (err: any) {
    console.error("💥 Error general:", err.message);
    return res.status(500).send("❌ Error interno: " + err.message);
  }
}
