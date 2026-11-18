import { z } from 'zod';
import { getDbClient, isAdvertiserAccount, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { callPayPal, PAYPAL_ORDER_API } from '@/lib/paypal';

const schema = z.object({ submissionId: z.string().uuid(), orderId: z.string().min(1).max(64) });
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
  if (!parsed.success) return res.status(400).json({ error: 'A valid advertisement payment is required.' });
  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'sponsor-paypal-capture-order',
    maxRequests: 10,
    windowMs: 60_000,
    identifier: resolved.user.id,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many payment confirmations. Try again shortly.' });

  const db = getDbClient();
  try {
    const { data: submission, error: submissionError } = await db
      .from('sponsor_submissions')
      .select('id, amount, status, payment_status, created_by_clerk_id, paypal_order_id, paypal_capture_id')
      .eq('id', parsed.data.submissionId)
      .eq('created_by_clerk_id', resolved.clerkId)
      .maybeSingle();
    if (submissionError) throw submissionError;
    if (!submission) return res.status(404).json({ error: 'Advertisement submission not found.' });
    if (
      submission.payment_status === 'paid' &&
      submission.paypal_order_id === parsed.data.orderId &&
      submission.paypal_capture_id
    ) {
      return res.status(200).json({ success: true, paymentStatus: 'paid', status: submission.status });
    }
    if (submission.status !== 'pending_payment' || submission.paypal_order_id !== parsed.data.orderId) {
      return res.status(400).json({ error: 'This PayPal order is no longer available.' });
    }

    const amountJmd = Number(submission.amount);
    if (!Number.isSafeInteger(amountJmd) || amountJmd < 1) {
      return res.status(503).json({ error: 'Advertisement pricing for this order is invalid.' });
    }
    const expectedUsd = (amountJmd / JMD_PER_USD).toFixed(2);
    const order = await callPayPal(
      `${PAYPAL_ORDER_API}/${encodeURIComponent(parsed.data.orderId)}/capture`,
      { method: 'POST', requestId: `${parsed.data.orderId}-capture`, body: {} }
    );
    const purchaseUnit = order.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    const isValid = order.id === parsed.data.orderId &&
      order.status === 'COMPLETED' &&
      purchaseUnit?.reference_id === submission.id &&
      purchaseUnit?.custom_id === resolved.clerkId &&
      purchaseUnit?.amount?.currency_code === 'USD' &&
      purchaseUnit?.amount?.value === expectedUsd &&
      capture?.status === 'COMPLETED' &&
      capture?.amount?.currency_code === 'USD' &&
      capture?.amount?.value === expectedUsd &&
      Boolean(capture?.id);
    if (!isValid) {
      return res.status(402).json({ error: 'PayPal did not confirm the expected advertisement payment.' });
    }

    const { data: updated, error: updateError } = await db
      .from('sponsor_submissions')
      .update({ payment_status: 'paid', status: 'pending_review', paypal_capture_id: capture.id })
      .eq('id', submission.id)
      .eq('created_by_clerk_id', resolved.clerkId)
      .eq('paypal_order_id', parsed.data.orderId)
      .eq('status', 'pending_payment')
      .is('payment_receipt_submitted_at', null)
      .select('id')
      .maybeSingle();
    if (updateError) {
      if (updateError.code === '23505') {
        return res.status(409).json({ error: 'This PayPal payment has already been used.' });
      }
      throw updateError;
    }
    if (!updated) {
      return res.status(409).json({ error: 'The submission changed while payment was processing. Contact support with your PayPal receipt.' });
    }

    return res.status(200).json({ success: true, paymentStatus: 'paid', status: 'pending_review' });
  } catch (error) {
    console.error('Sponsor PayPal capture failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to confirm advertisement payment.' });
  }
}
