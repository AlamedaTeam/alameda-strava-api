import { useEffect, useState } from "react";

export default function VipDashboard() {
  const [metrics, setMetrics] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [activities, setActivities] = useState([]);
  const athlete_id = 9194590; // 👈 tu ID actual

  useEffect(() => {
    async function fetchAll() {
      try {
        // 🔹 1. Métricas globales
        const metricsRes = await fetch(`https://alameda-strava-api.vercel.app/api/get-metrics?athlete_id=${athlete_id}`);
        const metricsJson = await metricsRes.json();
        setMetrics(metricsJson.data || []);
        setResumen(metricsJson.resumen || {});

        // 🔹 2. Últimas actividades
        const actRes = await fetch(`https://alameda-strava-api.vercel.app/api/get-activities?athlete_id=${athlete_id}&limit=10`);
        const actJson = await actRes.json();
        setActivities(actJson.data || []);
      } catch (err) {
        console.error("❌ Error al cargar datos:", err);
      }
    }

    fetchAll();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6 text-center text-amber-400">
        🏁 Alameda Team · VIP Dashboard
      </h1>

      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 text-center">
          <Card label="Distancia total" value={`${resumen.total_distancia_km?.toFixed(1) || 0} km`} />
          <Card label="Desnivel positivo" value={`${resumen.total_desnivel_m?.toFixed(0) || 0} m`} />
          <Card label="Tiempo total" value={`${resumen.total_tiempo_horas?.toFixed(1) || 0} h`} />
          <Card label="TSS total" value={`${resumen.total_tss?.toFixed(0) || 0}`} />
        </div>
      )}

      {/* 🧩 Tabla de métricas históricas */}
      <h2 className="text-xl font-semibold mb-3 text-amber-300">📊 Métricas recientes</h2>
      <div className="overflow-x-auto mb-10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-800 text-gray-300">
              <th className="p-3">📅 Fecha</th>
              <th className="p-3">Distancia (km)</th>
              <th className="p-3">Tiempo (min)</th>
              <th className="p-3">Desnivel (m)</th>
              <th className="p-3">TSS</th>
              <th className="p-3">TRIMP</th>
              <th className="p-3">RPE Load</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => (
              <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-900">
                <td className="p-3">{m.date}</td>
                <td className="p-3">{m.total_distance_km || 0}</td>
                <td className="p-3">{m.total_time_min || 0}</td>
                <td className="p-3">{m.total_elevation_m || 0}</td>
                <td className="p-3">{m.tss || 0}</td>
                <td className="p-3">{m.trimp || 0}</td>
                <td className="p-3">{m.rpe_load || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🏃 Actividades de Strava */}
      <h2 className="text-xl font-semibold mb-3 text-amber-300">🏃 Últimos entrenamientos</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activities.map((a) => (
          <div key={a.id} className="bg-zinc-900 p-4 rounded-xl shadow border border-zinc-800 hover:border-amber-400 transition">
            <h3 className="font-bold text-white mb-1">{a.name}</h3>
            <p className="text-sm text-gray-400 mb-2">{new Date(a.start_date).toLocaleDateString("es-ES")}</p>
            <div className="text-sm space-y-1">
              <p>📏 {(a.distance / 1000).toFixed(1)} km</p>
              <p>⏱️ {(a.moving_time / 60).toFixed(0)} min</p>
              <p>⛰️ {a.total_elevation_gain || 0} m+</p>
              <p>❤️ FC media: {a.average_heartrate || "--"} bpm</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="bg-zinc-900 p-4 rounded-xl shadow">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
