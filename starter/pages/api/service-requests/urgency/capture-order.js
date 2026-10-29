import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { getDbClient } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { callPayPal, PAYPAL_ORDER_API } from '@/lib/paypal';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';

const schema = z.object({
  paymentId: z.string().uuid(),
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

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'service-request-urgency-capture-order',
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many payment confirmations. Try again shortly.' });

  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'A valid PayPal order is required.' });

  const db = getDbClient();
  try {
    const { data: payment, error: lookupError } = await db
      .from('service_request_urgency_payments')
      .select('id, service_request_id, urgency, amount, status, token_hash, paypal_order_id, paypal_capture_id')
      .eq('id', parsed.data.paymentId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!payment || !isValidToken(parsed.data.token, payment.token_hash)) {
      return res.status(404).json({ error: 'Request boost not found.' });
    }
    if (payment.status === 'paid' && payment.paypal_order_id === parsed.data.orderId) {
      return res.status(200).json({
        success: true,
        requestId: payment.service_request_id,
        message: 'Your request priority is confirmed.',
      });
    }
    if (payment.status !== 'awaiting_payment' || payment.paypal_order_id !== parsed.data.orderId) {
      return res.status(400).json({ error: 'This PayPal order is no longer available.' });
    }

    const expectedAmount = Number(payment.amount).toFixed(2);
    const capture = await callPayPal(
      `${PAYPAL_ORDER_API}/${encodeURIComponent(payment.paypal_order_id)}/capture`,
      { method: 'POST', requestId: `${payment.paypal_order_id}-capture`, body: {} }
    );
    const purchaseUnit = capture.purchase_units?.[0];
    const capturedPayment = purchaseUnit?.payments?.captures?.[0];
    const orderIsValid = capture.id === payment.paypal_order_id &&
      capture.status === 'COMPLETED' &&
      purchaseUnit?.reference_id === payment.id &&
      purchaseUnit?.custom_id === payment.service_request_id &&
      purchaseUnit?.amount?.currency_code === 'USD' &&
      purchaseUnit?.amount?.value === expectedAmount &&
      capturedPayment?.status === 'COMPLETED' &&
      capturedPayment?.amount?.currency_code === 'USD' &&
      capturedPayment?.amount?.value === expectedAmount &&
      Boolean(capturedPayment?.id);

    if (!orderIsValid) {
      console.error('PayPal request urgency payment did not match expected order details:', {
        orderId: capture.id,
        paymentId: payment.id,
      });
      return res.status(402).json({ error: `PayPal did not confirm the expected US$${expectedAmount} payment.` });
    }

    const { error: completionError } = await db.rpc(
      'complete_paid_service_request_urgency',
      {
        p_payment_id: payment.id,
        p_capture_id: capturedPayment.id,
      }
    );
    if (completionError) throw completionError;

    return res.status(200).json({
      success: true,
      requestId: payment.service_request_id,
      message: 'Your request priority is confirmed.',
    });
  } catch (error) {
    console.error('Service request urgency PayPal payment capture failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to confirm payment.' });
  }
}
