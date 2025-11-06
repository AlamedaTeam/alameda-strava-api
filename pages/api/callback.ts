// /api/callback.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const code = req.query.code as string;

    // Intercambio del código por tokens
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
    if (!data.athlete) throw new Error("No athlete data returned");

    const { id } = data.athlete;

    // Guardar o actualizar en la tabla strava_users
    const { error } = await supabase
      .from("strava_users")
      .upsert({
        athlete_id: id,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    return res.status(200).send("✅ Strava connected successfully!");
  } catch (err: any) {
    console.error("Callback error:", err);
    return res.status(500).json({ error: err.message });
  }
}
