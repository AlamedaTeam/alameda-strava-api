import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. GESTIÓN DE CORS (Para que Webnode no bloquee la respuesta)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. LÓGICA DE VERIFICACIÓN
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email requerido' });
  }

  try {
    // Usamos las claves de entorno de Vercel
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Buscamos en la tabla 'strava_tokens'
    const { data, error } = await supabase
      .from('strava_tokens')
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.error("Error leyendo Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    // Si hay datos, devolvemos TRUE
    if (data) {
      return res.status(200).json({ connected: true });
    } else {
      return res.status(200).json({ connected: false });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
