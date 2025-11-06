// /api/sync-activities.ts
import { VercelRequest, VercelResponse } from "@vercel/node";
```)  
y pégalo **reemplazando todo lo que hay ahora mismo** dentro del archivo  
`pages/api/sync-activities.ts` en tu GitHub.  

Luego haz esto paso a paso 👇  

---

### ⚙️ PASOS
1️⃣ **Guarda** → haz click en **“Commit changes”** (rama `main`).  
2️⃣ Espera unos segundos hasta que en **Vercel → Deployments** veas que pone “✅ Ready”.  
3️⃣ Vuelve a abrir esta URL:
   👉 [`https://alameda-strava-api.vercel.app/api/sync-activities`](https://alameda-strava-api.vercel.app/api/sync-activities)
4️⃣ Si todo sale bien, verás el mensaje verde ✅  
   **“Actividades sincronizadas correctamente”**

5️⃣ Luego entra en Supabase → tabla `strava_activities` → dale a **🔄 Refresh**.

---

Si después de eso sigue vacía, te diré cómo imprimir el log para ver qué devuelve Strava (por si no está trayendo actividades).  
Avísame cuando hayas hecho el commit y lo pruebes 👇
