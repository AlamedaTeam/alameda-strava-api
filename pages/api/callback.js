export default async function handler(req, res) {
  try {
    const code = req.query.code;

    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    const data = await response.json();

    if (!data.athlete) {
      return res.status(400).json({ error: "No athlete data returned" });
    }

    const supabase = require("@supabase/supabase-js").createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { id } = data.athlete;

    const { error } = await supabase.from("strava_users").upsert({
      athlete_id: id,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send("✅ Strava connected successfully!");
  } catch (err) {
    console.error("Callback error:", err);
    return res.status(500).json({ error: err.message });
  }
}
