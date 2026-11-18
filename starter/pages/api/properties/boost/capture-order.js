import { z } from 'zod';
import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { callPayPal, PAYPAL_ORDER_API } from '@/lib/paypal';
import { canManageProperties } from '@/lib/rbac';

const USD_TO_JMD = 155;
const schema = z.object({ orderId: z.string().min(1).max(64) });

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const resolved = await requireDbUser(req, res, { createIfMissing: true });
  if (!resolved) return;
  if (!canManageProperties(resolved.user)) {
    return res.status(403).json({ error: 'A verified homeowner or agent account is required to boost properties.' });
  }
  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'property-boost-capture-order',
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
  try {
    const { error: expiryError } = await db.rpc('expire_property_boosts');
    if (expiryError) throw expiryError;

    const { data: payment, error: paymentError } = await db
      .from('property_boost_orders')
      .select('id, property_id, paypal_order_id, expected_amount_jmd, status, expires_at')
      .eq('paypal_order_id', parsed.data.orderId)
      .eq('owner_id', resolved.user.id)
      .maybeSingle();
    if (paymentError) throw paymentError;
    if (!payment) return res.status(404).json({ error: 'Property boost order not found.' });
    if (payment.status === 'completed') {
      return res.status(200).json({ success: true, message: 'Property boost is already active.' });
    }
    if (payment.status !== 'awaiting_payment' || new Date(payment.expires_at).getTime() <= Date.now()) {
      return res.status(400).json({ error: 'This property boost order has expired.' });
    }

    const { data: property, error: propertyError } = await db
      .from('properties')
      .select('id, owner_id, status')
      .eq('id', payment.property_id)
      .eq('owner_id', resolved.user.id)
      .maybeSingle();
    if (propertyError) throw propertyError;
    if (!property) return res.status(404).json({ error: 'Property not found.' });
    if (['sold', 'rented', 'leased'].includes(String(property.status || '').toLowerCase())) {
      return res.status(409).json({ error: 'Sold or rented properties cannot be boosted.' });
    }

    const expectedAmountJmd = Number(payment.expected_amount_jmd);
    if (!Number.isSafeInteger(expectedAmountJmd) || expectedAmountJmd < 1) {
      return res.status(503).json({ error: 'Property boost pricing for this order is unavailable.' });
    }
    const expectedUsd = (expectedAmountJmd / USD_TO_JMD).toFixed(2);
    const order = await callPayPal(`${PAYPAL_ORDER_API}/${encodeURIComponent(parsed.data.orderId)}/capture`, {
      method: 'POST',
      requestId: `${parsed.data.orderId}-capture`,
      body: {},
    });
    const purchaseUnit = order.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    const validPayment = order.id === parsed.data.orderId &&
      order.status === 'COMPLETED' &&
      purchaseUnit?.reference_id === resolved.user.id &&
      purchaseUnit?.custom_id === `${resolved.user.id}:property-boost` &&
      purchaseUnit?.amount?.currency_code === 'USD' &&
      purchaseUnit?.amount?.value === expectedUsd &&
      capture?.status === 'COMPLETED' &&
      capture?.amount?.currency_code === 'USD' &&
      capture?.amount?.value === expectedUsd &&
      Boolean(capture?.id);
    if (!validPayment) {
      return res.status(402).json({ error: 'PayPal did not confirm the expected property boost payment.' });
    }

    const { data: boostId, error: completionError } = await db.rpc('complete_property_boost_order', {
      p_owner_id: resolved.user.id,
      p_paypal_order_id: parsed.data.orderId,
      p_paypal_capture_id: capture.id,
    });
    if (completionError) {
      console.error('PayPal captured a property boost payment but activation failed:', {
        orderId: payment.id,
        captureId: capture.id,
        error: completionError,
      });
      return res.status(500).json({
        error: `Payment was captured but the boost could not be activated. Contact support with PayPal capture ID ${capture.id}.`,
      });
    }

    const { data: boost, error: boostError } = await db
      .from('property_boosts')
      .select('property_id, boost_end_date, boost_source')
      .eq('id', boostId)
      .single();
    if (boostError) throw boostError;
    return res.status(200).json({ success: true, boost });
  } catch (error) {
    console.error('Property boost PayPal capture failed:', error);
    return res.status(500).json({ error: 'Unable to confirm property boost payment.' });
  }
}
