import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    console.log('🚀 Iniciando sincronización global de actividades Strava (últimos 30 días)...');

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    // 1️⃣ Obtener todos los atletas registrados
    const { data: athletes, error: fetchError } = await supabase
      .from('athletes_tokens')
      .select('*');

    if (fetchError || !athletes?.length) {
      throw new Error('No hay atletas registrados o error al obtenerlos.');
    }

    const results = [];

    // 🔁 Recorrer atletas uno a uno
    for (const athlete of athletes) {
      const { athlete_id, firstname, access_token, refresh_token, expires_at } = athlete;
      console.log(`⏳ Sincronizando actividades de ${firstname} (${athlete_id})...`);

      let token = access_token;
      const now = Math.floor(Date.now() / 1000);

      // ♻️ Refrescar token si está caducado
      if (expires_at <= now) {
        console.log(`♻️ Token caducado para ${firstname}. Renovando...`);
        const refreshRes = await fetch('https://www.strava.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token,
          }),
        });
        const newData = await refreshRes.json();
        if (!refreshRes.ok) throw new Error('Error al refrescar token');
        token = newData.access_token;

        await supabase
          .from('athletes_tokens')
          .update({
            access_token: token,
            refresh_token: newData.refresh_token,
            expires_at: newData.expires_at,
            updated_at: new Date().toISOString(),
          })
          .eq('athlete_id', athlete_id);
      }

      // 🔍 Calcular timestamp para “últimos 30 días”
      const after = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
      let allActivities = [];
      let page = 1;

      // 📥 Obtener actividades por páginas
      while (true) {
        const r = await fetch(
          `https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}&after=${after}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await r.json();
        if (!r.ok || !data.length) break;
        allActivities = allActivities.concat(data);
        if (data.length < 100) break;
        page++;
      }

      console.log(`📦 ${allActivities.length} actividades nuevas/actualizadas para ${firstname}`);

      // 🔧 Formatear datos antes de guardar
      const formatted = allActivities.map((a) => ({
        activity_id: a.id,
        athlete_id,
        name: a.name,
        distance_km: (a.distance / 1000).toFixed(2),
        elevation_gain: a.total_elevation_gain,
        moving_time_min: (a.moving_time / 60).toFixed(1),
        avg_hr: a.average_heartrate || null,
        start_date: a.start_date_local || a.start_date,
        created_at: a.start_date_local || a.start_date,
        updated_at: new Date().toISOString(),
      }));

      // 💾 Guardar/actualizar en Supabase
      const { error: upsertError } = await supabase
        .from('strava_activities')
        .upsert(formatted, { onConflict: 'activity_id' });

      if (upsertError) {
        console.error(`❌ Error guardando actividades de ${firstname}:`, upsertError);
        results.push({ athlete_id, firstname, status: '❌ Error Supabase' });
        continue;
      }

      console.log(`✅ Sincronizadas ${formatted.length} actividades para ${firstname}`);
      results.push({ athlete_id, firstname, total: formatted.length, status: '✅ OK' });
    }

    // 🧾 Resumen final
    res.status(200).json({
      message: 'Sincronización global completada ✅',
      results,
    });
  } catch (err) {
    console.error('❌ Error general en sync-activities:', err);
    res.status(500).json({ error: err.message });
  }
}
