import { supabase } from '@/lib/supabase';
import { normalizeParish } from '@/lib/normalizeParish';

const PUBLIC_PROPERTY_LIST_FIELDS = [
  'id',
  'slug',
  'owner_id',
  'title',
  'description',
  'type',
  'price',
  'bedrooms',
  'bathrooms',
  'address',
  'town',
  'parish',
  'available_date',
  'image_urls',
  'is_featured',
  'status',
  'views',
  'created_at',
].join(',');

const PUBLIC_VISIBLE_STATUSES = new Set(['available', 'active', 'coming_soon', '']);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = supabase;
    const {
      parish = '',
      minPrice = '',
      maxPrice = '',
      bedrooms = '',
      location = '',
      page = '1',
      perPage = '20',
      slugText = '',
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(perPage) || 20, 1), 50);

    let query = db
      .from('properties')
      .select(PUBLIC_PROPERTY_LIST_FIELDS, { count: 'exact' })
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    const normalizedParish = normalizeParish(String(parish || ''));
    if (normalizedParish) query = query.eq('parish', normalizedParish);

    const min = minPrice !== '' ? Number(minPrice) : null;
    const max = maxPrice !== '' ? Number(maxPrice) : null;
    const beds = bedrooms !== '' ? Number(bedrooms) : null;

    if (min !== null && !Number.isNaN(min)) query = query.gte('price', min);
    if (max !== null && !Number.isNaN(max)) query = query.lte('price', max);
    if (beds !== null && !Number.isNaN(beds)) query = query.eq('bedrooms', beds);

    const trimmedLocation = String(location || '').trim();
    if (trimmedLocation && !normalizedParish) {
      const searchTerm = `%${trimmedLocation}%`;
      query = query.or(`town.ilike.${searchTerm},address.ilike.${searchTerm},parish.ilike.${searchTerm}`);
    }

    const tokenSource = String(slugText || '').toLowerCase().trim();
    if (tokenSource) {
      const tokens = tokenSource
        .replace(/_/g, '-')
        .split('-')
        .map((token) => token.trim())
        .filter((token) => token.length > 1);

      if (tokens.length > 0) {
        const ors = [];
        tokens.forEach((token) => {
          const like = `%${token}%`;
          ors.push(`title.ilike.${like}`);
          ors.push(`description.ilike.${like}`);
          ors.push(`parish.ilike.${like}`);
          ors.push(`town.ilike.${like}`);
          ors.push(`address.ilike.${like}`);
          ors.push(`type.ilike.${like}`);
        });
        query = query.or(ors.join(','));
      }
    }

    const start = (pageNumber - 1) * pageSize;
    const end = start + pageSize - 1;
    const { data, count, error } = await query.range(start, end);

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to fetch properties' });
    }

    const properties = (data || []).filter((property) => {
      const status = String(property?.status || '').toLowerCase().trim();
      return !status || PUBLIC_VISIBLE_STATUSES.has(status);
    });

    return res.status(200).json({
      success: true,
      properties,
      totalCount: count || 0,
      page: pageNumber,
      perPage: pageSize,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
