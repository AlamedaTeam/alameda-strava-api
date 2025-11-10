import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { code, error } = req.query;

  // 🧩 Si el usuario deniega acceso o no hay código
  if (error) {
    return res.status(400).json({ error: 'Access denied by user' });
  }
  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  try {
    console.log('🔍 Llamando a Strava con el código:', code);

    // 🧠 Strava requiere x-www-form-urlencoded, no JSON
    const body = new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const data = await response.json();
    console.log('🔎 Respuesta de Strava:', data);

    // ⚠️ Si Strava devuelve error, mostrarlo directamente
    if (!response.ok || data.errors) {
      return res.status(400).json({
        message: 'Authorization failed',
        data,
      });
    }

    // 🧩 Conexión con Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // 💾 Guarda o actualiza el token del atleta
    const { error: upsertError } = await supabase
      .from(process.env.SUPABASE_TABLE)
      .upsert({
        athlete_id: data.athlete.id,
        firstname: data.athlete.firstname,
        lastname: data.athlete.lastname,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) throw upsertError;

    console.log('✅ Token guardado correctamente para', data.athlete.firstname);

    return res.status(200).json({
      message: '✅ Token guardado correctamente en Supabase',
      athlete: `${data.athlete.firstname} ${data.athlete.lastname}`,
      expires_at: data.expires_at,
    });

  } catch (err) {
    console.error('❌ Error general:', err);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: err.message,
    });
  }
}
