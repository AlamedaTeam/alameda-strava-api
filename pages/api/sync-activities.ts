import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("🟢 Sync iniciado");

    const { data: users, error: userError } = await supabase.from("strava_users").select("*");
    if (userError) throw new Error("❌ Error obteniendo usuarios: " + userError.message);
    if (!users || users.length === 0) throw new Error("⚠️ No hay usuarios Strava guardados");

    for (const user of users) {
      console.log(`📡 Usuario: ${user.athlete_id}`);

      const response = await fetch("https://www.strava.com/api/v3/athlete/activities", {
        headers: { Authorization: `Bearer ${user.access_token}` },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`❌ Strava API error: ${response.status} - ${text}`);
      }

      const activities = await response.json();
      console.log(`✅ ${activities.length} actividades recibidas`);

      for (const act of activities) {
        const { error: insertError } = await supabase.from("strava_activities").upsert({
          athlete_id: user.athlete_id,
          strava_id: act.id,
          name: act.name,
          distance: act.distance,
          moving_time: act.moving_time,
          elapsed_time: act.elapsed_time,
          total_elevation_gain: act.total_elevation_gain,
          sport_type: act.sport_type,
          start_date: act.start_date,
        });
        if (insertError) console.error("⚠️ Error insertando actividad:", insertError.message);
      }
    }

    return res.status(200).send("✅ Actividades sincronizadas correctamente");
  } catch (err: any) {
    console.error("❌ Error general:", err.message);
    return res.status(500).send("Error interno: " + err.message);
  }
}
