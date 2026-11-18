import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDbClient, isAdvertiserAccount, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { callPayPal, PAYPAL_ORDER_API } from '@/lib/paypal';

const schema = z.object({ submissionId: z.string().uuid() });
const JMD_PER_USD = 155;

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;
  const resolved = await requireDbUser(req, res);
  if (!resolved) return;
  if (!isAdvertiserAccount(resolved.user)) {
    return res.status(403).json({ error: 'An advertiser account is required for this payment.' });
  }
  if (!process.env.PAYPAL_CLIENT_SECRET) {
    return res.status(503).json({ error: 'PayPal payments are not configured yet.' });
  }

  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'A valid advertisement submission is required.' });
  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'sponsor-paypal-create-order',
    maxRequests: 5,
    windowMs: 60_000,
    identifier: resolved.user.id,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many payment attempts. Try again shortly.' });

  const db = getDbClient();
  try {
    const { data: submission, error: submissionError } = await db
      .from('sponsor_submissions')
      .select('id, amount, status, payment_status, payment_receipt_submitted_at, created_by_clerk_id, paypal_order_id')
      .eq('id', parsed.data.submissionId)
      .eq('created_by_clerk_id', resolved.clerkId)
      .maybeSingle();
    if (submissionError) throw submissionError;
    if (!submission) return res.status(404).json({ error: 'Advertisement submission not found.' });
    if (submission.status !== 'pending_payment' || submission.payment_status === 'paid') {
      return res.status(409).json({ error: 'This advertisement is no longer awaiting payment.' });
    }
    if (submission.payment_receipt_submitted_at) {
      return res.status(409).json({ error: 'A bank-transfer receipt is already under review for this submission.' });
    }

    const amountJmd = Number(submission.amount);
    if (!Number.isSafeInteger(amountJmd) || amountJmd < 1) {
      return res.status(503).json({ error: 'Advertisement pricing is invalid.' });
    }
    const usdAmount = (amountJmd / JMD_PER_USD).toFixed(2);
    const order = await callPayPal(PAYPAL_ORDER_API, {
      method: 'POST',
      requestId: randomUUID(),
      body: {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: submission.id,
          custom_id: resolved.clerkId,
          description: 'Dosnine advertisement campaign',
          amount: { currency_code: 'USD', value: usdAmount },
        }],
        application_context: {
          brand_name: 'Dosnine',
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
        },
      },
    });
    if (!order.id || order.status !== 'CREATED') throw new Error('PayPal did not create a valid order.');

    const { error: saveError } = await db
      .from('sponsor_submissions')
      .update({ paypal_order_id: order.id })
      .eq('id', submission.id)
      .eq('created_by_clerk_id', resolved.clerkId)
      .eq('status', 'pending_payment');
    if (saveError) throw saveError;

    return res.status(200).json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Sponsor PayPal order creation failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to start PayPal checkout.' });
  }
}
