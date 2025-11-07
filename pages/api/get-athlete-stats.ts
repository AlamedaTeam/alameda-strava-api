// =========================
//  Alameda Team – get-athlete-stats.ts
//  Devuelve resumen semanal + últimas 3 actividades
// =========================

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { athlete_id } = req.query
    if (!athlete_id) {
      return res.status(400).json({ error: 'Falta athlete_id' })
    }

    // Fecha actual y rango de lunes a domingo
    const now = new Date()
    const day = now.getDay() === 0 ? 7 : now.getDay() // domingo = 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day - 1))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    // Consulta actividades de esta semana
    const { data, error } = await supabase
      .from('alameda_activities')
      .select('name, date_day, distance_km, elevation_gain_m, moving_time_min')
      .eq('athlete_id', athlete_id)
      .gte('date_day', monday.toISOString().split('T')[0])
      .lte('date_day', sunday.toISOString().split('T')[0])
      .order('date_day', { ascending: false })

    if (error) throw error

    // Totales
    let totalKm = 0
    let totalUp = 0
    let totalMin = 0
    let totalAct = data.length

    data.forEach(a => {
      totalKm += parseFloat(a.distance_km) || 0
      totalUp += parseFloat(a.elevation_gain_m) || 0
      totalMin += parseFloat(a.moving_time_min) || 0
    })

    const hh = Math.floor(totalMin / 60)
    const mm = Math.round(totalMin % 60)
    const totalTime = `${hh}h ${mm}min`

    // Últimas 3 actividades
    const latest = data.slice(0, 3).map(a => ({
      name: a.name,
      km: a.distance_km,
      up: a.elevation_gain_m,
      time: a.moving_time_min
    }))

    res.status(200).json({
      week_range: {
        from: monday.toISOString().split('T')[0],
        to: sunday.toISOString().split('T')[0]
      },
      totals: {
        km: Number(totalKm.toFixed(1)),
        up: Math.round(totalUp),
        time: totalTime,
        acts: totalAct
      },
      latest
    })
  } catch (err) {
    console.error('Error:', err)
    res.status(500).json({ error: err.message })
  }
}
