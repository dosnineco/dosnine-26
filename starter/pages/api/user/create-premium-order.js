import { randomUUID } from 'node:crypto';
import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { callPayPal, PAYPAL_ORDER_API } from '@/lib/paypal';

const USD_TO_JMD = 155;

function isJmdAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) &&
    amount > 0 &&
    amount <= 10000000 &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-8;
}

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const resolved = await requireDbUser(req, res);
  if (!resolved) return;
  if (resolved.user.account_type !== 'regular') {
    return res.status(403).json({ error: 'Premium access is available to regular accounts only.' });
  }
  if (!process.env.PAYPAL_CLIENT_SECRET) {
    return res.status(503).json({ error: 'PayPal payments are not configured yet.' });
  }

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'premium-upgrade-create-order',
    maxRequests: 5,
    windowMs: 60_000,
    identifier: resolved.user.id,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many payment attempts. Try again shortly.' });

  const db = getDbClient();
  try {
    const { data: priceSetting, error: priceError } = await db
      .from('site_settings')
      .select('value')
      .eq('key', 'premium_service_price')
      .maybeSingle();
    if (priceError) throw priceError;
    const premiumPriceJmd = Number(priceSetting?.value ?? 3178.4);
    if (!isJmdAmount(premiumPriceJmd)) {
      return res.status(503).json({ error: 'Premium pricing is not configured.' });
    }
    const normalizedPriceJmd = Number(premiumPriceJmd.toFixed(2));

    const order = await callPayPal(PAYPAL_ORDER_API, {
      method: 'POST',
      requestId: randomUUID(),
      body: {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: resolved.user.id,
          custom_id: `${resolved.user.id}:premium-30-day`,
          description: 'Dosnine 30-day premium access',
          amount: {
            currency_code: 'USD',
            value: (normalizedPriceJmd / USD_TO_JMD).toFixed(2),
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

    const { error } = await db
      .from('users')
      .update({
        premium_service_request_order_id: order.id,
        premium_service_request_order_amount: normalizedPriceJmd,
      })
      .eq('id', resolved.user.id);
    if (error) throw error;

    return res.status(200).json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Premium PayPal order creation failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to start PayPal checkout.' });
  }
}
