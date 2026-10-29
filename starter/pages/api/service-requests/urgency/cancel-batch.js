import { z } from 'zod';
import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const resolved = await requireDbUser(req, res, { createIfMissing: true });
  if (!resolved) return;
  if (resolved.user.account_type !== 'regular') {
    return res.status(403).json({ error: 'A regular account is required to manage this boost.' });
  }

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'buyer-request-priority-cancel',
    maxRequests: 10,
    windowMs: 60_000,
    identifier: resolved.user.id,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many boost attempts. Try again shortly.' });

  const parsed = z.object({ boostId: z.string().uuid() }).safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'A valid request boost is required.' });

  try {
    const { data: cancelledBoost, error } = await getDbClient()
      .from('service_request_urgency_boost_batches')
      .update({ status: 'expired', expires_at: new Date().toISOString() })
      .eq('id', parsed.data.boostId)
      .eq('client_user_id', resolved.user.id)
      .eq('status', 'awaiting_payment')
      .is('paypal_order_id', null)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!cancelledBoost) {
      return res.status(409).json({
        error: 'This boost cannot be closed after PayPal checkout starts. Finish checkout or try again later.',
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Canceling buyer request priority boost failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to cancel this request boost.' });
  }
}
