import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    // 🧩 Conexión a Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // 🔍 Coge el último token guardado del atleta
    const { data: tokenData, error: tokenError } = await supabase
      .from(process.env.SUPABASE_TABLE)
      .select('access_token')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenData)
      throw new Error('No se pudo obtener el access_token de Supabase');

    const accessToken = tokenData.access_token;

    // 🚀 Llama a Strava con el token actual
    const r = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=60',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ error: txt });
    }

    const data = await r.json();
    const simplified = data.map(a => ({
      id: a.id,
      name: a.name,
      start_date: a.start_date,
      distance_km: (a.distance / 1000).toFixed(2),
      elevation_gain: a.total_elevation_gain,
      moving_time_min: (a.moving_time / 60).toFixed(1),
      avg_hr: a.average_heartrate || null,
    }));

    res.status(200).json(simplified);
  } catch (err) {
    console.error('❌ Error en /athlete-activities:', err);
    res.status(500).json({ error: err.message });
  }
}
