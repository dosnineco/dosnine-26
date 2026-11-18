import { getDbClient, requireAdminUser } from '@/lib/apiAuth';

async function signedReceipt(db, bucket, path) {
  if (!path) return null;
  const { data } = await db.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

export default async function handler(req, res) {
  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;
    const db = getDbClient();

    if (req.method === 'GET') {
      const payments = [];

      const [centralResult, agentResult, sponsorResult] = await Promise.all([
        db.from('bank_transfer_payments')
          .select('id, source_type, source_id, payer_name, payer_email, amount, currency, reference_ids, receipt_path, status, submitted_at, reviewed_at, notes')
          .order('submitted_at', { ascending: false }),
        db.from('agents')
          .select('id, business_name, payment_receipt_path, payment_receipt_submitted_at, payment_receipt_plan, payment_receipt_amount, payment_receipt_status, user_id')
          .not('payment_receipt_submitted_at', 'is', null)
          .order('payment_receipt_submitted_at', { ascending: false }),
        db.from('sponsor_submissions')
          .select('id, company_name, email, amount, currency, plan_name, payment_status, status, payment_receipt_path, payment_receipt_submitted_at, submitted_at')
          .not('payment_receipt_submitted_at', 'is', null)
          .order('payment_receipt_submitted_at', { ascending: false }),
      ]);

      if (centralResult.error && centralResult.error.code !== '42P01') throw centralResult.error;
      for (const row of centralResult.data || []) {
        payments.push({
          id: `central:${row.id}`,
          source: row.source_type === 'agent_request_applications' ? 'Agent applications' : row.source_type,
          payerName: row.payer_name,
          payerEmail: row.payer_email,
          amount: Number(row.amount),
          currency: row.currency || 'JMD',
          reference: (row.reference_ids || []).join(', '),
          status: row.status,
          submittedAt: row.submitted_at,
          receiptUrl: await signedReceipt(db, 'payment-receipts', row.receipt_path),
          rawId: row.id,
          sourceType: 'central',
        });
      }

      if (agentResult.error) throw agentResult.error;
      for (const row of agentResult.data || []) {
        payments.push({
          id: `agent:${row.id}`,
          source: 'Agent plan',
          payerName: row.business_name || 'Agent',
          payerEmail: null,
          amount: Number(row.payment_receipt_amount || 0),
          currency: 'JMD',
          reference: row.payment_receipt_plan || 'Agent plan',
          status: row.payment_receipt_status === 'verified' ? 'approved'
            : row.payment_receipt_status === 'rejected' ? 'rejected' : 'pending',
          submittedAt: row.payment_receipt_submitted_at,
          receiptUrl: await signedReceipt(db, 'agent-payment-receipts', row.payment_receipt_path),
          rawId: row.id,
          sourceType: 'agent',
        });
      }

      if (sponsorResult.error) throw sponsorResult.error;
      for (const row of sponsorResult.data || []) {
        payments.push({
          id: `sponsor:${row.id}`,
          source: 'Advertising',
          payerName: row.company_name || 'Advertiser',
          payerEmail: row.email,
          amount: Number(row.amount || 0),
          currency: row.currency || 'JMD',
          reference: row.plan_name || row.id,
          status: row.payment_status === 'paid' ? 'approved'
            : row.payment_status === 'rejected' ? 'rejected' : 'pending',
          submittedAt: row.payment_receipt_submitted_at || row.submitted_at,
          receiptUrl: await signedReceipt(db, 'payment-receipts', row.payment_receipt_path),
          rawId: row.id,
          sourceType: 'sponsor',
        });
      }

      payments.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      return res.status(200).json({ success: true, payments });
    }

    if (req.method === 'PATCH') {
      const { paymentId, action } = req.body || {};
      if (!paymentId || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Choose a valid payment action.' });
      }
      const separator = paymentId.indexOf(':');
      if (separator < 1) return res.status(400).json({ error: 'Invalid payment ID.' });
      const sourceType = paymentId.slice(0, separator);
      const rawId = paymentId.slice(separator + 1);
      const now = new Date().toISOString();

      if (sourceType === 'central') {
        const { data: payment, error } = await db
          .from('bank_transfer_payments')
          .select('id, source_type, source_id, status')
          .eq('id', rawId)
          .maybeSingle();
        if (error) throw error;
        if (!payment) return res.status(404).json({ error: 'Payment not found.' });
        if (payment.status !== 'pending') return res.status(409).json({ error: 'This payment is no longer pending.' });

        const { error: updateError } = await db
          .from('bank_transfer_payments')
          .update({
            status: action === 'approve' ? 'approved' : 'rejected',
            reviewed_at: now,
            reviewed_by: resolved.user?.id || resolved.clerkId || null,
          })
          .eq('id', rawId)
          .eq('status', 'pending');
        if (updateError) throw updateError;

        if (action === 'approve' && payment.source_type === 'agent_request_applications') {
          const applicationIds = String(payment.source_id || '').split(',').filter(Boolean);
          if (applicationIds.length) {
            const { error: applicationError } = await db
              .from('agent_request_applications')
              .update({ status: 'approved', reviewed_at: now })
              .in('id', applicationIds);
            if (applicationError) throw applicationError;
          }
        }
        return res.status(200).json({ success: true });
      }

      if (sourceType === 'agent') {
        if (action === 'approve') {
          const { data: agent, error } = await db
            .from('agents')
            .select('id, payment_receipt_status, payment_receipt_plan, payment_receipt_amount')
            .eq('id', rawId)
            .maybeSingle();
          if (error) throw error;
          if (!agent || agent.payment_receipt_status !== 'pending') return res.status(409).json({ error: 'This receipt is no longer pending.' });
          const plan = agent.payment_receipt_plan;
          const expiry = plan === '7-day'
            ? new Date(Date.now() + 7 * 86400000).toISOString()
            : plan === '30-day'
              ? new Date(Date.now() + 30 * 86400000).toISOString()
              : plan === '90-day'
                ? new Date(Date.now() + 90 * 86400000).toISOString()
                : null;
          if (!expiry) return res.status(400).json({ error: 'The agent plan is invalid.' });
          const { error: updateError } = await db
            .from('agents')
            .update({
              payment_status: plan,
              payment_date: now,
              payment_amount: agent.payment_receipt_amount,
              access_expiry: expiry,
              payment_receipt_status: 'verified',
            })
            .eq('id', rawId)
            .eq('payment_receipt_status', 'pending');
          if (updateError) throw updateError;
        } else {
          const { error } = await db
            .from('agents')
            .update({ payment_receipt_status: 'rejected' })
            .eq('id', rawId)
            .eq('payment_receipt_status', 'pending');
          if (error) throw error;
        }
        return res.status(200).json({ success: true });
      }

      if (sourceType === 'sponsor') {
        if (action === 'approve') {
          const { error } = await db.rpc('confirm_bank_transfer_sponsor_payment', { submission_id: rawId });
          if (error) throw error;
        } else {
          const { error } = await db
            .from('sponsor_submissions')
            .update({ payment_status: 'rejected' })
            .eq('id', rawId)
            .eq('payment_status', 'pending');
          if (error) throw error;
        }
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Unknown payment source.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin payments API error:', error);
    return res.status(500).json({ error: error?.message || 'Unable to process payments.' });
  }
}
