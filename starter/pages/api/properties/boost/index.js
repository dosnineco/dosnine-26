import { z } from 'zod';
import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { canManageProperties } from '@/lib/rbac';
import { hasActiveRegularPremium } from '@/lib/premiumAccess';

const requestSchema = z.object({ propertyId: z.string().uuid() });

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET', 'POST'])) return;

  const resolved = await requireDbUser(req, res, { createIfMissing: true });
  if (!resolved) return;
  if (!canManageProperties(resolved.user)) {
    return res.status(403).json({ error: 'A verified homeowner or agent account is required to boost properties.' });
  }

  const db = getDbClient();
  try {
    const { error: expiryError } = await db.rpc('expire_property_boosts');
    if (expiryError) throw expiryError;

    if (req.method === 'GET') {
      const { data: activeBoosts, error: boostsError } = await db
        .from('property_boosts')
        .select('property_id, boost_end_date, boost_source')
        .eq('owner_id', resolved.user.id)
        .eq('status', 'active')
        .gt('boost_end_date', new Date().toISOString());
      if (boostsError) throw boostsError;

      const premiumActive = hasActiveRegularPremium(resolved.user);
      let includedBoostUsed = false;
      if (premiumActive) {
        const { data: includedBoost, error: includedBoostError } = await db
          .from('property_boosts')
          .select('id')
          .eq('owner_id', resolved.user.id)
          .eq('boost_source', 'premium_included')
          .eq('premium_cycle_expires_at', resolved.user.premium_service_request_expires)
          .limit(1)
          .maybeSingle();
        if (includedBoostError) throw includedBoostError;
        includedBoostUsed = Boolean(includedBoost);
      }

      const { data: priceSetting, error: priceError } = await db
        .from('site_settings')
        .select('value')
        .eq('key', 'property_boost_price')
        .maybeSingle();
      if (priceError) throw priceError;
      const boostPriceJmd = Number(priceSetting?.value ?? 500);
      if (!Number.isSafeInteger(boostPriceJmd) || boostPriceJmd < 1) {
        return res.status(503).json({ error: 'Property boost pricing is not configured.' });
      }

      return res.status(200).json({
        success: true,
        boosts: activeBoosts || [],
        premiumActive,
        includedBoostAvailable: premiumActive && !includedBoostUsed,
        boostPriceJmd,
      });
    }

    const parsed = requestSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'A valid property is required.' });
    if (!hasActiveRegularPremium(resolved.user)) {
      return res.status(403).json({ error: 'The included property boost requires active Premium access.' });
    }

    const { data: property, error: propertyError } = await db
      .from('properties')
      .select('id, owner_id, status')
      .eq('id', parsed.data.propertyId)
      .eq('owner_id', resolved.user.id)
      .maybeSingle();
    if (propertyError) throw propertyError;
    if (!property) return res.status(404).json({ error: 'Property not found.' });
    if (['sold', 'rented', 'leased'].includes(String(property.status || '').toLowerCase())) {
      return res.status(409).json({ error: 'Sold or rented properties cannot be boosted.' });
    }

    const { data: includedBoost, error: includedBoostError } = await db
      .from('property_boosts')
      .select('id')
      .eq('owner_id', resolved.user.id)
      .eq('boost_source', 'premium_included')
      .eq('premium_cycle_expires_at', resolved.user.premium_service_request_expires)
      .limit(1)
      .maybeSingle();
    if (includedBoostError) throw includedBoostError;
    if (includedBoost) {
      return res.status(409).json({ error: 'Your included boost has already been used for this Premium period.' });
    }

    const { data: boostId, error: claimError } = await db.rpc('claim_premium_property_boost', {
      p_owner_id: resolved.user.id,
      p_property_id: parsed.data.propertyId,
    });
    if (claimError) {
      if (claimError.code === '23505' || /already|sold|rented/i.test(claimError.message || '')) {
        return res.status(409).json({ error: claimError.message });
      }
      if (/premium access/i.test(claimError.message || '')) {
        return res.status(403).json({ error: claimError.message });
      }
      throw claimError;
    }

    const { data: boost, error: fetchError } = await db
      .from('property_boosts')
      .select('property_id, boost_end_date, boost_source')
      .eq('id', boostId)
      .single();
    if (fetchError) throw fetchError;
    return res.status(200).json({ success: true, boost });
  } catch (error) {
    console.error('Property boost request failed:', error);
    return res.status(500).json({ error: 'Unable to load or activate property boosts.' });
  }
}
