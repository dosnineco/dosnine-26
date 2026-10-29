import { z } from 'zod';
import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { callPayPal, PAYPAL_ORDER_API } from '@/lib/paypal';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';

const PRICE_BY_CURRENCY = {
  USD: '9.99',
  JMD: '2500.00',
};

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const resolved = await requireDbUser(req, res, { createIfMissing: true });
  if (!resolved) return;
  if (resolved.user.account_type !== 'regular') {
    return res.status(403).json({ error: 'A regular account is required to complete this payment.' });
  }

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'property-search-capture-order',
    maxRequests: 10,
    windowMs: 60_000,
    identifier: resolved.user.id,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many payment confirmations. Try again shortly.' });

  const parsed = z.object({ orderId: z.string().min(1).max(64) }).safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'PayPal order ID is required.' });

  const db = getDbClient();
  try {
    const { data: searchRequest, error: lookupError } = await db
      .from('paid_property_search_requests')
      .select('id, user_id, status, paypal_order_id, service_request_id, amount, currency')
      .eq('paypal_order_id', parsed.data.orderId)
      .eq('user_id', resolved.user.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!searchRequest) return res.status(404).json({ error: 'Payment request not found.' });
    if (searchRequest.status === 'paid' && searchRequest.service_request_id) {
      return res.status(200).json({
        success: true,
        requestId: searchRequest.service_request_id,
        message: 'Your property search request is confirmed.',
      });
    }
    if (searchRequest.status !== 'awaiting_payment') {
      return res.status(400).json({ error: 'This payment request is no longer available.' });
    }
    if (!searchRequest.service_request_id) {
      return res.status(409).json({ error: 'Create the property request before completing payment.' });
    }

    const expectedAmount = PRICE_BY_CURRENCY[searchRequest.currency];
    if (!expectedAmount || Number(searchRequest.amount).toFixed(2) !== expectedAmount) {
      throw new Error('The saved property request has an invalid payment amount or currency.');
    }

    const capture = await callPayPal(`${PAYPAL_ORDER_API}/${encodeURIComponent(searchRequest.paypal_order_id)}/capture`, {
      method: 'POST',
      requestId: `${searchRequest.paypal_order_id}-capture`,
      body: {},
    });

    const purchaseUnit = capture.purchase_units?.[0];
    const capturedPayment = purchaseUnit?.payments?.captures?.[0];
    const orderIsValid = capture.id === searchRequest.paypal_order_id &&
      capture.status === 'COMPLETED' &&
      purchaseUnit?.reference_id === searchRequest.id &&
      purchaseUnit?.custom_id === resolved.user.id &&
      purchaseUnit?.amount?.currency_code === searchRequest.currency &&
      purchaseUnit?.amount?.value === expectedAmount &&
      capturedPayment?.status === 'COMPLETED' &&
      capturedPayment?.amount?.currency_code === searchRequest.currency &&
      capturedPayment?.amount?.value === expectedAmount &&
      Boolean(capturedPayment?.id);

    if (!orderIsValid) {
      console.error('PayPal property search payment did not match expected order details:', {
        orderId: capture.id,
        status: capture.status,
        searchRequestId: searchRequest.id,
      });
      return res.status(402).json({ error: `PayPal did not confirm the expected ${expectedAmount} ${searchRequest.currency} payment.` });
    }

    const { data: serviceRequestId, error: completionError } = await db.rpc(
      'complete_paid_property_search_request',
      {
        search_request_id: searchRequest.id,
        payment_capture_id: capturedPayment.id,
      }
    );
    if (completionError) throw completionError;
    if (!serviceRequestId) throw new Error('Payment was captured, but the service request could not be confirmed.');

    return res.status(200).json({
      success: true,
      requestId: serviceRequestId,
      message: 'Your property search request is confirmed.',
    });
  } catch (error) {
    console.error('Property search PayPal payment capture failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to confirm payment.' });
  }
}
