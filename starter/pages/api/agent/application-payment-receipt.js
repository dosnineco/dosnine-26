import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { getDbClient, requireAgentAccountUser } from '@/lib/apiAuth';

export const config = { api: { bodyParser: false } };

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireAgentAccountUser(req, res);
    if (!resolved) return;

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

    const db = getDbClient();
    const { data: agent, error: agentError } = await db
      .from('agents')
      .select('id, business_name, user_id')
      .eq('user_id', resolved.user.id)
      .maybeSingle();
    if (agentError) throw agentError;
    if (!agent) return res.status(404).json({ error: 'Agent profile not found.' });

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

    const path = `agent-applications/${agent.id}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await db.storage
      .from('payment-receipts')
      .upload(path, await readFile(file.filepath), {
        contentType: file.mimetype,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const submittedAt = new Date().toISOString();
    const { error: insertError } = await db
      .from('bank_transfer_payments')
      .insert({
        source_type: 'agent_request_applications',
        source_id: applicationIds.join(','),
        payer_name: payerName || agent.business_name || 'Agent',
        payer_email: resolved.user?.email_addresses?.[0]?.email_address || null,
        amount,
        currency: 'JMD',
        reference_ids: referenceIds,
        receipt_path: path,
        status: 'pending',
        submitted_at: submittedAt,
      });
    if (insertError) {
      await db.storage.from('payment-receipts').remove([path]);
      throw insertError;
    }

    return res.status(200).json({ success: true, submittedAt });
  } catch (error) {
    console.error('Agent application payment receipt upload failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to submit payment receipt.' });
  }
}
