import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const search = String(req.query.q || '').trim();
    if (search.length < 2) {
      return res.status(200).json({ success: true, suggestions: [] });
    }

    const db = supabase;
    const searchTerm = `%${search}%`;
    const { data, error } = await db
      .from('properties')
      .select('town, parish, address')
      .or(`town.ilike.${searchTerm},address.ilike.${searchTerm},parish.ilike.${searchTerm}`)
      .limit(20);

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to fetch suggestions' });
    }

    const locations = new Set();
    (data || []).forEach((property) => {
      if (property.town) locations.add(property.town);
      if (property.parish) locations.add(property.parish);
      if (property.address) {
        const [firstPart] = String(property.address).split(',');
        if (firstPart) locations.add(firstPart.trim());
      }
    });

    const suggestions = Array.from(locations)
      .filter((location) => location.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 8);

    return res.status(200).json({ success: true, suggestions });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
