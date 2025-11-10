import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    console.log('🔄 Iniciando sincronización de actividades desde Strava...');

    // Conexión a Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // 1️⃣ Obtener token del atleta
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

    // 2️⃣ Pedir actividades a Strava
    const response = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=50',
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

    // 3️⃣ Formatear datos para Supabase
    const formatted = activities.map((a) => {
      const pace = a.average_speed ? (1000 / a.average_speed) / 60 : null; // min/km
      const elevation = a.total_elevation_gain || 0;

      return {
        activity_id: a.id,
        athlete_id: tokens.athlete_id,
        name: a.name,
        description: a.description || null,
        type: a.type,
        sport_type: a.sport_type || a.type,
        distance: (a.distance / 1000).toFixed(2), // km
        distance_km: (a.distance / 1000).toFixed(2),
        moving_time: a.moving_time,
        elapsed_time: a.elapsed_time,
        elevation_gain: elevation,
        elevation_m: `${elevation} m`,
        average_speed: a.average_speed,
        avg_speed_km: (a.average_speed * 3.6).toFixed(2), // km/h
        pace_min_km: pace ? pace.toFixed(2) : null,
        max_speed: a.max_speed,
        average_heartrate: a.average_heartrate || null,
        max_heartrate: a.max_heartrate || null,
        start_date: a.start_date,
        timezone: a.timezone || null,
        platform: a.external_id ? (a.external_id.includes('Garmin') ? 'Garmin' : 'Strava') : 'Strava',
        created_at: a.start_date_local || a.start_date,
        updated_at: new Date().toISOString(),
      };
    });

    // 4️⃣ Guardar o actualizar en Supabase
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
