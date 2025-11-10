import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // 🔍 Coger último token
    const { data: tokenData, error: tokenError } = await supabase
      .from(process.env.SUPABASE_TABLE)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenData)
      throw new Error('No se pudo obtener el access_token de Supabase');

    let { access_token, refresh_token, expires_at } = tokenData;
    const now = Math.floor(Date.now() / 1000);

    // ⚙️ Si el token caducó, renovamos automáticamente
    if (expires_at <= now) {
      console.log('♻️ Token caducado. Renovando...');
      const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token,
        }),
      });

      const refreshData = await refreshResponse.json();
      if (!refreshResponse.ok) throw new Error('Error al refrescar token');

      access_token = refreshData.access_token;
      refresh_token = refreshData.refresh_token;
      expires_at = refreshData.expires_at;

      // 💾 Guardar tokens nuevos en Supabase
      await supabase
        .from(process.env.SUPABASE_TABLE)
        .update({
          access_token,
          refresh_token,
          expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq('athlete_id', tokenData.athlete_id);

      console.log('✅ Token renovado correctamente.');
    }

    // 🚀 Llamada a Strava con token válido
    const r = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=60', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

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

    if (req.query.pretty)
      return res.status(200).send(`<pre>${JSON.stringify(simplified, null, 2)}</pre>`);

    res.status(200).json(simplified);
  } catch (err) {
    console.error('❌ Error en /athlete-activities:', err);
    res.status(500).json({ error: err.message });
  }
}
