import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { code, state, error } = req.query; // 'state' lleva el email que enviamos desde el front

  // 1. Manejo de errores o cancelación
  if (error || !code) {
    return res.redirect('https://www.alamedatrailteam.com/pruebas/?error=strava_cancel');
  }

  try {
    // 2. Intercambiar el 'code' por tokens reales con Strava
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.errors) {
      throw new Error('Error solicitando tokens a Strava');
    }

    // 3. Guardar en Supabase
    // Usamos el email que viaja en 'state' para saber de quién son estos tokens
    // NOTA: Si el 'state' viniera codificado, habría que usar decodeURIComponent, pero suele llegar bien.
    const userEmail = state ? state.toLowerCase() : null;

    if (!userEmail) {
      throw new Error('No se recibió el email del usuario en la petición');
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Guardamos o actualizamos (upsert)
    const { error: dbError } = await supabase
      .from('strava_tokens')
      .upsert({
        email: userEmail,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at,
        athlete_id: tokens.athlete.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' });

    if (dbError) throw dbError;

    // 4. ¡Éxito! Redirigimos de vuelta a la web
    // NOTA: Te mando a /pruebas/ porque es donde estamos testeando.
    // Cuando pases a producción, cambia esto a /vip-atletas/
    return res.redirect('https://www.alamedatrailteam.com/pruebas/?status=connected');

  } catch (err) {
    console.error('Strava Auth Error:', err);
    return res.redirect('https://www.alamedatrailteam.com/pruebas/?error=server_error');
  }
}
