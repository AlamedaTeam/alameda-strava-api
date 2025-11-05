// pages/api/auth/callback.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (!code) return res.status(400).json({ ok: false, error: "Missing code" });

  const clientId = process.env.STRAVA_CLIENT_ID!;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET!;
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

  // 1️⃣ Intercambiar el código por tokens
  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.athlete) {
    return res.status(500).json({ ok: false, error: tokenData });
  }

  // 2️⃣ Guardar o actualizar en Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { error } = await supabase.from("strava_users").upsert({
    athlete_id: tokenData.athlete.id,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: tokenData.expires_at,
  });

  if (error) return res.status(500).json({ ok: false, error });

  res.status(200).send("✅ Strava connected successfully!");
}
