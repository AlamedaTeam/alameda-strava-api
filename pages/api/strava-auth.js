import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { code, state, error } = req.query;

  // 1. Si el usuario cancela o hay error en Strava
  if (error || !code) {
    console.error('Error recibido de Strava:', error);
    return res.redirect('https://www.alamedatrailteam.com/pruebas/?error=strava_cancel');
  }

  try {
    // 2. Pedir las llaves definitivas a Strava
    console.log('Intercambiando código por token...');
    
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

    // Si Strava nos da error aquí, es por el CLIENT_SECRET o el DOMINIO
    if (tokens.errors) {
      console.error('Strava rechazó el intercambio:', JSON.stringify(tokens));
      return res.redirect('https://www.alamedatrailteam.com/pruebas/?error=strava_rejected');
    }

    // 3. Guardar en Base de Datos (Supabase)
    console.log('Guardando en Supabase para:', state);
    
    // El 'state' trae el email del usuario (lo enviamos desde el frontend)
    // Si viene vacío, intentamos usar el ID de atleta como fallback, pero lo ideal es el email.
    const userEmail = state ? state.toLowerCase() : `unknown_athlete_${tokens.athlete.id}`;

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    const { error: dbError } = await supabase
      .from('strava_tokens')
      .upsert({
        email: userEmail,
        athlete_id: tokens.athlete.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' });

    if (dbError) {
      console.error('Error guardando en BD:', dbError);
      return res.redirect('https://www.alamedatrailteam.com/pruebas/?error=db_save_error');
    }

    // 4. Todo perfecto -> Volver a la web
    return res.redirect('https://www.alamedatrailteam.com/pruebas/?status=connected');

  } catch (err) {
    console.error('Error crítico del servidor:', err);
    return res.redirect('https://www.alamedatrailteam.com/pruebas/?error=server_crash');
  }
}
