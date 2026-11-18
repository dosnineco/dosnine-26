import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDbClient, requireAgentAccountUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { callPayPal, PAYPAL_ORDER_API } from '@/lib/paypal';

const schema = z.object({ plan: z.enum(['7-day', '30-day', '90-day']) });
const USD_TO_JMD = 155;

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const resolved = await requireAgentAccountUser(req, res);
  if (!resolved) return;
  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'agent-plan-create-order',
    maxRequests: 5,
    windowMs: 60_000,
    identifier: resolved.user.id,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many payment attempts. Try again shortly.' });

  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Choose a valid agent access plan.' });
  if (!process.env.PAYPAL_CLIENT_SECRET) {
    return res.status(503).json({ error: 'PayPal payments are not configured yet.' });
  }

  const db = getDbClient();
  try {
    const { data: agent, error: agentError } = await db
      .from('agents')
      .select('id, verification_status, payment_receipt_status')
      .eq('user_id', resolved.user.id)
      .maybeSingle();
    if (agentError) throw agentError;
    if (!agent) return res.status(404).json({ error: 'Agent profile not found.' });
    if (agent.verification_status !== 'approved') {
      return res.status(403).json({ error: 'Your agent profile must be approved before payment.' });
    }
    if (agent.payment_receipt_status === 'pending') {
      return res.status(409).json({ error: 'A bank-transfer receipt is already under review for this plan.' });
    }

    const { data: priceSettings, error: priceError } = await db
      .from('site_settings')
      .select('value')
      .eq('key', 'plan_prices')
      .maybeSingle();
    if (priceError) throw priceError;
    const planPriceJmd = Number(priceSettings?.value?.[parsed.data.plan]);
    if (!Number.isSafeInteger(planPriceJmd) || planPriceJmd < 1) {
      return res.status(503).json({ error: 'Agent plan pricing is not configured.' });
    }
    const usdAmount = (planPriceJmd / USD_TO_JMD).toFixed(2);

    const order = await callPayPal(PAYPAL_ORDER_API, {
      method: 'POST',
      requestId: randomUUID(),
      body: {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: agent.id,
          custom_id: `${agent.id}:${parsed.data.plan}`,
          description: `Dosnine ${parsed.data.plan} agent access`,
          amount: { currency_code: 'USD', value: usdAmount },
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

    const { error: saveError } = await db
      .from('agents')
      .update({
        paypal_order_id: order.id,
        paypal_order_amount: planPriceJmd,
        payment_receipt_status: 'paypal_pending',
      })
      .eq('id', agent.id)
      .eq('user_id', resolved.user.id);
    if (saveError) throw saveError;

    return res.status(200).json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Agent plan PayPal order creation failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to start PayPal checkout.' });
  }
}
