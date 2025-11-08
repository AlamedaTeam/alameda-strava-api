// pages/success.js
export default function Success() {
  return (
    <main style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#0f1216', color:'#e9f0f6', fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial, sans-serif',
      padding:'24px'
    }}>
      <div style={{
        background:'#121823', border:'1px solid #223044', borderRadius:16,
        padding:24, maxWidth:560, width:'100%', textAlign:'center',
        boxShadow:'0 12px 32px rgba(0,0,0,.35)'
      }}>
        <h1 style={{margin:'0 0 8px', fontSize:28}}>✅ ¡Strava conectado!</h1>
        <p style={{margin:'0 0 16px', color:'#8ea1b2'}}>
          Ya podemos sincronizar tus entrenamientos. Puedes volver a tu panel VIP.
        </p>

        <div style={{display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap'}}>
          <a
            href="https://www.alamedatrailteam.com/vip-atletas/"
            style={{
              background:'#2bbf6a', color:'#06260f', textDecoration:'none',
              padding:'12px 16px', borderRadius:10, fontWeight:800
            }}
          >
            Volver al panel VIP
          </a>
          <button
            onClick={() => window.close()}
            style={{
              background:'#162133', color:'#e9f0f6', border:'1px solid #2e3f59',
              padding:'12px 16px', borderRadius:10, fontWeight:700, cursor:'pointer'
            }}
          >
            Cerrar ventana
          </button>
        </div>

        <p style={{marginTop:14, fontSize:12, color:'#8ea1b2'}}>
          Si no se cierra, cierra esta pestaña y vuelve al panel.
        </p>
      </div>

      {/* Redirección automática opcional tras 3 s */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            setTimeout(function(){
              try { window.location.href = 'https://www.alamedatrailteam.com/vip-atletas/'; } catch(e){}
            }, 3000);
          `
        }}
      />
    </main>
  );
}
