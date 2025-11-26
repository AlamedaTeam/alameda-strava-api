import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { code, state, error } = req.query;

  // 1. Si el usuario cancela en Strava
  if (error || !code) {
    return res.redirect('https://www.alamedatrailteam.com/pruebas/?error=strava_cancel');
  }

  try {
    // 2. Intercambio de Tokens (MÉTODO INFALIBLE: URL PARAMS)
    // En lugar de enviar un JSON, construimos la URL con los datos.
    // Esto evita problemas de formato que a veces dan el error "invalid".
    
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    const tokenUrl = `https://www.strava.com/oauth/token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&grant_type=authorization_code`;

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST' 
    });

    const tokens = await tokenResponse.json();

    // Si Strava sigue quejándose, lo veremos en los logs de Vercel
    if (tokens.errors) {
      console.error('Respuesta de Strava:', JSON.stringify(tokens));
      return res.redirect('https://www.alamedatrailteam.com/pruebas/?error=strava_rejected');
    }

    // 3. Guardar en Supabase
    // Usamos el email que viaja en 'state'. Si no hay, usamos el ID de atleta.
    const userEmail = state ? state.toLowerCase() : `strava_${tokens.athlete.id}`;

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

    // 4. Éxito
    return res.redirect('https://www.alamedatrailteam.com/pruebas/?status=connected');

  } catch (err) {
    console.error('Error Servidor:', err);
    return res.redirect('https://www.alamedatrailteam.com/pruebas/?error=server_crash');
  }
}
