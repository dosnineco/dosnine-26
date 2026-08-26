import { getDbClient, requireDbUser } from '../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res, { createIfMissing: true });
    if (!resolved) return;

    const db = getDbClient();
    const userData = resolved.user || {};
    const propertyCount = Number(userData.property_count || 0);
    const isAgentUser = userData.user_type === 'agent';

    let agentData = null;
    if (isAgentUser) {
      const { data } = await db
        .from('agents')
        .select('verification_status, payment_status')
        .eq('user_id', userData.id)
        .maybeSingle();
      agentData = data || null;
    }

    // If agent, check verification and payment/plan access
    if (isAgentUser && agentData) {
      if (agentData.verification_status !== 'approved') {
        return res.status(200).json({ 
          error: 'Agent not verified',
          canPost: false,
          reason: 'verification_required'
        });
      }

      const validPlans = ['paid', 'free', '7-day', '30-day', '90-day'];
      if (!validPlans.includes(agentData.payment_status)) {
        return res.status(200).json({ 
          error: 'Payment required',
          canPost: false,
          reason: 'payment_required'
        });
      }

      // Verified and paid agents can post unlimited properties
      return res.status(200).json({ 
        canPost: true,
        isAgent: true,
        unlimited: true
      });
    }

    // Regular users - 2 free listings, then J$1,500 per additional listing
    const FREE_LIMIT = 2;
    const EXTRA_LISTING_FEE = 1500;
    const extraPaid = Number(userData.extra_listings_paid || 0);
    const allowedListings = FREE_LIMIT + extraPaid;

    if (propertyCount >= allowedListings) {
      return res.status(200).json({
        error: 'Property limit reached',
        canPost: false,
        reason: 'payment_required_extra_listing',
        propertyCount,
        maxProperties: allowedListings,
        freeLimit: FREE_LIMIT,
        extraListingFee: EXTRA_LISTING_FEE,
      });
    }

    return res.status(200).json({ 
      canPost: true,
      isAgent: false,
      propertyCount,
      maxProperties: allowedListings
    });

  } catch (error) {
    console.error('Check property limit error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
