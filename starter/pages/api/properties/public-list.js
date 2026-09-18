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
  'currency',
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
    const rawParish = String(req.query.parish || '').trim();
    const rawMinPrice = String(req.query.minPrice || '').trim();
    const rawMaxPrice = String(req.query.maxPrice || '').trim();
    const rawBedrooms = String(req.query.bedrooms || '').trim();
    const rawLocation = String(req.query.location || '').trim();
    const rawPage = String(req.query.page || '1').trim();
    const rawPerPage = String(req.query.perPage || '20').trim();
    const rawSlugText = String(req.query.slugText || '').trim();

    const parish = rawParish.replace(/[^a-zA-Z0-9\s&-]/g, '').slice(0, 60);
    const location = rawLocation.replace(/[^a-zA-Z0-9\s,.-]/g, '').slice(0, 100);
    const slugText = rawSlugText.replace(/[^a-zA-Z0-9\s-]/gi, ' ').slice(0, 200);
    const minPrice = Number(rawMinPrice) || '';
    const maxPrice = Number(rawMaxPrice) || '';
    const bedrooms = Number(rawBedrooms) || '';
    const page = Number(rawPage) || 1;
    const perPage = Number(rawPerPage) || 20;

    const pageNumber = Math.min(Math.max(page, 1), 200);
    const pageSize = Math.min(Math.max(perPage, 1), 50);

    const {
      parish: parishFilter = '',
      minPrice: minPriceFilter = '',
      maxPrice: maxPriceFilter = '',
      bedrooms: bedroomsFilter = '',
      location: locationFilter = '',
      slugText: slugToken = '',
    } = {
      parish: parish,
      minPrice: minPrice,
      maxPrice: maxPrice,
      bedrooms: bedrooms,
      location: location,
      slugText: slugText,
    };

    let query = db
      .from('properties')
      .select(PUBLIC_PROPERTY_LIST_FIELDS, { count: 'exact' })
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    const normalizedParish = normalizeParish(String(parishFilter || ''));
    if (normalizedParish) query = query.eq('parish', normalizedParish);

    const min = minPriceFilter !== '' ? Number(minPriceFilter) : null;
    const max = maxPriceFilter !== '' ? Number(maxPriceFilter) : null;
    const beds = bedroomsFilter !== '' ? Number(bedroomsFilter) : null;

    if (min !== null && !Number.isNaN(min)) query = query.gte('price', min);
    if (max !== null && !Number.isNaN(max)) query = query.lte('price', max);
    if (beds !== null && !Number.isNaN(beds)) query = query.eq('bedrooms', beds);

    const trimmedLocation = String(locationFilter || '').trim();
    if (trimmedLocation) {
      const locationTerms = trimmedLocation
        .split(/\s+(?:and|or)\s+|[,;]+/i)
        .map((term) => term.trim())
        .filter(Boolean);
      const locationFields = ['town', 'address', 'parish', 'formatted_address', 'title', 'description'];
      const locationSearches = locationTerms.flatMap((term) => {
        const searchTerm = `%${term}%`;
        return locationFields.map((field) => `${field}.ilike.${searchTerm}`);
      });

      if (locationSearches.length > 0) query = query.or(locationSearches.join(','));
    }

    const tokenSource = String(slugToken || '').toLowerCase().trim();
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
