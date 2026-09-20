import { enforceMethods } from '../../../lib/apiSecurity';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;

  const input = String(req.query?.input || '').trim().slice(0, 100);

  if (input.length < 2) {
    return res.status(200).json({ success: true, suggestions: [] });
  }

  const params = new URLSearchParams({
    q: `${input}, Jamaica`,
    format: 'jsonv2',
    addressdetails: '1',
    countrycodes: 'jm',
    limit: '8',
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { 'User-Agent': 'DosninePropertyMarketplace/1.0' },
    });
    const payload = await response.json();

    if (!response.ok || !Array.isArray(payload)) {
      return res.status(502).json({ error: 'Location suggestions are unavailable.' });
    }

    return res.status(200).json({
      success: true,
      suggestions: payload.slice(0, 8).map((result) => ({
        description: result.display_name,
        placeId: `${result.lat},${result.lon}`,
      })),
    });
  } catch (error) {
    return res.status(502).json({ error: 'Location suggestions are unavailable.' });
  }
}
