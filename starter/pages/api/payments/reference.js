import { getPayerReference } from '@/lib/paymentReference';
import { requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;

  try {
    const resolved = await requireDbUser(req, res, { createIfMissing: true });
    if (!resolved) return;

    const payerReference = getPayerReference(resolved.user?.id);
    if (!payerReference) {
      return res.status(500).json({ error: 'Unable to load your payment reference.' });
    }

    return res.status(200).json({ success: true, payerReference });
  } catch (error) {
    console.error('Payment reference lookup failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to load your payment reference.' });
  }
}
