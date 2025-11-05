import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { STRAVA_CLIENT_ID } = process.env;
  const redirectUri = "https://alameda-strava-api.vercel.app/api/auth/callback";

  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=read,activity:read_all,profile:read_all`;

  res.redirect(authUrl);
}

