import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID?.trim();
    const redirectUri = encodeURI("https://app.alamedateam.com/api/strava-auth");

    if (!STRAVA_CLIENT_ID) {
      console.error("❌ STRAVA_CLIENT_ID is missing");
      return res.status(500).send("Missing STRAVA_CLIENT_ID environment variable");
    }

    const authUrl = new URL("https://www.strava.com/oauth/authorize");
    authUrl.searchParams.set("client_id", STRAVA_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "read,activity:read_all,profile:read_all");
    authUrl.searchParams.set("approval_prompt", "force");

    console.log("✅ Redirecting to:", authUrl.toString());

    res.writeHead(302, { Location: authUrl.toString() });
    res.end();
  } catch (error: any) {
    console.error("🔥 Error in Strava auth redirect:", error);
    res
      .status(500)
      .send(`Failed to redirect to Strava authorization: ${error.message}`);
  }
}
