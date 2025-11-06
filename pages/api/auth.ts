import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
    const redirectUri = "https://alameda-strava-api.vercel.app/api/callback";

    if (!STRAVA_CLIENT_ID) {
      console.error("❌ STRAVA_CLIENT_ID is missing");
      return res.status(500).send("Missing STRAVA_CLIENT_ID environment variable");
    }

    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&scope=read,activity:read_all,profile:read_all&approval_prompt=force`;

    console.log("✅ Redirecting to:", authUrl);
    res.redirect(authUrl);
  } catch (error: any) {
    console.error("🔥 Error in Strava auth redirect:", error);
    res.status(500).send(`Failed to redirect to Strava authorization: ${error.message}`);
  }
}
