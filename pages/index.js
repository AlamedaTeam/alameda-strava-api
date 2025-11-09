import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState('Conectando con Strava...');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      // Llama al endpoint de intercambio
      fetch(`/api/exchange_token?code=${code}`)
        .then(res => res.json())
        .then(data => {
          if (data.tokens) {
            setStatus(`✅ Token obtenido correctamente para ${data.athlete.firstname} ${data.athlete.lastname}`);
            console.log('TOKENS:', data.tokens);
          } else {
            setStatus('⚠️ Error al obtener el token');
            console.error(data);
          }
        })
        .catch(err => {
          setStatus('❌ Fallo en la conexión con el servidor');
          console.error(err);
        });
    } else {
      setStatus('✅ Alameda Strava API – Servidor conectado y funcionando correctamente.');
    }
  }, []);

  return (
    <main style={{
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center',
      marginTop: '20vh',
      color: '#111'
    }}>
      <h1>Alameda Strava API</h1>
      <p>{status}</p>
    </main>
  );
}
