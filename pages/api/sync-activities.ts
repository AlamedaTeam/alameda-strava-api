import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// 🔑 Conexión a Supabase (usa tus envs ya configuradas)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("🚀 Sincronización iniciada...");

    // 1️⃣ Obtenemos los usuarios de Strava guardados
    const { data: users, error: userError } = await supabase
      .from("strava_users")
      .select("*");

    if (userError) throw new Error("Error obteniendo usuarios: " + userError.message);
    if (!users?.length) throw new Error("No hay usuarios Strava guardados");

    // 2️⃣ Recorremos cada usuario y pedimos sus actividades
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

      // 3️⃣ Procesamos cada actividad con formato “Alameda Team”
      for (const act of activities) {
        const distance_km = (act.distance / 1000).toFixed(2) + " km";
        const moving_time_min = Math.round(act.moving_time / 60) + " min";
        const elapsed_time_min = Math.round(act.elapsed_time / 60) + " min";
        const elevation_gain_m = "+" + Math.round(act.total_elevation_gain) + " m";
        const avg_speed_kmh = (act.average_speed * 3.6).toFixed(1);
        const pace_min_km = act.average_speed
          ? `${Math.floor(1000 / act.average_speed / 60)}:${String(
              Math.round((1000 / act.average_speed) % 60)
            ).padStart(2, "0")}/km`
          : null;

        // Fecha en formato DD-MM-YYYY
        const dateObj = new Date(act.start_date);
        const date = `${String(dateObj.getDate()).padStart(2, "0")}-${String(
          dateObj.getMonth() + 1
        ).padStart(2, "0")}-${dateObj.getFullYear()}`;

        // 4️⃣ Insertamos o actualizamos en la tabla alameda_activities
        const { error: insertError } = await supabase
          .from("alameda_activities")
          .upsert({
            athlete_id: user.athlete_id,
            activity_id: act.id,
            platform: "Strava",
            name: act.name,
            sport_type: act.sport_type,
            start_date: act.start_date,
            timezone: act.timezone,
            description: act.description,
            distance_km,
            moving_time_min,
            elapsed_time_min,
            elevation_gain_m,
            pace_min_km,
            avg_speed_kmh: avg_speed_kmh,
            date,
          });

        if (insertError)
          console.error(`⚠️ Error insertando actividad ${act.id}:`, insertError.message);
      }

      console.log(`✅ Actividades insertadas correctamente para ${user.athlete_id}`);
    }

    return res.status(200).send("✅ Actividades sincronizadas correctamente (formato Alameda Team)");
  } catch (err: any) {
    console.error("💥 Error general:", err.message);
    return res.status(500).send("❌ Error interno: " + err.message);
  }
}
