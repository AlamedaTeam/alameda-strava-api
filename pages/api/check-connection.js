import { createClient } from '@supabase/supabase-js';

// --- HELPER CORS ---
// Esto permite que Webnode (y cualquier sitio) pueda consultar este dato sin bloqueo.
const allowCors = (fn) => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Permite acceso desde tu web
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Si el navegador pregunta "¿puedo pasar?", le decimos que sí
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

// --- LÓGICA PRINCIPAL ---
const handler = async (req, res) => {
  // 1. Iniciamos Supabase con tus claves de entorno (ya configuradas en Vercel)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  // 2. Recibimos el email que manda Webnode
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email es obligatorio' });
  }

  try {
    // 3. Consultamos la tabla 'strava_tokens'
    // Buscamos si hay una fila donde el email coincida
    const { data, error } = await supabase
      .from('strava_tokens')
      .select('email')
      .eq('email', email.toLowerCase().trim()) // Limpiamos el email por si acaso
      .single(); // Solo queremos saber si existe uno

    // 4. Respuesta final
    if (data && !error) {
      // ¡Sí existe!
      return res.status(200).json({ connected: true });
    } else {
      // No existe o hubo error al buscar -> No conectado
      return res.status(200).json({ connected: false });
    }

  } catch (err) {
    console.error('Error interno:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Exportamos la función envuelta en el permiso de CORS
export default allowCors(handler);
