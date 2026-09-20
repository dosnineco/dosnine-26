import { enforceMethods } from '../../lib/apiSecurity';

function normalizeParishName(value) {
  return String(value || '')
    .replace(/\s+Parish$/i, '')
    .replace(/^Saint\s+/i, 'St ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;

  const query = String(req.query?.address || '').trim();
  const latitude = String(req.query?.latitude || '').trim();
  const longitude = String(req.query?.longitude || '').trim();

  if (!query && !(latitude && longitude)) {
    return res.status(400).json({ error: 'Address or coordinates are required.' });
  }

  try {
    const endpoint = latitude && longitude
      ? 'https://nominatim.openstreetmap.org/reverse'
      : 'https://nominatim.openstreetmap.org/search';
    const params = new URLSearchParams({
      format: 'jsonv2',
      addressdetails: '1',
      ...(latitude && longitude
        ? { lat: latitude, lon: longitude, zoom: '18' }
        : { q: query, countrycodes: 'jm', limit: '1' }),
    });
    const response = await fetch(`${endpoint}?${params.toString()}`, {
      headers: { 'User-Agent': 'DosninePropertyMarketplace/1.0' },
    });
    const payload = await response.json();
    const result = Array.isArray(payload) ? payload[0] : payload;

    if (!response.ok || !result?.lat || !result?.lon) {
      return res.status(404).json({ error: 'Could not find that location.' });
    }

    const address = result.address || {};

    return res.status(200).json({
      formattedAddress: result.display_name,
      latitude: Number(result.lat),
      longitude: Number(result.lon),
      parish: normalizeParishName(address.state || address.county || ''),
      town: address.city || address.town || address.village || address.suburb || '',
    });
  } catch (error) {
    return res.status(502).json({ error: 'Location search is temporarily unavailable.' });
  }
}
