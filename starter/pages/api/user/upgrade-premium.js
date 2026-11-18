import { z } from 'zod';
import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { callPayPal, PAYPAL_ORDER_API } from '@/lib/paypal';

const schema = z.object({ orderId: z.string().min(1).max(64) });
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

  try {
    const resolved = await requireDbUser(req, res);
    if (!resolved) return;
    if (resolved.user.account_type !== 'regular') {
      return res.status(403).json({ error: 'Premium access is available to regular accounts only.' });
    }

    const rate = await enforceRateLimitDistributed(req, res, {
      keyPrefix: 'premium-upgrade-confirm',
      maxRequests: 5,
      windowMs: 60_000,
      identifier: resolved.user.id,
    });
    if (!rate.allowed) return res.status(429).json({ error: 'Too many payment confirmations. Try again shortly.' });

    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'A valid PayPal order is required.' });
    if (!process.env.PAYPAL_CLIENT_SECRET) {
      return res.status(503).json({ error: 'PayPal payments are not configured yet.' });
    }

    const db = getDbClient();
    const { data: currentUser, error: currentUserError } = await db
      .from('users')
      .select('premium_service_request_order_id, premium_service_request_order_amount, premium_service_request_payment_id, premium_service_request_expires')
      .eq('id', resolved.user.id)
      .single();
    if (currentUserError) throw currentUserError;
    if (currentUser.premium_service_request_payment_id && currentUser.premium_service_request_order_id === parsed.data.orderId) {
      return res.status(200).json({
        success: true,
        message: 'Premium access is already active for this payment.',
        expiresAt: currentUser.premium_service_request_expires,
      });
    }
    if (currentUser.premium_service_request_order_id !== parsed.data.orderId) {
      return res.status(400).json({ error: 'This PayPal order is no longer available.' });
    }

    const order = await callPayPal(`${PAYPAL_ORDER_API}/${encodeURIComponent(parsed.data.orderId)}/capture`, {
      method: 'POST',
      requestId: `${parsed.data.orderId}-capture`,
      body: {},
    });
    const purchaseUnit = order.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    const premiumPriceJmd = Number(currentUser.premium_service_request_order_amount);
    if (!isJmdAmount(premiumPriceJmd)) {
      return res.status(503).json({ error: 'Premium pricing for this order is unavailable.' });
    }
    const expectedUsd = (Number(premiumPriceJmd.toFixed(2)) / USD_TO_JMD).toFixed(2);
    const validPayment = order.id === parsed.data.orderId &&
      order.status === 'COMPLETED' &&
      purchaseUnit?.reference_id === resolved.user.id &&
      purchaseUnit?.custom_id === `${resolved.user.id}:premium-30-day` &&
      purchaseUnit?.amount?.currency_code === 'USD' &&
      purchaseUnit?.amount?.value === expectedUsd &&
      capture?.status === 'COMPLETED' &&
      capture?.amount?.currency_code === 'USD' &&
      capture?.amount?.value === expectedUsd &&
      Boolean(capture?.id);

    if (!validPayment) {
      return res.status(402).json({ error: `PayPal did not confirm the expected J$${premiumPriceJmd.toLocaleString('en-JM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} premium payment.` });
    }

    if (currentUser.premium_service_request_payment_id === capture.id) {
      return res.status(200).json({
        success: true,
        message: 'Premium access is already active for this payment.',
        expiresAt: currentUser.premium_service_request_expires,
      });
    }

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    const { error } = await db
      .from('users')
      .update({
        premium_service_request: true,
        premium_service_request_expires: expirationDate.toISOString(),
        premium_service_request_payment_id: capture.id,
      })
      .eq('id', resolved.user.id)
      .eq('premium_service_request_order_id', parsed.data.orderId);

    if (error) {
      console.error('Error upgrading user:', error);
      if (error.code === '23505') {
        return res.status(409).json({ error: 'This PayPal payment has already been used.' });
      }
      return res.status(500).json({ error: 'Failed to upgrade user' });
    }

    return res.status(200).json({
      success: true,
      message: 'Premium access activated after payment verification.',
      expiresAt: expirationDate.toISOString(),
    });
  } catch (error) {
    console.error('Upgrade premium error:', error);
    return res.status(500).json({ error: 'Failed to upgrade premium' });
  }
}
