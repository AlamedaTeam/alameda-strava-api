import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    console.log("🚀 Sincronizando últimas 20 actividades desde Strava...");

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    // 1️⃣ Atletas conectados
    const { data: athletes, error: fetchError } = await supabase
      .from('athletes_tokens')
      .select('*');

    if (fetchError) throw new Error(`Error leyendo athletes_tokens: ${fetchError.message}`);
    if (!athletes?.length) throw new Error('No hay atletas en athletes_tokens');

    const results = [];

    for (const athlete of athletes) {
      const { athlete_id, firstname, access_token, refresh_token, expires_at } = athlete;
      let token = access_token;
      const now = Math.floor(Date.now() / 1000);

      // 2️⃣ Refresh token si caducó
      if (expires_at && expires_at <= now) {
        console.log(`♻️ Token caducado para ${firstname}, renovando...`);
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
        if (!refreshRes.ok) {
          throw new Error(`No se pudo refrescar el token de ${firstname}: ${JSON.stringify(newData)}`);
        }
        token = newData.access_token;

        const { error: updErr } = await supabase
          .from('athletes_tokens')
          .update({
            access_token: token,
            refresh_token: newData.refresh_token,
            expires_at: newData.expires_at,
            updated_at: new Date().toISOString(),
          })
          .eq('athlete_id', athlete_id);
        if (updErr) throw new Error(`Error guardando nuevo token de ${firstname}: ${updErr.message}`);
      }

      // 3️⃣ Traer 20 últimas
      const resp = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=20', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(`Error Strava (${firstname}): ${JSON.stringify(data)}`);
      console.log(`📥 ${data.length} actividades recibidas de ${firstname}`);

      // Helper: km/h → ritmos y tiempos
      const toPaceMinPerKm = (avg_mps) => {
        if (!avg_mps || avg_mps <= 0) return null;
        const paceMin = 1000 / (avg_mps * 60);
        return Number(paceMin.toFixed(2));
      };
      const humanElapsed = (secs) => {
        const mins = Math.round((secs || 0) / 60);
        if (mins >= 60) {
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          return `${h}h ${m}min`;
        }
        return `${mins} min`;
      };

      // 4️⃣ Formateo exacto a columnas
      const formatted = data.map((a) => ({
        athlete_id: Number(athlete_id),
        strava_id: Number(a.id), // asegúrate que en Supabase sea UNIQUE
        name: a.name ?? null,
        sport_type: a.sport_type ?? null,

        start_latlng: a.start_latlng ? JSON.stringify(a.start_latlng) : null,
        end_latlng: a.end_latlng ? JSON.stringify(a.end_latlng) : null,

        average_speed: a.average_speed != null ? Number((a.average_speed * 3.6).toFixed(2)) : null, // km/h
        average_heartrate: a.average_heartrate ?? null,
        max_heartrate: a.max_heartrate ?? null,

        elevation_gain: a.total_elevation_gain ?? null,

        distance_km: a.distance != null ? Number((a.distance / 1000).toFixed(2)) : null,
        moving_time_min: a.moving_time != null ? Number((a.moving_time / 60).toFixed(1)) : null,

        // ✅ formato humano h/min
        elapsed_time_min: humanElapsed(a.elapsed_time),

        pace_min_km: toPaceMinPerKm(a.average_speed),

        start_date: a.start_date_local ?? a.start_date, // tu columna es timestamptz; ambos parseables
        timezone: a.timezone || '(GMT+01:00) Europe/Madrid',
        platform: 'Strava',

        created_at: a.start_date ? new Date(a.start_date).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // 5️⃣ Limpieza (mantener 20): borra lo más antiguo del mismo atleta
      const lastDate = formatted[formatted.length - 1]?.start_date;
      if (lastDate) {
        const { error: delErr } = await supabase
          .from('strava_activities')
          .delete()
          .lt('start_date', lastDate)
          .eq('athlete_id', athlete_id);
        if (delErr) {
          console.warn('⚠️ Aviso borrando antiguas:', delErr.message);
        }
      }

      // 6️⃣ UPSERT con detalle de error
      const { error: upsertError } = await supabase
        .from('strava_activities')
        .upsert(formatted, { onConflict: 'strava_id' });

      if (upsertError) {
        console.error(`❌ Supabase upsert (${firstname}):`, upsertError);
        results.push({
          athlete_id,
          firstname,
          status: '❌ Error Supabase',
          detail: upsertError.message || upsertError.details || upsertError.hint || upsertError.code,
        });
        continue;
      }

      console.log(`✅ Últimas 20 actividades sincronizadas para ${firstname}`);
      results.push({ athlete_id, firstname, total: formatted.length, status: '✅ OK' });
    }

    return res.status(200).json({ message: 'Sincronización completada ✅', results });
  } catch (err) {
    console.error('❌ Error general:', err);
    return res.status(500).json({ error: err.message });
  }
}
