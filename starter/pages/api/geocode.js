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
