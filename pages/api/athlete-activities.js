// rebuild trigger 3
export default async function handler(req, res) {
  try {
    const { athlete_id } = req.query;

    // Usa token de Strava
    const accessToken = process.env.STRAVA_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({ error: "Falta STRAVA_ACCESS_TOKEN" });
    }

    const r = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ error: txt });
    }

    const data = await r.json();

    const simplified = data.map(a => ({
      id: a.id,
      name: a.name,
      start_date: a.start_date,
      distance_km: (a.distance / 1000).toFixed(2),
      elevation_gain_m: a.total_elevation_gain,
      moving_time_min: (a.moving_time / 60).toFixed(1),
      average_heartrate: a.average_heartrate || null,
    }));

    res.status(200).json(simplified);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno en la API", details: err.message });
  }
}
