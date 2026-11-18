import { z } from 'zod';
import { getDbClient, requireAgentAccountUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { callPayPal, PAYPAL_ORDER_API } from '@/lib/paypal';

const schema = z.object({ orderId: z.string().min(1).max(64) });
const PLAN_DURATIONS = { '7-day': 7, '30-day': 30, '90-day': 90 };
const USD_TO_JMD = 155;

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const resolved = await requireAgentAccountUser(req, res);
  if (!resolved) return;
  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'agent-plan-capture-order',
    maxRequests: 10,
    windowMs: 60_000,
    identifier: resolved.user.id,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many payment confirmations. Try again shortly.' });

  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'A valid PayPal order is required.' });

  const db = getDbClient();
  try {
    const { data: agent, error: agentError } = await db
      .from('agents')
      .select('id, verification_status, paypal_order_id, paypal_order_amount, paypal_capture_id, payment_receipt_status')
      .eq('user_id', resolved.user.id)
      .maybeSingle();
    if (agentError) throw agentError;
    if (!agent) return res.status(404).json({ error: 'Agent profile not found.' });
    if (agent.verification_status !== 'approved') {
      return res.status(403).json({ error: 'Your agent profile must be approved before payment.' });
    }
    if (agent.paypal_capture_id && agent.paypal_order_id === parsed.data.orderId) {
      return res.status(200).json({ success: true, message: 'Your agent plan is already active.' });
    }
    if (!agent.paypal_order_id || agent.paypal_order_id !== parsed.data.orderId) {
      return res.status(400).json({ error: 'This PayPal order is no longer available.' });
    }
    if (agent.payment_receipt_status !== 'paypal_pending') {
      return res.status(409).json({ error: 'The payment method changed while checkout was processing. This PayPal order will not be captured.' });
    }

    const capture = await callPayPal(
      `${PAYPAL_ORDER_API}/${encodeURIComponent(agent.paypal_order_id)}/capture`,
      { method: 'POST', requestId: `${agent.paypal_order_id}-capture`, body: {} }
    );
    const purchaseUnit = capture.purchase_units?.[0];
    const capturedPayment = purchaseUnit?.payments?.captures?.[0];
    const customId = String(purchaseUnit?.custom_id || '');
    const plan = customId.startsWith(`${agent.id}:`) ? customId.slice(agent.id.length + 1) : '';
    if (!PLAN_DURATIONS[plan]) {
      return res.status(402).json({ error: 'The PayPal order is not linked to a valid agent plan.' });
    }

    const planPriceJmd = Number(agent.paypal_order_amount);
    if (!Number.isSafeInteger(planPriceJmd) || planPriceJmd < 1) {
      return res.status(503).json({ error: 'Agent plan pricing for this order is unavailable.' });
    }
    const expectedUsd = (planPriceJmd / USD_TO_JMD).toFixed(2);
    const validPayment = capture.id === agent.paypal_order_id &&
      capture.status === 'COMPLETED' &&
      purchaseUnit?.reference_id === agent.id &&
      purchaseUnit?.custom_id === `${agent.id}:${plan}` &&
      purchaseUnit?.amount?.currency_code === 'USD' &&
      purchaseUnit?.amount?.value === expectedUsd &&
      capturedPayment?.status === 'COMPLETED' &&
      capturedPayment?.amount?.currency_code === 'USD' &&
      capturedPayment?.amount?.value === expectedUsd &&
      Boolean(capturedPayment?.id);
    if (!validPayment) {
      console.error('Agent plan PayPal payment did not match expected order details:', {
        orderId: capture.id,
        agentId: agent.id,
      });
      return res.status(402).json({ error: 'PayPal did not confirm the expected agent-plan payment.' });
    }

    const now = new Date();
    const expiry = new Date(now.getTime() + PLAN_DURATIONS[plan] * 24 * 60 * 60 * 1000);
    const { data: updated, error: updateError } = await db
      .from('agents')
      .update({
        payment_status: plan,
        payment_amount: planPriceJmd,
        payment_date: now.toISOString(),
        access_expiry: expiry.toISOString(),
        paypal_capture_id: capturedPayment.id,
        payment_receipt_status: 'none',
      })
      .eq('id', agent.id)
      .eq('user_id', resolved.user.id)
      .eq('paypal_order_id', agent.paypal_order_id)
      .eq('payment_receipt_status', 'paypal_pending')
      .select('id')
      .maybeSingle();
    if (updateError) {
      if (updateError.code === '23505') {
        return res.status(409).json({ error: 'This PayPal payment has already been used.' });
      }
      throw updateError;
    }
    if (!updated) {
      return res.status(409).json({ error: 'The payment method changed while checkout was processing. Contact support with your PayPal receipt.' });
    }

    return res.status(200).json({
      success: true,
      plan,
      amountJmd: planPriceJmd,
      expiresAt: expiry.toISOString(),
    });
  } catch (error) {
    console.error('Agent plan PayPal capture failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to confirm payment.' });
  }
}
