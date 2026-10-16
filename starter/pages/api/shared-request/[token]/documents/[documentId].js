import { getDbClient } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { streamBuyerDocument } from '@/lib/buyerPrequalification';
import {
  findActiveExternalShare,
  getSharedExternalRequest,
} from '@/lib/externalBuyerRequestSharing';
import { z } from 'zod';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;
  const documentId = z.string().uuid().safeParse(req.query.documentId);
  if (!documentId.success) return res.status(400).json({ error: 'Invalid document id' });
  res.setHeader('Cache-Control', 'private, no-store');

  try {
    const db = getDbClient();
    const share = await findActiveExternalShare(db, req.query.token);
    if (!share) return res.status(404).json({ error: 'This sharing link is invalid or has expired' });

    const request = await getSharedExternalRequest(db, share);
    if (!request) return res.status(404).json({ error: 'This shared request is no longer available' });
    const document = request.buyer_prequalification.documents.find((item) => item.id === documentId.data);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    const { data: storedDocument, error } = await db
      .from('buyer_documents')
      .select('file_path, file_name, mime_type')
      .eq('id', document.id)
      .eq('prequalification_id', request.buyer_prequalification.id)
      .single();
    if (error) throw error;
    return await streamBuyerDocument(db, storedDocument, res);
  } catch (error) {
    console.error('Opening externally shared buyer document failed:', error);
    return res.status(500).json({ error: 'Unable to open the shared document' });
  }
}
