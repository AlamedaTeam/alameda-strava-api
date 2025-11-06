// /pages/api/sync-activities.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Obtener atletas guardados
    const { data: users, error: userError } = await supabase.from("strava_users").select("*");
    if (userError) throw userError;

    for (const user of users) {
      const activitiesRes = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?access_token=${user.access_token}`
      );

      const activities = await activitiesRes.json();

      if (!Array.isArray(activities)) continue;

      // Guardar cada actividad
      for (const act of activities) {
        const { error: insertError } = await supabase
          .from("strava_activities")
          .upsert({
            athlete_id: user.athlete_id,
            strava_id: act.id,
            name: act.name,
            distance: act.distance,
            moving_time: act.moving_time,
            elapsed_time: act.elapsed_time,
            total_elevation_gain: act.total_elevation_gain,
            sport_type: act.sport_type,
            start_date: act.start_date,
            start_latlng: JSON.stringify(act.start_latlng || null),
            end_latlng: JSON.stringify(act.end_latlng || null),
            average_speed: act.average_speed,
            max_speed: act.max_speed,
            average_heartrate: act.average_heartrate,
            max_heartrate: act.max_heartrate,
            updated_at: new Date().toISOString(),
          });

        if (insertError) console.error("Error insertando actividad:", insertError);
      }
    }

    return res.status(200).send("✅ Actividades sincronizadas correctamente");
  } catch (err: any) {
    console.error("Sync error:", err);
    return res.status(500).json({ error: err.message });
  }
}
