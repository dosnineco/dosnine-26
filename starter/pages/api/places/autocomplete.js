import { enforceMethods } from '../../../lib/apiSecurity';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const input = String(req.query?.input || '').trim().slice(0, 100);

  if (!apiKey) {
    return res.status(500).json({ error: 'Google Maps is not configured on the server.' });
  }

  if (input.length < 2) {
    return res.status(200).json({ success: true, suggestions: [] });
  }

  const params = new URLSearchParams({
    input,
    key: apiKey,
    components: 'country:jm',
    language: 'en',
  });

  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`);
    const payload = await response.json();

    if (!response.ok || !['OK', 'ZERO_RESULTS'].includes(payload.status)) {
      return res.status(502).json({ error: 'Google Maps suggestions are unavailable.' });
    }

    return res.status(200).json({
      success: true,
      suggestions: (payload.predictions || []).slice(0, 8).map((prediction) => ({
        description: prediction.description,
        placeId: prediction.place_id,
      })),
    });
  } catch (error) {
    return res.status(502).json({ error: 'Google Maps suggestions are unavailable.' });
  }
}
