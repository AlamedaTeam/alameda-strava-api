import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ⏱️ Función para pasar minutos a “1h 04min”
const formatTime = (minutes: number | string): string => {
  const num = parseFloat(String(minutes));
  if (isNaN(num)) return String(minutes); // si ya está formateado, lo dejamos igual
  const h = Math.floor(num / 60);
  const m = Math.round(num % 60);
  const mm = m.toString().padStart(2, "0");
  return h > 0 ? `${h}h ${mm}min` : `${mm} min`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("🚀 Corrigiendo formato de tiempos en alameda_activities...");

    const { data: rows, error } = await supabase
      .from("alameda_activities")
      .select("id, moving_time_min, elapsed_time_min");

    if (error) throw error;
    if (!rows?.length) throw new Error("No hay registros en alameda_activities");

    let updates = 0;

    for (const row of rows) {
      const newMoving = formatTime(row.moving_time_min);
      const newElapsed = formatTime(row.elapsed_time_min);

      // solo actualiza si hay cambios
      if (newMoving !== row.moving_time_min || newElapsed !== row.elapsed_time_min) {
        await supabase
          .from("alameda_activities")
          .update({
            moving_time_min: newMoving,
            elapsed_time_min: newElapsed,
          })
          .eq("id", row.id);
        updates++;
      }
    }

    console.log(`✅ Formato corregido en ${updates} registros.`);
    return res.status(200).send(`✅ ${updates} actividades actualizadas con formato hh min`);
  } catch (err: any) {
    console.error("💥 Error corrigiendo tiempos:", err.message);
    return res.status(500).send("❌ Error interno: " + err.message);
  }
}
