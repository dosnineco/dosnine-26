import { supabase } from '@/lib/supabase';
import { normalizeParish } from '@/lib/normalizeParish';

const PUBLIC_PROPERTY_DETAIL_FIELDS = [
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
  'phone_number',
  'views',
  'status',
  'created_at',
].join(',');

const PUBLIC_SIMILAR_PROPERTY_FIELDS = [
  'id',
  'slug',
  'owner_id',
  'title',
  'type',
  'price',
  'bedrooms',
  'bathrooms',
  'town',
  'parish',
  'image_urls',
  'status',
  'created_at',
].join(',');

const PUBLIC_VISIBLE_STATUSES = ['available', 'active', 'coming_soon'];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const slug = String(req.query.slug || '').trim();
    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }

    const db = supabase;
    const { data: property, error: propertyError } = await db
      .from('properties')
      .select(PUBLIC_PROPERTY_DETAIL_FIELDS)
      .eq('slug', slug)
      .in('status', PUBLIC_VISIBLE_STATUSES)
      .single();

    if (propertyError || !property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    await db
      .from('properties')
      .update({ views: (property.views || 0) + 1 })
      .eq('id', property.id);

    const { data: refreshedProperty } = await db
      .from('properties')
      .select(PUBLIC_PROPERTY_DETAIL_FIELDS)
      .eq('id', property.id)
      .single();

    const propertyData = refreshedProperty || property;

    const { data: ownerData } = await db
      .from('users')
      .select('agent_is_verified, verified_at')
      .eq('id', propertyData.owner_id)
      .single();

    const { data: similarProperties } = await db
      .from('properties')
      .select(PUBLIC_SIMILAR_PROPERTY_FIELDS)
      .in('status', PUBLIC_VISIBLE_STATUSES)
      .eq('parish', normalizeParish(propertyData.parish))
      .neq('id', propertyData.id)
      .limit(4);

    return res.status(200).json({
      success: true,
      property: propertyData,
      similarProperties: similarProperties || [],
      isVerifiedAgent: ownerData?.agent_is_verified || false,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
