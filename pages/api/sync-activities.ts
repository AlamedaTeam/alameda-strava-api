import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("🚀 Sincronización iniciada...");

    // 1️⃣ Obtener usuarios guardados en Supabase (tabla: strava_users)
    const { data: users, error: userError } = await supabase
      .from("strava_users")
      .select("*");

    if (userError) throw new Error(`❌ Error obteniendo usuarios: ${userError.message}`);
    if (!users || users.length === 0) throw new Error("⚠️ No hay usuarios Strava guardados.");

    for (const user of users) {
      console.log(`➡️ Usuario: ${user.athlete_id}`);

      const response = await fetch(`https://www.strava.com/api/v3/athlete/activities`, {
        headers: { Authorization: `Bearer ${user.access_token}` },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`❌ Strava API error: ${response.status} → ${text}`);
      }

      const activities = await response.json();
      console.log(`📦 ${activities.length} actividades recibidas`);

      // 2️⃣ Limpiar y transformar datos al formato Alameda Team
      const cleanActivities = activities.map((a: any) => {
        const distanceKm = (a.distance / 1000).toFixed(2);
        const movingMin = Math.round(a.moving_time / 60);
        const elapsedMin = Math.round(a.elapsed_time / 60);
        const elevation = `+${Math.round(a.total_elevation_gain)} m`;

        // Pace (min/km)
        const pace =
          a.sport_type === "Run"
            ? `${Math.floor(movingMin / (a.distance / 1000))}:${String(
                Math.round(((movingMin / (a.distance / 1000)) % 1) * 60)
              ).padStart(2, "0")} /km`
            : null;

        // Formato fecha: día-mes-año
        const dateObj = new Date(a.start_date_local);
        const day = String(dateObj.getDate()).padStart(2, "0");
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const year = dateObj.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;

        return {
          athlete_id: user.athlete_id,
          strava_id: a.id,
          date: formattedDate,
          name: a.name,
          distance_km: `${distanceKm} km`,
          moving_time_min: `${movingMin} min`,
          elapsed_time_min: `${elapsedMin} min`,
          elevation_m: elevation,
          pace_min_km: pace,
          sport_type: a.sport_type,
        };
      });

      // 3️⃣ Insertar en Supabase
      const { error: insertError } = await supabase
        .from("strava_activities")
        .upsert(cleanActivities, { onConflict: "strava_id" });

      if (insertError) throw new Error(`⚠️ Error insertando actividades: ${insertError.message}`);
      console.log(`✅ Actividades insertadas correctamente para ${user.athlete_id}`);
    }

    return res.status(200).send("✅ Actividades sincronizadas correctamente (formato Alameda Team)");
  } catch (err: any) {
    console.error("❌ Error general:", err.message);
    return res.status(500).send(`❌ Error interno: ${err.message}`);
  }
}
