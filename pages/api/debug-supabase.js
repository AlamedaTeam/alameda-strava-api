// /pages/api/debug-supabase.js
import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
} = process.env;

export default async function handler(req, res) {
  const out = { ok: true, steps: [] };

  try {
    out.env = {
      SUPABASE_URL_present: !!SUPABASE_URL,
      SUPABASE_SERVICE_KEY_present: !!SUPABASE_SERVICE_KEY,
      // muestra solo el host para no filtrar secretos
      url_host: (() => {
        try { return new URL(SUPABASE_URL).host; } catch { return null; }
      })(),
    };

    // 1) Ping a AUTH (suele responder 200 OK)
    let r = await fetch(`${SUPABASE_URL}/auth/v1/health`);
    out.steps.push({ step: 'auth_health', status: r.status });

    // 2) Ping a PostgREST root (debería responder 404 JSON, pero si hay red OK ya nos vale)
    r = await fetch(`${SUPABASE_URL}/rest/v1/`, { method: 'HEAD' });
    out.steps.push({ step: 'rest_head', status: r.status });

    // 3) Cliente Supabase -> SELECT mínimo
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase.from('strava_users').select('athlete_id').limit(1);
    out.steps.push({ step: 'select_strava_users', error: error?.message || null, rows: data?.length ?? 0 });

    return res.status(200).json(out);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err), out });
  }
}
