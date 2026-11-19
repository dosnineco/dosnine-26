import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { getDbClient, requireAgentAccountUser } from '@/lib/apiAuth';
import { getPayerReference } from '@/lib/paymentReference';

export const config = { api: { bodyParser: false } };

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireAgentAccountUser(req, res);
    if (!resolved) return;

    const db = getDbClient();
    const { data: agent, error: agentError } = await db
      .from('agents')
      .select('id, business_name, user_id')
      .eq('user_id', resolved.user.id)
      .maybeSingle();
    if (agentError) throw agentError;
    if (!agent) return res.status(404).json({ error: 'Agent profile not found.' });

    if (req.method === 'GET') {
      const { data: applications, error: applicationsError } = await db
        .from('agent_request_applications')
        .select('request_id')
        .eq('agent_id', agent.id);
      if (applicationsError) throw applicationsError;
      const requestIds = (applications || []).map((application) => application.request_id).filter(Boolean);
      if (!requestIds.length) return res.status(200).json({ success: true, receipt: null });

      const { data: payments, error: paymentsError } = await db
        .from('bank_transfer_payments')
        .select('id, amount, currency, reference_ids, receipt_path, status, submitted_at')
        .eq('source_type', 'agent_request_applications')
        .overlaps('reference_ids', requestIds)
        .order('submitted_at', { ascending: false })
        .limit(1);
      if (paymentsError) throw paymentsError;
      const payment = payments?.[0];
      if (!payment) return res.status(200).json({ success: true, receipt: null });

      const { data: signedReceipt, error: signedReceiptError } = await db.storage
        .from('payment-receipts')
        .createSignedUrl(payment.receipt_path, 3600);
      if (signedReceiptError) throw signedReceiptError;

      return res.status(200).json({
        success: true,
        receipt: {
          amount: Number(payment.amount),
          currency: payment.currency,
          referenceIds: payment.reference_ids || [],
          status: payment.status,
          submittedAt: payment.submitted_at,
          url: signedReceipt.signedUrl,
        },
      });
    }

    const formidable = await import('formidable');
    const form = formidable.formidable({ maxFiles: 1, maxFileSize: 5 * 1024 * 1024, maxFields: 10 });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (error, parsedFields, parsedFiles) => {
        if (error) reject(error);
        else resolve({ fields: parsedFields, files: parsedFiles });
      });
    });
    const field = (value) => (Array.isArray(value) ? value[0] : value);
    const amount = Number(field(fields.amount));
    const payerName = String(field(fields.payer_name) || '').trim();
    const referenceIds = String(field(fields.reference_ids) || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const file = Array.isArray(files.receipt) ? files.receipt[0] : files.receipt;

    if (!Number.isFinite(amount) || amount < 1) {
      return res.status(400).json({ error: 'A valid payment amount is required.' });
    }
    if (referenceIds.length === 0) {
      return res.status(400).json({ error: 'Include at least one pending request ID.' });
    }
    if (!file) {
      return res.status(400).json({ error: 'Choose a payment receipt image.' });
    }
    const extension = MIME_EXTENSIONS[file.mimetype];
    if (!extension) {
      return res.status(400).json({ error: 'Receipt must be a JPG, PNG, or WebP image.' });
    }

    const { data: applications, error: applicationsError } = await db
      .from('agent_request_applications')
      .select('id, request_id')
      .eq('agent_id', agent.id)
      .eq('status', 'pending')
      .in('request_id', referenceIds);
    if (applicationsError) throw applicationsError;

    const applicationIds = (applications || []).map((application) => application.id);
    if (applicationIds.length !== referenceIds.length) {
      return res.status(409).json({ error: 'One or more requests are no longer pending.' });
    }

    const { data: existingPayment, error: existingPaymentError } = await db
      .from('bank_transfer_payments')
      .select('id')
      .eq('source_type', 'agent_request_applications')
      .overlaps('reference_ids', referenceIds)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();
    if (existingPaymentError) throw existingPaymentError;
    if (existingPayment) {
      return res.status(409).json({ error: 'A receipt for one or more requests is already awaiting review.' });
    }

    const path = `agent-applications/${agent.id}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await db.storage
      .from('payment-receipts')
      .upload(path, await readFile(file.filepath), {
        contentType: file.mimetype,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data: signedReceipt, error: signedReceiptError } = await db.storage
      .from('payment-receipts')
      .createSignedUrl(path, 3600);
    if (signedReceiptError) {
      const { error: cleanupError } = await db.storage.from('payment-receipts').remove([path]);
      if (cleanupError) console.error('Failed to remove payment receipt without a signed URL:', cleanupError);
      throw signedReceiptError;
    }

    const submittedAt = new Date().toISOString();
    const { error: insertError } = await db
      .from('bank_transfer_payments')
      .insert({
        source_type: 'agent_request_applications',
        source_id: applicationIds.join(','),
        payer_name: payerName || agent.business_name || 'Agent',
        payer_email: resolved.user?.email_addresses?.[0]?.email_address || null,
        payer_reference: getPayerReference(resolved.user?.id),
        amount,
        currency: 'JMD',
        reference_ids: referenceIds,
        receipt_path: path,
        status: 'pending',
        submitted_at: submittedAt,
      });
    if (insertError) {
      const { error: cleanupError } = await db.storage.from('payment-receipts').remove([path]);
      if (cleanupError) console.error('Failed to remove unlinked agent application payment receipt:', cleanupError);
      throw insertError;
    }

    return res.status(200).json({
      success: true,
      receipt: {
        amount,
        currency: 'JMD',
        referenceIds,
        payerReference: getPayerReference(resolved.user?.id),
        status: 'pending',
        submittedAt,
        url: signedReceipt.signedUrl,
      },
    });
  } catch (error) {
    if (Number(error?.httpCode) === 413) {
      return res.status(413).json({ error: 'Receipt image must be 5 MB or smaller.' });
    }
    console.error('Agent application payment receipt upload failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to submit payment receipt.' });
  }
}
