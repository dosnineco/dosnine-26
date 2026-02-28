import { supabase } from '@/lib/supabase';
import { normalizeParish } from '@/lib/normalizeParish';
import { z } from 'zod';
import { enforceMethods } from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';

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
  if (!enforceMethods(req, res, ['GET'])) return;

  try {
    const rate = await enforceRateLimitDistributed(req, res, {
      keyPrefix: 'property-detail',
      maxRequests: 120,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }

    const { slug } = z.object({
      slug: z
        .string()
        .trim()
        .min(1)
        .max(120)
        .regex(/^[a-z0-9-]+$/i),
    }).parse(req.query || {});

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
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid slug' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
