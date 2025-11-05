// /api/strava-callback.js
// Intercambia el "code" de Strava por tokens y guarda/actualiza el atleta en Supabase.
// Válido para Vercel (Node 18+) usando fetch nativo.

import { createClient } from '@supabase/supabase-js';

const {
  STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET,
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  STRAVA_REDIRECT_SUCCESS, // opcional: URL a la que volvemos con ?strava=ok&name=...
  STRAVA_REDIRECT_ERROR    // opcional: URL para errores con ?strava=ko&reason=...
} = process.env;

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // 1) Validación básica de config
    for (const [key, val] of Object.entries({
      STRAVA_CLIENT_ID,
      STRAVA_CLIENT_SECRET,
      SUPABASE_URL,
      SUPABASE_SERVICE_KEY,
    })) {
      if (!val) {
        return res.status(500).json({ error: `Missing env var: ${key}` });
      }
    }

    // 2) Tomamos el "code" devuelto por Strava
    const code = req.query.code || '';
    if (!code) return redirectError(res, 'missing_code');

    // 3) Intercambio code -> tokens
    const tokenResp = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResp.json();

    if (!tokenResp.ok || !tokenData?.access_token) {
      console.error('Strava token error:', tokenData);
      return redirectError(res, 'strava_token_error');
    }

    // 4) Guardamos/actualizamos en Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const a = tokenData.athlete || {};

    const payload = {
      athlete_id: a.id,
      firstname: a.firstname || null,
      lastname: a.lastname || null,
      profile: a.profile || null,
      city: a.city || null,
      country: a.country || null,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,     // epoch seconds
      scope: tokenData.scope || null,
      token_type: tokenData.token_type || null,
      updated_at: new Date().toISOString(),
      connected_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('strava_users')
      .upsert(payload, { onConflict: 'athlete_id' });

    if (error) {
      console.error('Supabase upsert error:', error);
      return redirectError(res, 'supabase_upsert_error');
    }

    // 5) Volvemos al VIP con confirmación visual
    const name = encodeURIComponent(a.firstname || 'Atleta');
    const okURL =
      STRAVA_REDIRECT_SUCCESS ||
      'https://www.alamedatrailteam.com/pagina-en-blanco';

    return res.redirect(`${okURL}?strava=ok&name=${name}`);
  } catch (err) {
    console.error('Callback fatal:', err);
    return redirectError(res, 'unexpected_error');
  }
}

/* ---------- helpers ---------- */
function redirectError(res, reason = 'error') {
  const base =
    process.env.STRAVA_REDIRECT_ERROR ||
    process.env.STRAVA_REDIRECT_SUCCESS ||
    'https://www.alamedatrailteam.com/pagina-en-blanco';
  res.redirect(`${base}?strava=ko&reason=${encodeURIComponent(reason)}`);
}
