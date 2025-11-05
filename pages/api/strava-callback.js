// /pages/api/strava-callback.js
export default async function handler(req, res) {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send("Missing Strava authorization code");
    }

    // Intercambio del código por el token de acceso
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
    const athlete = data.athlete;

    if (!athlete) {
      return res.status(500).send("No athlete data received from Strava");
    }

    // Nombre y foto del atleta
    const name = `${athlete.firstname || ""} ${athlete.lastname || ""}`.trim();
    const pic = athlete.profile_medium || athlete.profile || "";
    const id = athlete.id;

    // URL base de retorno
    const returnUrl = `https://www.alamedatrailteam.com/pagina-en-blanco/?strava=ok&name=${encodeURIComponent(
      name
    )}&id=${id}&pic=${encodeURIComponent(pic)}`;

    // 🔁 Redirigir en la misma pestaña (no nueva)
    res.writeHead(302, {
      Location: returnUrl,
    });
    res.end();
  } catch (error) {
    console.error("❌ Error en callback Strava:", error);
    res.status(500).send("Error processing Strava callback");
  }
}
