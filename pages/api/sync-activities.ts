// /api/sync-activities.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data: users } = await supabase.from("strava_users").select("*");
    if (!users || users.length === 0) {
      return res.status(400).send("No Strava users found");
    }

    for (const user of users) {
      const response = await fetch("https://www.strava.com/api/v3/athlete/activities", {
        headers: { Authorization: `Bearer ${user.access_token}` },
      });
      const activities = await response.json();

      for (const activity of activities) {
        await supabase.from("strava_activities").upsert({
          athlete_id: user.athlete_id,
          strava_id: activity.id,
          name: activity.name,
          distance: activity.distance,
          moving_time: activity.moving_time,
          elapsed_time: activity.elapsed_time,
          total_elevation_gain: activity.total_elevation_gain,
          sport_type: activity.sport_type,
          start_date: activity.start_date,
        });
      }
    }

    res.status(200).send("✅ Actividades sincronizadas correctamente");
  } catch (err) {
    console.error("sync error:", err);
    res.status(500).send("Error syncing activities");
  }
}
