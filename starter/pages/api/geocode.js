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

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const query = String(req.query?.address || '').trim();
  const latitude = String(req.query?.latitude || '').trim();
  const longitude = String(req.query?.longitude || '').trim();

  if (!apiKey) {
    return res.status(500).json({ error: 'Google Maps is not configured on the server.' });
  }

  const params = new URLSearchParams({ key: apiKey, region: 'jm' });
  if (latitude && longitude) {
    params.set('latlng', `${latitude},${longitude}`);
  } else if (query) {
    params.set('address', query);
    params.set('components', 'country:JM');
  } else {
    return res.status(400).json({ error: 'Address or coordinates are required.' });
  }

  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
    const payload = await response.json();
    const result = payload?.results?.[0];

    if (!response.ok || payload.status !== 'OK' || !result) {
      return res.status(404).json({ error: 'Google Maps could not find that location.', status: payload.status });
    }

    const componentValue = (types) => result.address_components?.find((component) =>
      types.some((type) => component.types.includes(type))
    )?.long_name || '';

    return res.status(200).json({
      formattedAddress: result.formatted_address,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      parish: normalizeParishName(componentValue(['administrative_area_level_1'])),
      town: componentValue(['locality', 'postal_town', 'sublocality_level_1']),
    });
  } catch (error) {
    return res.status(502).json({ error: 'Google Maps is temporarily unavailable.' });
  }
}
