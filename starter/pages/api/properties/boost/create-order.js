import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { callPayPal, PAYPAL_ORDER_API } from '@/lib/paypal';
import { canManageProperties } from '@/lib/rbac';

const USD_TO_JMD = 155;
const schema = z.object({ propertyId: z.string().uuid() });

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const resolved = await requireDbUser(req, res, { createIfMissing: true });
  if (!resolved) return;
  if (!canManageProperties(resolved.user)) {
    return res.status(403).json({ error: 'A verified homeowner or agent account is required to boost properties.' });
  }
  if (!process.env.PAYPAL_CLIENT_SECRET) {
    return res.status(503).json({ error: 'PayPal payments are not configured yet.' });
  }

  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'A valid property is required.' });
  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'property-boost-create-order',
    maxRequests: 5,
    windowMs: 60_000,
    identifier: resolved.user.id,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many boost payment attempts. Try again shortly.' });

  const db = getDbClient();
  try {
    const { error: expiryError } = await db.rpc('expire_property_boosts');
    if (expiryError) throw expiryError;

    const { data: property, error: propertyError } = await db
      .from('properties')
      .select('id, owner_id, status')
      .eq('id', parsed.data.propertyId)
      .eq('owner_id', resolved.user.id)
      .maybeSingle();
    if (propertyError) throw propertyError;
    if (!property) return res.status(404).json({ error: 'Property not found.' });
    if (['sold', 'rented', 'leased'].includes(String(property.status || '').toLowerCase())) {
      return res.status(409).json({ error: 'Sold or rented properties cannot be boosted.' });
    }

    const { data: activeBoost, error: activeBoostError } = await db
      .from('property_boosts')
      .select('id')
      .eq('property_id', property.id)
      .eq('status', 'active')
      .gt('boost_end_date', new Date().toISOString())
      .maybeSingle();
    if (activeBoostError) throw activeBoostError;
    if (activeBoost) return res.status(409).json({ error: 'This property already has an active boost.' });

    const { data: pendingOrder, error: pendingOrderError } = await db
      .from('property_boost_orders')
      .select('paypal_order_id')
      .eq('property_id', property.id)
      .eq('owner_id', resolved.user.id)
      .eq('status', 'awaiting_payment')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (pendingOrderError) throw pendingOrderError;
    if (pendingOrder) {
      return res.status(200).json({ success: true, orderId: pendingOrder.paypal_order_id });
    }

    const { data: priceSetting, error: priceError } = await db
      .from('site_settings')
      .select('value')
      .eq('key', 'property_boost_price')
      .maybeSingle();
    if (priceError) throw priceError;
    const boostPriceJmd = Number(priceSetting?.value ?? 500);
    if (!Number.isSafeInteger(boostPriceJmd) || boostPriceJmd < 1 || boostPriceJmd > 10000000) {
      return res.status(503).json({ error: 'Property boost pricing is not configured.' });
    }

    const order = await callPayPal(PAYPAL_ORDER_API, {
      method: 'POST',
      requestId: randomUUID(),
      body: {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: resolved.user.id,
          custom_id: `${resolved.user.id}:property-boost`,
          description: 'Dosnine 30-day property visibility boost',
          amount: {
            currency_code: 'USD',
            value: (boostPriceJmd / USD_TO_JMD).toFixed(2),
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
      throw new Error('PayPal did not create a valid property boost order.');
    }

    const { error: insertError } = await db.from('property_boost_orders').insert({
      property_id: property.id,
      owner_id: resolved.user.id,
      paypal_order_id: order.id,
      expected_amount_jmd: boostPriceJmd,
      status: 'awaiting_payment',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
    if (insertError) {
      if (insertError.code === '23505') {
        const { data: existingOrder, error: existingOrderError } = await db
          .from('property_boost_orders')
          .select('paypal_order_id')
          .eq('property_id', property.id)
          .eq('owner_id', resolved.user.id)
          .eq('status', 'awaiting_payment')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();
        if (existingOrderError) throw existingOrderError;
        if (existingOrder) return res.status(200).json({ success: true, orderId: existingOrder.paypal_order_id });
      }
      throw insertError;
    }

    return res.status(200).json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Property boost PayPal order creation failed:', error);
    return res.status(500).json({ error: 'Unable to start property boost checkout.' });
  }
}
