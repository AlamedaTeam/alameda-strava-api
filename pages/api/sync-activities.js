import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    console.log('🔄 Iniciando sincronización de actividades desde Strava...');

    // Conexión con Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // 1️⃣ Obtenemos el token activo del atleta
    const { data: tokens, error: tokenError } = await supabase
      .from('athletes_tokens')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (tokenError || !tokens) {
      throw new Error('No se encontró token activo en Supabase.');
    }

    const accessToken = tokens.access_token;
    console.log('✅ Token encontrado para:', tokens.firstname);

    // 2️⃣ Petición a Strava API para obtener actividades
    const response = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=10',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const activities = await response.json();

    if (!response.ok) {
      console.error('❌ Error al obtener actividades:', activities);
      return res.status(400).json({
        message: 'Error al obtener actividades desde Strava',
        data: activities,
      });
    }

    console.log(`📥 Recibidas ${activities.length} actividades`);

    // 3️⃣ Guardamos o actualizamos las actividades en Supabase
    const formatted = activities.map((a) => ({
      activity_id: a.id,
      name: a.name,
      distance: a.distance,
      moving_time: a.moving_time,
      elapsed_time: a.elapsed_time,
      total_elevation_gain: a.total_elevation_gain,
      type: a.type,
      start_date: a.start_date,
      average_speed: a.average_speed,
      max_speed: a.max_speed,
      average_heartrate: a.average_heartrate || null,
      max_heartrate: a.max_heartrate || null,
      athlete_id: tokens.athlete_id,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from('strava_activities')
      .upsert(formatted, { onConflict: 'activity_id' });

    if (upsertError) throw upsertError;

    console.log('✅ Actividades guardadas/actualizadas correctamente.');

    return res.status(200).json({
      message: '✅ Actividades sincronizadas correctamente',
      total: activities.length,
    });
  } catch (err) {
    console.error('❌ Error general en sync-activities:', err);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: err.message,
    });
  }
}
