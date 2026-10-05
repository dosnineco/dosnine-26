import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { getDbClient, requireDbUser } from '@/lib/apiAuth';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res);
    if (!resolved) return;

    const formidable = await import('formidable');
    const form = formidable.formidable({
      maxFiles: 1,
      maxFileSize: 5 * 1024 * 1024,
      maxFields: 1,
      keepExtensions: true,
    });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (error, parsedFields, parsedFiles) => {
        if (error) return reject(error);
        resolve({ fields: parsedFields, files: parsedFiles });
      });
    });
    const field = (value) => (Array.isArray(value) ? value[0] : value);
    const submissionId = String(field(fields.submission_id) || '').trim();
    const file = Array.isArray(files.receipt) ? files.receipt[0] : files.receipt;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) {
      return res.status(400).json({ error: 'A valid submission ID is required.' });
    }
    if (!file) {
      return res.status(400).json({ error: 'Choose a payment receipt image to upload.' });
    }
    const extension = MIME_EXTENSIONS[file.mimetype];
    if (!extension) {
      return res.status(400).json({ error: 'Receipt must be a JPG, PNG, or WebP image.' });
    }

    const db = getDbClient();
    const { data: submission, error: submissionError } = await db
      .from('sponsor_submissions')
      .select('id, status, payment_status, payment_receipt_path')
      .eq('id', submissionId)
      .eq('created_by_clerk_id', resolved.clerkId)
      .maybeSingle();
    if (submissionError) throw submissionError;
    if (!submission) return res.status(404).json({ error: 'Submission not found.' });
    if (submission.payment_status === 'paid' || submission.status !== 'pending_payment') {
      return res.status(409).json({ error: 'This submission is no longer awaiting payment.' });
    }

    const path = `${submissionId}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await db.storage
      .from('payment-receipts')
      .upload(path, await readFile(file.filepath), {
        contentType: file.mimetype,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const submittedAt = new Date().toISOString();
    const { error: updateError } = await db
      .from('sponsor_submissions')
      .update({
        payment_receipt_path: path,
        payment_receipt_submitted_at: submittedAt,
      })
      .eq('id', submissionId)
      .eq('created_by_clerk_id', resolved.clerkId);
    if (updateError) {
      const { error: cleanupError } = await db.storage.from('payment-receipts').remove([path]);
      if (cleanupError) console.error('Failed to remove unlinked payment receipt:', cleanupError);
      throw updateError;
    }
    if (submission.payment_receipt_path) {
      const { error: previousReceiptError } = await db.storage
        .from('payment-receipts')
        .remove([submission.payment_receipt_path]);
      if (previousReceiptError) {
        console.error('Failed to remove replaced payment receipt:', previousReceiptError);
      }
    }

    return res.status(200).json({ success: true, receiptSubmittedAt: submittedAt });
  } catch (error) {
    const status = Number(error?.httpCode);
    if (status === 413) {
      return res.status(413).json({ error: 'Receipt image must be 5 MB or smaller.' });
    }
    console.error('Sponsor payment receipt upload failed:', error);
    if (error?.code === '42703') {
      return res.status(503).json({
        error: 'Receipt storage is not set up in the database. Run db-migrations/053_add_sponsor_payment_receipt_columns.sql in the Supabase SQL Editor, then retry.',
      });
    }
    return res.status(500).json({ error: 'Unable to upload payment receipt.' });
  }
}
