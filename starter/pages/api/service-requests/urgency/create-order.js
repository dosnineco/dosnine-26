import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { getDbClient } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { callPayPal, PAYPAL_ORDER_API } from '@/lib/paypal';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';

const schema = z.object({
  paymentId: z.string().uuid(),
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

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'service-request-urgency-create-order',
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many payment attempts. Try again shortly.' });

  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'A valid request boost is required.' });
  if (!process.env.PAYPAL_CLIENT_SECRET) {
    return res.status(503).json({ error: 'PayPal payments are not configured yet.' });
  }

  const db = getDbClient();
  try {
    const { data: payment, error: lookupError } = await db
      .from('service_request_urgency_payments')
      .select('id, service_request_id, urgency, amount, status, token_hash, paypal_order_id')
      .eq('id', parsed.data.paymentId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!payment || !isValidToken(parsed.data.token, payment.token_hash)) {
      return res.status(404).json({ error: 'Request boost not found.' });
    }
    if (payment.status !== 'awaiting_payment') {
      return res.status(400).json({ error: 'This request boost is no longer awaiting payment.' });
    }
    if (payment.paypal_order_id) {
      return res.status(200).json({ success: true, orderId: payment.paypal_order_id });
    }

    const amount = Number(payment.amount).toFixed(2);
    const order = await callPayPal(PAYPAL_ORDER_API, {
      method: 'POST',
      requestId: randomUUID(),
      body: {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: payment.id,
          custom_id: payment.service_request_id,
          description: `${payment.urgency === 'urgent' ? 'Urgent' : 'High'} priority service request boost`,
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

    const { data: updatedPayment, error: updateError } = await db
      .from('service_request_urgency_payments')
      .update({
        paypal_order_id: order.id,
        terms_accepted_at: new Date().toISOString(),
      })
      .eq('id', payment.id)
      .eq('status', 'awaiting_payment')
      .select('id')
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updatedPayment) {
      return res.status(409).json({ error: 'This request boost is no longer available.' });
    }

    return res.status(200).json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Service request urgency PayPal order creation failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to start PayPal checkout.' });
  }
}
