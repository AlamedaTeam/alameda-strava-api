export default async function handler(req, res) {
  try {
    const response = await fetch("https://www.strava.com/api/v3/push_subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: "184014",
        client_secret: "72954c29a0d9f5ab52aab4347d33a92b9c6b9",
        callback_url: "https://alameda-strava-api.vercel.app/api/strava-webhook",
        verify_token: "alamedateam123",
      }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
