import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

export default async function handler(req, res) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase.from('strava_activities').select('*').limit(1);

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      message: '✅ Conexión con Supabase correcta',
      rows: data?.length || 0,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: '❌ Error conectando con Supabase',
      error: err.message,
    });
  }
}
