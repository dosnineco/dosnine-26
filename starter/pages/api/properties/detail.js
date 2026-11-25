import { supabase } from '@/lib/supabase';
import { normalizeParish } from '@/lib/normalizeParish';
import { z } from 'zod';
import { clerkClient } from '@clerk/nextjs/server';
import { enforceMethods } from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { getClerkUserId, getDbClient, requireDbUser } from '@/lib/apiAuth';
import { hasActiveRegularPremium } from '@/lib/premiumAccess';

const PUBLIC_PROPERTY_DETAIL_FIELDS = [
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
  'formatted_address',
  'latitude',
  'longitude',
  'town',
  'parish',
  'available_date',
  'image_urls',
  'phone_number',
  'views',
  'status',
  'created_at',
  'is_off_market',
].join(',');

const LEGACY_PROPERTY_DETAIL_FIELDS = [
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
  'currency',
  'currency',
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
    let { data: property, error: propertyError } = await db
      .from('properties')
      .select(PUBLIC_PROPERTY_DETAIL_FIELDS)
      .eq('slug', slug)
      .in('status', PUBLIC_VISIBLE_STATUSES)
      .single();

    // Keep older deployments readable until the location migration is applied.
    if (propertyError) {
      const legacyResult = await db
        .from('properties')
        .select(LEGACY_PROPERTY_DETAIL_FIELDS)
        .eq('slug', slug)
        .in('status', PUBLIC_VISIBLE_STATUSES)
        .single();
      property = legacyResult.data;
      propertyError = legacyResult.error;
    }

    if ((propertyError || !property) && getClerkUserId(req)) {
      const { data: privateProperty, error: privatePropertyError } = await getDbClient()
        .from('properties')
        .select(PUBLIC_PROPERTY_DETAIL_FIELDS)
        .eq('slug', slug)
        .in('status', PUBLIC_VISIBLE_STATUSES)
        .eq('is_off_market', true)
        .maybeSingle();
      if (privatePropertyError) throw privatePropertyError;
      if (privateProperty) {
        property = privateProperty;
        propertyError = null;
      }
    }

    if (propertyError || !property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.is_off_market) {
      if (!getClerkUserId(req)) return res.status(404).json({ error: 'Property not found' });
      const resolved = await requireDbUser(req, res, { createIfMissing: true });
      if (!resolved) return;
      if (
        property.owner_id !== resolved.user.id &&
        !hasActiveRegularPremium(resolved.user)
      ) {
        return res.status(404).json({ error: 'Property not found' });
      }
    }

    const { data: updatedViews, error: viewError } = await db.rpc('increment_property_views', {
      property_id: property.id,
    });

    if (viewError) {
      console.error('Failed to increment property views:', viewError);
    }

    const propertyData = {
      ...property,
      views: viewError ? property.views : Number(updatedViews || property.views || 0),
    };

    const { data: ownerData, error: ownerError } = await db
      .from('users')
      .select('clerk_id, full_name, profile_image_url, agent_is_verified, verified_at')
      .eq('id', propertyData.owner_id)
      .maybeSingle();
    if (ownerError) throw ownerError;

    const { data: agentData } = await db
      .from('agents')
      .select('business_name, verification_status')
      .eq('user_id', propertyData.owner_id)
      .maybeSingle();

    let clerkOwner = null;
    if (ownerData?.clerk_id && (!ownerData.full_name || !ownerData.profile_image_url)) {
      try {
        clerkOwner = await clerkClient.users.getUser(ownerData.clerk_id);
      } catch (clerkError) {
        console.error('Unable to load Clerk profile for property owner:', clerkError);
      }
    }

    const { data: similarProperties } = await db
      .from('properties')
      .select(PUBLIC_SIMILAR_PROPERTY_FIELDS)
      .in('status', PUBLIC_VISIBLE_STATUSES)
      .eq('is_off_market', false)
      .eq('parish', normalizeParish(propertyData.parish))
      .neq('id', propertyData.id)
      .limit(4);

    return res.status(200).json({
      success: true,
      property: propertyData,
      similarProperties: similarProperties || [],
      isVerifiedAgent: ownerData?.agent_is_verified || false,
      owner: {
        name: ownerData?.full_name ||
          [clerkOwner?.firstName, clerkOwner?.lastName].filter(Boolean).join(' ') ||
          'Property owner',
        businessName: agentData?.business_name || null,
        isAgent: Boolean(agentData),
        profileImageUrl: ownerData?.profile_image_url || clerkOwner?.imageUrl || null,
      },
    });
  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid slug' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
