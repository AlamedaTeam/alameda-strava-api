// /api/sync-activities.js
// Sincroniza las actividades de todos los atletas desde Strava -> Supabase

import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET,
} = process.env;

export default async function handler(req, res) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1️⃣ Leer atletas registrados
    const { data: users, error: userErr } = await supabase
      .from('strava_users')
      .select('*');

    if (userErr) throw userErr;
    if (!users?.length) return res.status(200).json({ ok: true, message: 'No users connected yet.' });

    let total = 0;
    for (const u of users) {
      const token = await getValidToken(u, supabase);
      if (!token) continue;

      // 2️⃣ Descargar actividades recientes
      const acts = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?per_page=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(r => r.json());

      if (!Array.isArray(acts)) continue;

      for (const a of acts) {
        const activity = {
          athlete_id: u.athlete_id,
          strava_id: a.id,
          name: a.name,
          distance: a.distance,
          moving_time: a.moving_time,
          elapsed_time: a.elapsed_time,
          total_elevation_gain: a.total_elevation_gain,
          sport_type: a.sport_type,
          start_date: a.start_date,
          start_latlng: a.start_latlng?.join(',') || null,
          end_latlng: a.end_latlng?.join(',') || null,
          average_speed: a.average_speed,
          max_speed: a.max_speed,
          elev_high: a.elev_high,
          elev_low: a.elev_low,
          has_heartrate: a.has_heartrate,
          average_heartrate: a.average_heartrate,
          max_heartrate: a.max_heartrate,
          updated_at: new Date().toISOString(),
        };

        await supabase
          .from('strava_activities')
          .upsert(activity, { onConflict: 'strava_id' });
        total++;
      }
    }

    return res.status(200).json({ ok: true, total });
  } catch (err) {
    console.error('sync error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

/* === Token refresher === */
async function getValidToken(user, supabase) {
  try {
    const now = Math.floor(Date.now() / 1000);
    if (user.expires_at > now) return user.access_token;

    // refresh
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: user.refresh_token,
      }),
    });

    const data = await res.json();
    if (!data?.access_token) return null;

    // update supabase
    await supabase
      .from('strava_users')
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq('athlete_id', user.athlete_id);

    return data.access_token;
  } catch (err) {
    console.error('refresh token error', err);
    return null;
  }
}
