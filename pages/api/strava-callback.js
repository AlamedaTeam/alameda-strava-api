export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  try {
    // Intercambiamos el "code" por un access_token
    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID || "184014",
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    const data = await response.json();

    // Si falla, devolvemos el error
    if (!data.access_token) {
      return res.status(400).json({ error: "Bad Request", details: data });
    }

    // ✅ Datos del atleta
    const athlete = data.athlete;
    const redirectBase = "https://www.alamedatrailteam.com/pagina-en-blanco"; // <-- cambia por la página VIP real

    // Creamos la URL de retorno con parámetros legibles
    const redirectUrl = `${redirectBase}?strava=ok&name=${encodeURIComponent(
      athlete.firstname + " " + athlete.lastname
    )}&id=${athlete.id}&pic=${encodeURIComponent(athlete.profile_medium)}`;

    // Redirigimos al usuario a la web VIP
    return res.redirect(302, redirectUrl);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
