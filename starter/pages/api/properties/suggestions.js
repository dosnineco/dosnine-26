import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawSearch = String(req.query.q || '').trim();
    const search = rawSearch.replace(/[^a-zA-Z0-9\s,.-]/g, '').slice(0, 80);

    if (search.length < 2) {
      return res.status(200).json({ success: true, suggestions: [] });
    }

    const db = supabase;
    const searchTerm = `%${search}%`;
    const { data, error } = await db
      .from('properties')
      .select('town, parish, address, formatted_address, title, description')
      .or(`town.ilike.${searchTerm},address.ilike.${searchTerm},parish.ilike.${searchTerm},formatted_address.ilike.${searchTerm},title.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .limit(30);

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to fetch suggestions' });
    }

    const locations = new Set();
    (data || []).forEach((property) => {
      const town = property.town ? String(property.town).trim() : '';
      const parish = property.parish ? String(property.parish).trim() : '';
      const address = property.address ? String(property.address).trim() : '';
      const formatted = property.formatted_address ? String(property.formatted_address).trim() : '';

      if (town) locations.add(town);
      if (town && parish) locations.add(`${town}, ${parish}`);
      if (parish) locations.add(parish);
      if (formatted) locations.add(formatted);

      if (address) {
        const [firstPart] = address.split(',');
        if (firstPart && firstPart.trim()) locations.add(firstPart.trim());
      }
    });

    const suggestions = Array.from(locations)
      .filter((location) => String(location).toLowerCase().includes(search.toLowerCase()))
      .slice(0, 8);

    return res.status(200).json({ success: true, suggestions });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
