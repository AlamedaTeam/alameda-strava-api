"use client";
import Head from "next/head";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [metrics, setMetrics] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [activities, setActivities] = useState([]);
  const athlete_id = 9194590; // 👈 tu ID actual

  useEffect(() => {
    console.log("✅ Dashboard montado");
    async function fetchAll() {
      try {
        const metricsRes = await fetch(`https://alameda-strava-api.vercel.app/api/get-metrics?athlete_id=${athlete_id}`);
        const metricsJson = await metricsRes.json();
        setMetrics(metricsJson.data || []);
        setResumen(metricsJson.resumen || {});

        const actRes = await fetch(`https://alameda-strava-api.vercel.app/api/get-activities?athlete_id=${athlete_id}&limit=10`);
        const actJson = await actRes.json();
        setActivities(actJson.data || []);

        console.log("📊 Datos cargados correctamente");
      } catch (err) {
        console.error("❌ Error al cargar datos:", err);
      }
    }
    fetchAll();
  }, []);

  return (
    <>
      <Head>
        <title>Alameda Team | Dashboard</title>
      </Head>
      <div className="min-h-screen bg-black text-white p-6">
        <h1 className="text-3xl font-bold mb-6 text-center text-amber-400">🏁 Alameda Team · Dashboard</h1>

        {resumen && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 text-center">
            <Card label="Distancia total" value={`${resumen.total_distancia_km?.toFixed(1) || 0} km`} />
            <Card label="Desnivel positivo" value={`${resumen.total_desnivel_m?.toFixed(0) || 0} m`} />
            <Card label="Tiempo total" value={`${resumen.total_tiempo_horas?.toFixed(1) || 0} h`} />
            <Card label="TSS total" value={`${resumen.total_tss?.toFixed(0) || 0}`} />
          </div>
        )}
      </div>
    </>
  );
}

function Card({ label, value }) {
  return (
    <div className="bg-zinc-900 p-4 rounded-xl shadow text-center">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
