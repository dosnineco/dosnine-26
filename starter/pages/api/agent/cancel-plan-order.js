import { z } from 'zod';
import { getDbClient, requireAgentAccountUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';

const schema = z.object({ orderId: z.string().min(1).max(64) });

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;
  const resolved = await requireAgentAccountUser(req, res);
  if (!resolved) return;

  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'A valid PayPal order is required.' });

  try {
    const { data, error } = await getDbClient()
      .from('agents')
      .update({
        paypal_order_id: null,
        paypal_order_amount: null,
        payment_receipt_status: 'none',
      })
      .eq('user_id', resolved.user.id)
      .eq('paypal_order_id', parsed.data.orderId)
      .eq('payment_receipt_status', 'paypal_pending')
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(409).json({ error: 'This agent payment can no longer be canceled.' });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Agent PayPal order cancellation failed:', error);
    return res.status(500).json({ error: 'Unable to cancel PayPal checkout.' });
  }
}
