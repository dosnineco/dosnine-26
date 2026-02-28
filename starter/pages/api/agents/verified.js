import { getDbClient } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';

const PUBLIC_AGENT_FIELDS = [
  'id',
  'full_name',
  'agent_specialty',
  'agent_years_experience',
  'agent_parishes',
  'agent_is_verified',
  'agent_verified_at',
  'created_at',
].join(',');

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;

  try {
    const rate = await enforceRateLimitDistributed(req, res, {
      keyPrefix: 'agents-verified',
      maxRequests: 80,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }

    const db = getDbClient();
    const { data: agents, error } = await db
      .from('users')
      .select(PUBLIC_AGENT_FIELDS)
      .eq('user_type', 'agent')
      .eq('agent_verification_status', 'approved')
      .eq('agent_verified', true)
      .order('agent_years_experience', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching agents:', error);
      return res.status(500).json({ error: 'Failed to fetch agents' });
    }

    return res.status(200).json({
      success: true,
      agents: agents || [],
    });
  } catch (error) {
    console.error('Verified agents error:', error);
    return res.status(500).json({ error: 'Failed to fetch agents' });
  }
}
