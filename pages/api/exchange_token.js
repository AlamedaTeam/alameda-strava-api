// pages/api/exchange_token.js
export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).json({ error: 'Access denied by user' });
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  return res.status(200).json({
    message: 'Authorization code received successfully ✅',
    code,
    next_step: "Use this code in the curl command to exchange for an access_token."
  });
}
