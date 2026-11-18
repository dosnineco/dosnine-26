import { getDbClient, requireDbUser } from '../../../lib/apiAuth';
import { canManageProperties } from '../../../lib/rbac';
import { hasActiveRegularPremium } from '../../../lib/premiumAccess';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res, { createIfMissing: true });
    if (!resolved) return;

    const db = getDbClient();
    const userData = resolved.user || {};
    if (!canManageProperties(userData)) {
      return res.status(403).json({ error: 'A verified homeowner or agent account is required to post properties.' });
    }
    if (userData.role === 'admin') {
      return res.status(200).json({ canPost: true, isAdmin: true, unlimited: true });
    }
    const isAgentUser = userData.account_type === 'agent' || userData.user_type === 'agent';
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
    if (isAgentUser && !agentData) {
      return res.status(200).json({
        error: 'Agent profile not found',
        canPost: false,
        reason: 'verification_required',
      });
    }

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

    const { count: propertyCount, error: countError } = await db
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userData.id);
    if (countError) throw countError;
    const actualPropertyCount = Number(propertyCount || 0);

    if (actualPropertyCount >= 1 && !hasActiveRegularPremium(userData)) {
      return res.status(200).json({
        error: 'Premium is required to post more than one property.',
        canPost: false,
        reason: 'premium_required',
        propertyCount: actualPropertyCount,
        maxProperties: 1,
      });
    }

    return res.status(200).json({ 
      canPost: true,
      isAgent: false,
      propertyCount: actualPropertyCount,
      maxProperties: hasActiveRegularPremium(userData) ? null : 1,
    });

  } catch (error) {
    console.error('Check property limit error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
