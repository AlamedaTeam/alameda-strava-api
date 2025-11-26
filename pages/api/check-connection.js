import { createClient } from '@supabase/supabase-js';

// Configuración CORS para que Webnode pueda hablar con Vercel
const allowCors = (fn) => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

const handler = async (req, res) => {
  const { email } = req.query;

  if (!email) return res.status(400).json({ error: 'Email requerido' });

  try {
    // Usamos las variables de entorno que ya configuramos (con la clave maestra)
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Buscamos en la base de datos
    const { data, error } = await supabase
      .from('strava_tokens')
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle(); // Usamos maybeSingle para que no de error si no existe

    if (error) {
      console.error("Error leyendo DB:", error);
      return res.status(500).json({ error: error.message });
    }

    // Si data existe, es que hay fila -> Conectado
    if (data) {
      return res.status(200).json({ connected: true });
    } else {
      return res.status(200).json({ connected: false });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export default allowCors(handler);
