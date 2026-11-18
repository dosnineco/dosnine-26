import { z } from 'zod';
import { getDbClient, isAdvertiserAccount, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';

const schema = z.object({ submissionId: z.string().uuid(), orderId: z.string().min(1).max(64) });

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;
  const resolved = await requireDbUser(req, res);
  if (!resolved) return;
  if (!isAdvertiserAccount(resolved.user)) {
    return res.status(403).json({ error: 'An advertiser account is required for this payment.' });
  }

  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'A valid advertisement payment is required.' });

  try {
    const { data, error } = await getDbClient()
      .from('sponsor_submissions')
      .update({ paypal_order_id: null })
      .eq('id', parsed.data.submissionId)
      .eq('created_by_clerk_id', resolved.clerkId)
      .eq('paypal_order_id', parsed.data.orderId)
      .eq('status', 'pending_payment')
      .neq('payment_status', 'paid')
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(409).json({ error: 'This advertisement payment can no longer be canceled.' });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Sponsor PayPal order cancellation failed:', error);
    return res.status(500).json({ error: 'Unable to cancel PayPal checkout.' });
  }
}
