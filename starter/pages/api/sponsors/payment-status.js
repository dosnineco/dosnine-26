import { getDbClient, requireDbUser } from '@/lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resolved = await requireDbUser(req, res);
  if (!resolved) return;

  const submissionId = String(req.query?.submission_id || '').trim();
  if (!submissionId) {
    return res.status(400).json({ error: 'Submission ID is required.' });
  }

  try {
    const db = getDbClient();
    const { data, error } = await db
      .from('sponsor_submissions')
      .select('status, payment_status, scheduled_month, payment_receipt_submitted_at')
      .eq('id', submissionId)
      .eq('created_by_clerk_id', resolved.clerkId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    return res.status(200).json({
      success: true,
      status: data.status,
      paymentStatus: data.payment_status,
      scheduledMonth: data.scheduled_month,
      receiptSubmittedAt: data.payment_receipt_submitted_at,
    });
  } catch (error) {
    console.error('Sponsor payment status lookup failed:', error);
    return res.status(500).json({ error: 'Unable to retrieve payment status.' });
  }
}
