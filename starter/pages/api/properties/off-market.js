import { getDbClient, requireDbUser } from '../../../lib/apiAuth';
import { hasActiveRegularPremium } from '../../../lib/premiumAccess';
import { isCurrentLevelFourBuyerReadiness } from '../../../lib/giveawayEligibility';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const resolved = await requireDbUser(req, res, { createIfMissing: true });
    if (!resolved) return;
    if (!hasActiveRegularPremium(resolved.user)) {
      return res.status(403).json({ error: 'Active premium access is required to view off-market properties.' });
    }

    const db = getDbClient();
    const [rentalResult, buyerResult, propertiesResult] = await Promise.all([
      db.from('renter_readiness_profiles')
        .select('qualification_level')
        .eq('user_id', resolved.user.id)
        .maybeSingle(),
      db.from('buyer_prequalifications')
        .select('qualification_level, status, verification_expires_at')
        .eq('buyer_user_id', resolved.user.id),
      db
      .from('properties')
      .select('id, slug, title, description, type, price, currency, bedrooms, bathrooms, town, parish, available_date, image_urls, status, created_at')
      .eq('is_off_market', true)
      .in('status', ['available', 'active', 'coming_soon'])
      .order('created_at', { ascending: false }),
    ]);
    if (rentalResult.error) throw rentalResult.error;
    if (buyerResult.error) throw buyerResult.error;
    if (propertiesResult.error) throw propertiesResult.error;

    const now = new Date();
    const rentalReady = Number(rentalResult.data?.qualification_level) === 4;
    const buyerReady = (buyerResult.data || []).some((assessment) =>
      isCurrentLevelFourBuyerReadiness(assessment, now)
    );
    const prioritizedTypes = new Set([
      ...(rentalReady ? ['rent', 'rental', 'lease'] : []),
      ...(buyerReady ? ['sale', 'sell', 'buy'] : []),
    ]);
    const properties = (propertiesResult.data || []).sort((a, b) => {
      const aPriority = prioritizedTypes.has(String(a.type || '').toLowerCase()) ? 1 : 0;
      const bPriority = prioritizedTypes.has(String(b.type || '').toLowerCase()) ? 1 : 0;
      return bPriority - aPriority || new Date(b.created_at) - new Date(a.created_at);
    });

    return res.status(200).json({
      success: true,
      priorityAccess: rentalReady || buyerReady,
      properties,
    });
  } catch (error) {
    console.error('Off-market properties query failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to load off-market properties.' });
  }
}
