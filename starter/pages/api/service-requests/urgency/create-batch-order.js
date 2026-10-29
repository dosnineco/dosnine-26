import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { callPayPal, PAYPAL_ORDER_API } from '@/lib/paypal';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';

const schema = z.object({
  boostId: z.string().uuid(),
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  acceptedTerms: z.literal(true),
});

function isValidToken(token, tokenHash) {
  const expected = Buffer.from(tokenHash || '', 'hex');
  const actual = createHash('sha256').update(token).digest();
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const resolved = await requireDbUser(req, res, { createIfMissing: true });
  if (!resolved) return;
  if (resolved.user.account_type !== 'regular') {
    return res.status(403).json({ error: 'A regular account is required to complete this payment.' });
  }

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'buyer-request-priority-create-order',
    maxRequests: 5,
    windowMs: 60_000,
    identifier: resolved.user.id,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many payment attempts. Try again shortly.' });

  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'A valid request boost is required.' });
  if (!process.env.PAYPAL_CLIENT_SECRET) {
    return res.status(503).json({ error: 'PayPal payments are not configured yet.' });
  }

  const db = getDbClient();
  try {
    const { data: batch, error: lookupError } = await db
      .from('service_request_urgency_boost_batches')
      .select('id, client_user_id, service_request_ids, urgency, amount, status, token_hash, paypal_order_id, expires_at')
      .eq('id', parsed.data.boostId)
      .eq('client_user_id', resolved.user.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!batch || !isValidToken(parsed.data.token, batch.token_hash)) {
      return res.status(404).json({ error: 'Request boost not found.' });
    }
    if (batch.status !== 'awaiting_payment' || new Date(batch.expires_at) <= new Date()) {
      return res.status(400).json({ error: 'This request boost has expired. Start a new boost to continue.' });
    }
    if (batch.paypal_order_id) {
      return res.status(200).json({ success: true, orderId: batch.paypal_order_id });
    }

    const { data: requests, error: requestsError } = await db
      .from('service_requests')
      .select('id, urgency, status')
      .eq('client_user_id', resolved.user.id)
      .in('id', batch.service_request_ids);
    if (requestsError) throw requestsError;
    const eligible = requests?.length === batch.service_request_ids.length &&
      requests.every((request) =>
        ['low', 'normal'].includes(request.urgency || 'normal') &&
        !['completed', 'cancelled', 'deleted', 'withdrawn'].includes(request.status)
      );
    if (!eligible) {
      return res.status(409).json({ error: 'One or more requests are no longer eligible for a boost.' });
    }

    const amount = Number(batch.amount).toFixed(2);
    const order = await callPayPal(PAYPAL_ORDER_API, {
      method: 'POST',
      requestId: randomUUID(),
      body: {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: batch.id,
          custom_id: resolved.user.id,
          description: `${batch.service_request_ids.length} ${batch.urgency} priority request boost${batch.service_request_ids.length === 1 ? '' : 's'}`,
          amount: { currency_code: 'USD', value: amount },
        }],
        application_context: {
          brand_name: 'Dosnine',
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
        },
      },
    });

    if (!order.id || order.status !== 'CREATED') {
      throw new Error('PayPal did not create a valid order.');
    }

    const { data: updatedBatch, error: updateError } = await db
      .from('service_request_urgency_boost_batches')
      .update({
        paypal_order_id: order.id,
        terms_accepted_at: new Date().toISOString(),
      })
      .eq('id', batch.id)
      .eq('client_user_id', resolved.user.id)
      .eq('status', 'awaiting_payment')
      .select('id')
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updatedBatch) {
      return res.status(409).json({ error: 'This request boost is no longer available.' });
    }

    return res.status(200).json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Buyer request priority PayPal order creation failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to start PayPal checkout.' });
  }
}
