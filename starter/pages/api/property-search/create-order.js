import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { callPayPal, PAYPAL_ORDER_API } from '@/lib/paypal';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';

const PRICE_BY_CURRENCY = {
  USD: '9.99',
  JMD: '2500.00',
};

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const resolved = await requireDbUser(req, res, { createIfMissing: true });
  if (!resolved) return;
  if (resolved.user.account_type !== 'regular') {
    return res.status(403).json({ error: 'A regular account is required to complete this payment.' });
  }

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'property-search-create-order',
    maxRequests: 5,
    windowMs: 60_000,
    identifier: resolved.user.id,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many payment attempts. Try again shortly.' });

  const parsed = z.object({ paymentRequestId: z.string().uuid() }).safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'A valid property request is required before payment.' });
  if (!process.env.PAYPAL_CLIENT_SECRET) {
    return res.status(503).json({ error: 'PayPal payments are not configured yet.' });
  }

  const db = getDbClient();
  try {
    const { data: paymentRequest, error: lookupError } = await db
      .from('paid_property_search_requests')
      .select('id, user_id, client_name, request_type, property_type, location, currency, amount, status, service_request_id')
      .eq('id', parsed.data.paymentRequestId)
      .eq('user_id', resolved.user.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!paymentRequest) return res.status(404).json({ error: 'Property request not found.' });
    if (paymentRequest.status !== 'awaiting_payment' || !paymentRequest.service_request_id) {
      return res.status(400).json({ error: 'This property request is not awaiting payment.' });
    }

    const expectedAmount = PRICE_BY_CURRENCY[paymentRequest.currency];
    if (!expectedAmount || Number(paymentRequest.amount).toFixed(2) !== expectedAmount) {
      throw new Error('The saved property request has an invalid payment amount or currency.');
    }

    const order = await callPayPal(PAYPAL_ORDER_API, {
      method: 'POST',
      requestId: randomUUID(),
      body: {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: paymentRequest.id,
          custom_id: resolved.user.id,
          description: 'Dosnine property search and owner connection service',
          amount: {
            currency_code: paymentRequest.currency,
            value: expectedAmount,
          },
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

    const { error: updateError } = await db
      .from('paid_property_search_requests')
      .update({ paypal_order_id: order.id })
      .eq('id', paymentRequest.id)
      .eq('user_id', resolved.user.id)
      .eq('status', 'awaiting_payment');
    if (updateError) throw updateError;

    return res.status(200).json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Property search PayPal order creation failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to start PayPal checkout.' });
  }
}
