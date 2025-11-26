import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { code, state, error } = req.query;

  // 1. Control de errores inicial
  if (error || !code) {
    console.error('Error recibido de Strava:', error);
    return res.redirect('https://www.alamedatrailteam.com/pruebas/?error=strava_cancel');
  }

  try {
    // 2. DEBUG: Verificamos que las variables existen (sin mostrar el secreto)
    if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
      console.error('FALTAN VARIABLES DE ENTORNO EN VERCEL');
      return res.redirect('https://www.alamedatrailteam.com/pruebas/?error=config_error');
    }

    // 3. Intercambio de tokens (CAMBIO: Usamos parámetros en URL en vez de JSON)
    console.log('Solicitando tokens a Strava...');
    
    const params = new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code'
    });

    const tokenResponse = await fetch(`https://www.strava.com/oauth/token?${params.toString()}`, {
      method: 'POST'
    });

    const tokens = await tokenResponse.json();

    // Si falla aquí, Strava nos dirá por qué en los logs
    if (tokens.errors || !tokens.access_token) {
      console.error('Respuesta de Strava (Error):', JSON.stringify(tokens));
      return res.redirect('https://www.alamedatrailteam.com/pruebas/?error=strava_rejected');
    }

    // 4. Guardar en Supabase
    const userEmail = state ? state.toLowerCase() : `unknown_${tokens.athlete.id}`;
    console.log('Guardando tokens para:', userEmail);

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
      console.error('Error Supabase:', dbError);
      return res.redirect('https://www.alamedatrailteam.com/pruebas/?error=db_save_error');
    }

    // 5. Éxito total
    return res.redirect('https://www.alamedatrailteam.com/pruebas/?status=connected');

  } catch (err) {
    console.error('Excepción del servidor:', err);
    return res.redirect('https://www.alamedatrailteam.com/pruebas/?error=server_crash');
  }
}
