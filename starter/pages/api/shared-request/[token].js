import { getDbClient } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import {
  findActiveExternalShare,
  getSharedExternalRequest,
} from '@/lib/externalBuyerRequestSharing';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;
  res.setHeader('Cache-Control', 'private, no-store');

  try {
    const db = getDbClient();
    const share = await findActiveExternalShare(db, req.query.token);
    if (!share) return res.status(404).json({ error: 'This sharing link is invalid or has expired' });

    const request = await getSharedExternalRequest(db, share);
    if (!request) return res.status(404).json({ error: 'This shared request is no longer available' });
    return res.status(200).json({ success: true, request });
  } catch (error) {
    console.error('Loading externally shared buyer request failed:', error);
    return res.status(500).json({ error: 'Unable to load the shared request' });
  }
}
