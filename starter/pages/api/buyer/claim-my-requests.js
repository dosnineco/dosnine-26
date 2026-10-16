import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { claimBuyerRequestsByEmail } from '@/lib/buyerRequests';
import { enforceMethods } from '@/lib/apiSecurity';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;
  const resolved = await requireDbUser(req, res, { createIfMissing: true });
  if (!resolved) return;

  try {
    const claimed = await claimBuyerRequestsByEmail(getDbClient(), resolved.user);
    return res.status(200).json({ success: true, ...claimed });
  } catch (error) {
    console.error('Claiming buyer requests failed:', error);
    return res.status(500).json({ error: error.message || 'Unable to claim requests for this profile' });
  }
}
