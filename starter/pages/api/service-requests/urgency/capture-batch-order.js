import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { callPayPal, PAYPAL_ORDER_API } from '@/lib/paypal';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';

const schema = z.object({
  boostId: z.string().uuid(),
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  orderId: z.string().min(1).max(64),
});

function isValidToken(token, tokenHash) {
  const expected = Buffer.from(tokenHash || '', 'hex');
  const actual = createHash('sha256').update(token).digest();
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const resolved = await requireDbUser(req, res, { createIfMissing: true });
  if (!resolved) return;
  if (resolved.user.account_type !== 'regular') {
    return res.status(403).json({ error: 'A regular account is required to complete this payment.' });
  }

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'buyer-request-priority-capture-order',
    maxRequests: 10,
    windowMs: 60_000,
    identifier: resolved.user.id,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many payment confirmations. Try again shortly.' });

  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'A valid PayPal order is required.' });

  const db = getDbClient();
  try {
    const { data: batch, error: lookupError } = await db
      .from('service_request_urgency_boost_batches')
      .select('id, client_user_id, service_request_ids, urgency, amount, status, token_hash, paypal_order_id, paypal_capture_id, expires_at')
      .eq('id', parsed.data.boostId)
      .eq('client_user_id', resolved.user.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!batch || !isValidToken(parsed.data.token, batch.token_hash)) {
      return res.status(404).json({ error: 'Request boost not found.' });
    }
    if (batch.status === 'paid' && batch.paypal_order_id === parsed.data.orderId) {
      return res.status(200).json({
        success: true,
        requestIds: batch.service_request_ids,
        message: 'Your request priority is confirmed.',
      });
    }
    if (
      batch.status !== 'awaiting_payment' ||
      batch.paypal_order_id !== parsed.data.orderId ||
      new Date(batch.expires_at) <= new Date()
    ) {
      return res.status(400).json({ error: 'This PayPal order is no longer available.' });
    }

    const expectedAmount = Number(batch.amount).toFixed(2);
    const capture = await callPayPal(
      `${PAYPAL_ORDER_API}/${encodeURIComponent(batch.paypal_order_id)}/capture`,
      { method: 'POST', requestId: `${batch.paypal_order_id}-capture`, body: {} }
    );
    const purchaseUnit = capture.purchase_units?.[0];
    const capturedPayment = purchaseUnit?.payments?.captures?.[0];
    const orderIsValid = capture.id === batch.paypal_order_id &&
      capture.status === 'COMPLETED' &&
      purchaseUnit?.reference_id === batch.id &&
      purchaseUnit?.custom_id === resolved.user.id &&
      purchaseUnit?.amount?.currency_code === 'USD' &&
      purchaseUnit?.amount?.value === expectedAmount &&
      capturedPayment?.status === 'COMPLETED' &&
      capturedPayment?.amount?.currency_code === 'USD' &&
      capturedPayment?.amount?.value === expectedAmount &&
      Boolean(capturedPayment?.id);

    if (!orderIsValid) {
      console.error('PayPal request priority batch did not match expected order details:', {
        orderId: capture.id,
        boostId: batch.id,
      });
      return res.status(402).json({ error: `PayPal did not confirm the expected US$${expectedAmount} payment.` });
    }

    const { data: completed, error: completionError } = await db.rpc(
      'complete_paid_service_request_urgency_boost_batch',
      {
        p_batch_id: batch.id,
        p_capture_id: capturedPayment.id,
      }
    );
    if (completionError) throw completionError;
    if (!completed) throw new Error('Payment was captured, but request priority could not be confirmed.');

    return res.status(200).json({
      success: true,
      requestIds: batch.service_request_ids,
      message: 'Your request priority is confirmed.',
    });
  } catch (error) {
    console.error('Buyer request priority PayPal payment capture failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to confirm payment.' });
  }
}
