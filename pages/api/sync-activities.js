import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    console.log("🚀 Sincronizando últimas 20 actividades desde Strava...");

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    // 1️⃣ Obtener atletas
    const { data: athletes, error: fetchError } = await supabase
      .from("athletes_tokens")
      .select("*");

    if (fetchError || !athletes?.length)
      throw new Error("No hay atletas o error al obtenerlos.");

    const results = [];

    for (const athlete of athletes) {
      const { athlete_id, firstname, access_token, refresh_token, expires_at } = athlete;
      let token = access_token;
      const now = Math.floor(Date.now() / 1000);

      // 2️⃣ Refrescar token si está caducado
      if (expires_at <= now) {
        console.log(`♻️ Token caducado para ${firstname}, renovando...`);
        const refreshRes = await fetch("https://www.strava.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            grant_type: "refresh_token",
            refresh_token,
          }),
        });

        const newData = await refreshRes.json();
        token = newData.access_token;

        await supabase
          .from("athletes_tokens")
          .update({
            access_token: token,
            refresh_token: newData.refresh_token,
            expires_at: newData.expires_at,
            updated_at: new Date().toISOString(),
          })
          .eq("athlete_id", athlete_id);
      }

      // 3️⃣ Traer las 20 últimas actividades
      const resp = await fetch(
        "https://www.strava.com/api/v3/athlete/activities?per_page=20",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!resp.ok) throw new Error(`Error al obtener actividades de ${firstname}`);

      const data = await resp.json();
      console.log(`📥 ${data.length} actividades recibidas de ${firstname}`);

      // 4️⃣ Formatear a tu estructura exacta de Supabase
      const formatted = data.map((a) => ({
        athlete_id,
        strava_id: a.id,
        name: a.name,
        sport_type: a.sport_type,
        start_latlng: a.start_latlng ? JSON.stringify(a.start_latlng) : null,
        end_latlng: a.end_latlng ? JSON.stringify(a.end_latlng) : null,
        average_speed: a.average_speed ? (a.average_speed * 3.6).toFixed(2) : null, // m/s → km/h
        average_heartrate: a.average_heartrate || null,
        max_heartrate: a.max_heartrate || null,
        elevation_gain: a.total_elevation_gain || null,
        distance_km: (a.distance / 1000).toFixed(2),
        moving_time_min: (a.moving_time / 60).toFixed(1),
        elapsed_time_min: `${Math.round(a.elapsed_time / 60)} min`,
        pace_min_km:
          a.average_speed && a.average_speed > 0
            ? (1000 / (a.average_speed * 60)).toFixed(2)
            : null,
        start_date: a.start_date_local,
        timezone: a.timezone || "(GMT+01:00) Europe/Madrid",
        platform: "Strava",
        created_at: new Date(a.start_date).toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // 5️⃣ Borrar las más antiguas (mantener 20)
      await supabase
        .from("strava_activities")
        .delete()
        .lt("start_date", formatted[formatted.length - 1].start_date)
        .eq("athlete_id", athlete_id);

      // 6️⃣ Insertar o actualizar las nuevas
      const { error: upsertError } = await supabase
        .from("strava_activities")
        .upsert(formatted, { onConflict: "strava_id" });

      if (upsertError) {
        console.error(`❌ Error guardando actividades de ${firstname}:`, upsertError);
        results.push({ athlete_id, firstname, status: "❌ Error Supabase" });
        continue;
      }

      console.log(`✅ Últimas 20 actividades sincronizadas para ${firstname}`);
      results.push({ athlete_id, firstname, total: formatted.length, status: "✅ OK" });
    }

    res.status(200).json({ message: "Sincronización completada ✅", results });
  } catch (err) {
    console.error("❌ Error general:", err);
    res.status(500).json({ error: err.message });
  }
}
