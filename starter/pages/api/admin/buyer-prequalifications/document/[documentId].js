import { getDbClient, requireAdminUser } from '@/lib/apiAuth';
import { streamBuyerDocument } from '@/lib/buyerPrequalification';
import { enforceMethods } from '@/lib/apiSecurity';
import { z } from 'zod';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;
  const resolved = await requireAdminUser(req, res);
  if (!resolved) return;

  const parsedId = z.string().uuid().safeParse(req.query.documentId);
  if (!parsedId.success) return res.status(400).json({ error: 'Invalid document id' });

  try {
    const db = getDbClient();
    const { data: document, error } = await db
      .from('buyer_documents')
      .select('file_path, file_name, mime_type')
      .eq('id', parsedId.data)
      .maybeSingle();
    if (error) throw error;
    if (!document) return res.status(404).json({ error: 'Document not found' });

    return await streamBuyerDocument(db, document, res);
  } catch (error) {
    console.error('Admin buyer document access failed:', error);
    return res.status(500).json({ error: 'Unable to open buyer document' });
  }
}
