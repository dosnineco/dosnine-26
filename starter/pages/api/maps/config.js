import { enforceMethods } from '../../../lib/apiSecurity';

export default function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Google Maps is not configured on the server.' });
  }

  return res.status(200).json({ apiKey });
}
