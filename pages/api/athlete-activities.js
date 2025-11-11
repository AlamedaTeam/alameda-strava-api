import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const athleteId = req.query.id;
    if (!athleteId) {
      return res.status(400).json({ error: 'Falta el parámetro id del atleta' });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    // 🔍 Buscar el token del atleta específico
    const { data: tokenData, error: tokenError } = await supabase
      .from('athletes_tokens')
      .select('*')
      .eq('athlete_id', athleteId)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('No se encontró el token para ese atleta.');
    }

    let { access_token, refresh_token, expires_at } = tokenData;
    const now = Math.floor(Date.now() / 1000);

    // ♻️ Refrescar token si está caducado
    if (expires_at <= now) {
      console.log(`♻️ Token caducado para ${athleteId}, renovando...`);
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

      await supabase
        .from('athletes_tokens')
        .update({
          access_token,
          refresh_token,
          expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq('athlete_id', athleteId);

      console.log('✅ Token renovado correctamente.');
    }

    // 🚀 Llamar a Strava con el token válido
    const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=50', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const activities = await response.json();
    if (!response.ok) throw new Error('Error al obtener actividades desde Strava.');

    // 💾 Simplificar datos
    const simplified = activities.map(a => ({
      id: a.id,
      name: a.name,
      distance_km: (a.distance / 1000).toFixed(2),
      elevation_gain: a.total_elevation_gain,
      moving_time_min: (a.moving_time / 60).toFixed(1),
      avg_hr: a.average_heartrate || null,
      start_date: a.start_date_local || a.start_date,
    }));

    res.status(200).json({ athlete_id: athleteId, activities: simplified });
  } catch (err) {
    console.error('❌ Error en /athlete-activities:', err);
    res.status(500).json({ error: err.message });
  }
}
