import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { getRequestUrgencyPrices } from '@/lib/requestUrgencyPricing';

const schema = z.object({
  requestIds: z.array(z.string().uuid()).min(1).max(10000),
  urgency: z.enum(['high', 'urgent']),
}).refine(({ requestIds }) => new Set(requestIds).size === requestIds.length);

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const resolved = await requireDbUser(req, res, { createIfMissing: true });
  if (!resolved) return;
  if (resolved.user.account_type !== 'regular') {
    return res.status(403).json({ error: 'A regular account is required to boost requests.' });
  }

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'buyer-request-priority-boost',
    maxRequests: 5,
    windowMs: 60_000,
    identifier: resolved.user.id,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many boost attempts. Try again shortly.' });

  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Choose one or more valid requests and a priority level.' });
  }
  if (!process.env.PAYPAL_CLIENT_SECRET) {
    return res.status(503).json({ error: 'PayPal payments are not configured yet.' });
  }

  const db = getDbClient();
  try {
    const { data: requests, error: requestsError } = await db
      .from('service_requests')
      .select('id, urgency, status')
      .eq('client_user_id', resolved.user.id)
      .in('id', parsed.data.requestIds);
    if (requestsError) throw requestsError;
    if ((requests || []).length !== parsed.data.requestIds.length) {
      return res.status(404).json({ error: 'One or more requests could not be found.' });
    }

    const eligible = requests.every((request) =>
      ['low', 'normal'].includes(request.urgency || 'normal') &&
      !['completed', 'cancelled', 'deleted', 'withdrawn'].includes(request.status)
    );
    if (!eligible) {
      return res.status(409).json({ error: 'Only active low-priority requests can be boosted.' });
    }

    const prices = await getRequestUrgencyPrices(db);
    const amount = Number((prices[parsed.data.urgency] * requests.length).toFixed(2));
    const token = randomBytes(32).toString('hex');
    const { data: boostId, error: createError } = await db.rpc(
      'create_service_request_urgency_boost_batch',
      {
        p_client_user_id: resolved.user.id,
        p_service_request_ids: parsed.data.requestIds,
        p_urgency: parsed.data.urgency,
        p_amount: amount,
        p_token_hash: createHash('sha256').update(token).digest('hex'),
      }
    );
    if (createError) {
      if (/no longer eligible|already pending|already been purchased/i.test(createError.message || '')) {
        return res.status(409).json({ error: createError.message });
      }
      throw createError;
    }

    return res.status(200).json({
      success: true,
      boost: {
        id: boostId,
        token,
        count: requests.length,
        urgency: parsed.data.urgency,
        amount,
      },
    });
  } catch (error) {
    console.error('Creating buyer request priority boost failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to prepare request priority boost.' });
  }
}
