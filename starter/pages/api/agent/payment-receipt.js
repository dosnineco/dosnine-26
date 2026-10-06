import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { getDbClient, requireAgentAccountUser } from '../../../lib/apiAuth';

export const config = {
  api: {
    bodyParser: false,
  },
};

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const VALID_PAID_PLANS = ['7-day', '30-day', '90-day'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireAgentAccountUser(req, res);
    if (!resolved) return;

    const formidable = await import('formidable');
    const form = formidable.formidable({
      maxFiles: 1,
      maxFileSize: 5 * 1024 * 1024,
      maxFields: 1,
    });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (error, parsedFields, parsedFiles) => {
        if (error) return reject(error);
        resolve({ fields: parsedFields, files: parsedFiles });
      });
    });
    const field = (value) => (Array.isArray(value) ? value[0] : value);
    const plan = String(field(fields.plan) || '').trim();
    const file = Array.isArray(files.receipt) ? files.receipt[0] : files.receipt;

    if (!VALID_PAID_PLANS.includes(plan)) {
      return res.status(400).json({ error: 'Choose a valid paid access plan before uploading.' });
    }
    if (!file) {
      return res.status(400).json({ error: 'Choose a receipt image to upload.' });
    }
    const extension = MIME_EXTENSIONS[file.mimetype];
    if (!extension) {
      return res.status(400).json({ error: 'Receipt must be a JPG, PNG, or WebP image.' });
    }

    const db = getDbClient();
    const { data: agent, error: agentError } = await db
      .from('agents')
      .select('id, verification_status, payment_receipt_path')
      .eq('user_id', resolved.user.id)
      .maybeSingle();
    if (agentError) throw agentError;
    if (!agent) return res.status(404).json({ error: 'Agent profile not found.' });
    if (agent.verification_status !== 'approved') {
      return res.status(403).json({ error: 'Your agent profile must be approved before submitting payment.' });
    }

    const { data: pricing, error: pricingError } = await db
      .from('site_settings')
      .select('value')
      .eq('key', 'plan_prices')
      .maybeSingle();
    if (pricingError) throw pricingError;
    const amount = Number(pricing?.value?.[plan]);
    if (!Number.isInteger(amount) || amount < 1) {
      return res.status(503).json({ error: 'Agent plan pricing is not configured. Please contact support.' });
    }

    const path = `${agent.id}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await db.storage
      .from('agent-payment-receipts')
      .upload(path, await readFile(file.filepath), {
        contentType: file.mimetype,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const submittedAt = new Date().toISOString();
    const { error: updateError } = await db
      .from('agents')
      .update({
        payment_receipt_path: path,
        payment_receipt_submitted_at: submittedAt,
        payment_receipt_plan: plan,
        payment_receipt_amount: amount,
        payment_receipt_status: 'pending',
      })
      .eq('id', agent.id);
    if (updateError) {
      const { error: cleanupError } = await db.storage.from('agent-payment-receipts').remove([path]);
      if (cleanupError) console.error('Failed to remove unlinked agent payment receipt:', cleanupError);
      throw updateError;
    }

    if (agent.payment_receipt_path) {
      const { error: previousReceiptError } = await db.storage
        .from('agent-payment-receipts')
        .remove([agent.payment_receipt_path]);
      if (previousReceiptError) {
        console.error('Failed to remove replaced agent payment receipt:', previousReceiptError);
      }
    }

    return res.status(200).json({
      success: true,
      receipt: {
        submittedAt,
        plan,
        amount,
        status: 'pending',
      },
    });
  } catch (error) {
    if (Number(error?.httpCode) === 413) {
      return res.status(413).json({ error: 'Receipt image must be 5 MB or smaller.' });
    }
    console.error('Agent payment receipt upload failed:', error);
    if (error?.code === '42703') {
      return res.status(503).json({
        error: 'Agent receipt storage is not set up. Run db-migrations/058_agent_plan_receipts_and_pricing.sql in Supabase, then retry.',
      });
    }
    return res.status(500).json({ error: 'Unable to upload payment receipt.' });
  }
}
