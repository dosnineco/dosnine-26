import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { getPayerReference } from '@/lib/paymentReference';
import { getRequestUrgencyJmdAmount } from '@/lib/requestUrgencyPricing';

export const config = { api: { bodyParser: false } };

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function isValidToken(token, tokenHash) {
  const expected = Buffer.from(tokenHash || '', 'hex');
  const actual = createHash('sha256').update(token || '').digest();
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function parseReceipt(req) {
  const formidable = await import('formidable');
  const form = formidable.formidable({ maxFiles: 1, maxFileSize: 5 * 1024 * 1024, maxFields: 5 });
  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) reject(error);
      else resolve({ fields, files });
    });
  });
}

function fieldValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  try {
    const { fields, files } = await parseReceipt(req);
    const sourceType = String(fieldValue(fields.source_type) || '');
    const sourceId = String(fieldValue(fields.source_id) || '').trim();
    const token = String(fieldValue(fields.token) || '');
    const file = Array.isArray(files.receipt) ? files.receipt[0] : files.receipt;
    if (!file) return res.status(400).json({ error: 'Choose a bank transfer receipt image.' });
    const extension = MIME_EXTENSIONS[file.mimetype];
    if (!extension) return res.status(400).json({ error: 'Receipt must be a JPG, PNG, or WebP image.' });

    const db = getDbClient();
    let payment = null;
    let owner = null;

    if (['request_urgency', 'request_urgency_batch'].includes(sourceType)) {
      if (!/^[a-f0-9]{64}$/i.test(token)) {
        return res.status(400).json({ error: 'A valid payment confirmation token is required.' });
      }

      const table = sourceType === 'request_urgency'
        ? 'service_request_urgency_payments'
        : 'service_request_urgency_boost_batches';
      const idColumn = sourceType === 'request_urgency' ? 'id' : 'id';
      const { data: intent, error: intentError } = await db
        .from(table)
        .select(sourceType === 'request_urgency'
          ? 'id, service_request_id, amount, currency, status, token_hash'
          : 'id, client_user_id, service_request_ids, amount, currency, status, token_hash, expires_at')
        .eq(idColumn, sourceId)
        .maybeSingle();
      if (intentError) throw intentError;
      if (!intent || !isValidToken(token, intent.token_hash)) {
        return res.status(404).json({ error: 'Payment request not found.' });
      }
      if (intent.status !== 'awaiting_payment' ||
          (intent.expires_at && new Date(intent.expires_at) <= new Date())) {
        return res.status(409).json({ error: 'This payment request is no longer available.' });
      }
      if (sourceType === 'request_urgency') {
        const { data: request, error: requestError } = await db
          .from('service_requests')
          .select('client_user_id')
          .eq('id', intent.service_request_id)
          .maybeSingle();
        if (requestError) throw requestError;
        if (!request) return res.status(404).json({ error: 'Service request not found.' });
        owner = request.client_user_id;
        payment = {
          amount: getRequestUrgencyJmdAmount(intent.amount),
          currency: 'JMD',
          referenceIds: [intent.service_request_id],
          payerName: null,
          payerEmail: null,
        };
      } else {
        owner = intent.client_user_id;
        payment = {
          amount: getRequestUrgencyJmdAmount(intent.amount),
          currency: 'JMD',
          referenceIds: intent.service_request_ids || [],
          payerName: null,
          payerEmail: null,
        };
      }
    } else {
      const resolved = await requireDbUser(req, res, { createIfMissing: true });
      if (!resolved) return;
      owner = resolved.user.id;

      if (sourceType === 'property_search') {
        const { data: intent, error } = await db
          .from('paid_property_search_requests')
          .select('id, amount, currency, status, service_request_id, user_id')
          .eq('id', sourceId)
          .eq('user_id', owner)
          .maybeSingle();
        if (error) throw error;
        if (!intent) return res.status(404).json({ error: 'Property search payment not found.' });
        if (intent.status !== 'awaiting_payment' || !intent.service_request_id) {
          return res.status(409).json({ error: 'This property search is no longer awaiting payment.' });
        }
        payment = {
          amount: Number(intent.amount),
          currency: intent.currency,
          referenceIds: [intent.service_request_id],
          payerName: resolved.user.full_name,
          payerEmail: resolved.user.email,
        };
      } else if (sourceType === 'premium') {
        if (sourceId !== owner || resolved.user.account_type !== 'regular') {
          return res.status(403).json({ error: 'Premium payment is not available for this account.' });
        }
        const { data: priceSetting, error } = await db
          .from('site_settings')
          .select('value')
          .eq('key', 'premium_service_price')
          .maybeSingle();
        if (error) throw error;
        payment = {
          amount: Number(priceSetting?.value ?? 3178.4),
          currency: 'JMD',
          referenceIds: [owner],
          payerName: resolved.user.full_name,
          payerEmail: resolved.user.email,
        };
      } else if (sourceType === 'property_boost') {
        const { data: property, error: propertyError } = await db
          .from('properties')
          .select('id, status')
          .eq('id', sourceId)
          .eq('owner_id', owner)
          .maybeSingle();
        if (propertyError) throw propertyError;
        if (!property) return res.status(404).json({ error: 'Property not found.' });
        if (['sold', 'rented', 'leased'].includes(String(property.status || '').toLowerCase())) {
          return res.status(409).json({ error: 'Sold or rented properties cannot be boosted.' });
        }
        const { data: priceSetting, error } = await db
          .from('site_settings')
          .select('value')
          .eq('key', 'property_boost_price')
          .maybeSingle();
        if (error) throw error;
        payment = {
          amount: Number(priceSetting?.value ?? 500),
          currency: 'JMD',
          referenceIds: [sourceId],
          payerName: resolved.user.full_name,
          payerEmail: resolved.user.email,
        };
      } else {
        return res.status(400).json({ error: 'Unsupported bank transfer payment type.' });
      }
    }

    if (!Number.isFinite(payment.amount) || payment.amount <= 0 ||
        !['JMD', 'USD'].includes(payment.currency)) {
      return res.status(503).json({ error: 'The payment amount or currency is not configured correctly.' });
    }

    const { data: existingPayment, error: existingPaymentError } = await db
      .from('bank_transfer_payments')
      .select('id')
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .eq('status', 'pending')
      .maybeSingle();
    if (existingPaymentError) throw existingPaymentError;
    if (existingPayment) {
      return res.status(409).json({ error: 'A receipt for this payment is already awaiting review.' });
    }

    const path = `${sourceType}/${sourceId}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await db.storage
      .from('payment-receipts')
      .upload(path, await readFile(file.filepath), { contentType: file.mimetype, upsert: false });
    if (uploadError) throw uploadError;

    const submittedAt = new Date().toISOString();
    const { data: inserted, error: insertError } = await db
      .from('bank_transfer_payments')
      .insert({
        source_type: sourceType,
        source_id: sourceId,
        payer_name: payment.payerName,
        payer_email: payment.payerEmail,
        amount: payment.amount,
        currency: payment.currency,
        reference_ids: payment.referenceIds,
        payer_reference: getPayerReference(owner),
        receipt_path: path,
        status: 'pending',
        submitted_at: submittedAt,
      })
      .select('id')
      .single();
    if (insertError) {
      const { error: cleanupError } = await db.storage.from('payment-receipts').remove([path]);
      if (cleanupError) console.error('Failed to remove unlinked payment receipt:', cleanupError);
      throw insertError;
    }

    const { data: signedReceipt, error: signedReceiptError } = await db.storage
      .from('payment-receipts')
      .createSignedUrl(path, 3600);
    if (signedReceiptError) throw signedReceiptError;

    return res.status(200).json({
      success: true,
      receipt: {
        id: inserted.id,
        amount: payment.amount,
        currency: payment.currency,
        referenceIds: payment.referenceIds,
        payerReference: getPayerReference(owner),
        status: 'pending',
        submittedAt,
        url: signedReceipt.signedUrl,
      },
    });
  } catch (error) {
    if (Number(error?.httpCode) === 413) {
      return res.status(413).json({ error: 'Receipt image must be 5 MB or smaller.' });
    }
    console.error('Bank transfer receipt upload failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to submit payment receipt.' });
  }
}
