import { getDbClient } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import {
  ALLOWED_MIME,
  BUCKET,
  MAX_FILE_SIZE,
  isValidDocumentPath,
  recomputeQualificationLevel,
  verifyBuyerAccessToken,
} from '@/lib/buyerPrequalification';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { z } from 'zod';

const documentTypes = [
  'mortgage_prequalification', 'proof_of_savings', 'proof_of_funds',
  'mortgage_approval', 'nht_documentation', 'family_contribution',
  'self_employed_income', 'bank_confirmation', 'other',
];

const schema = z.object({
  prequalificationId: z.string().uuid(),
  accessToken: z.string().min(1).max(512),
  documentType: z.enum(documentTypes),
  filePath: z.string().min(1).max(500),
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(3).max(120),
});

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'buyer-prequal-document',
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many document requests. Try again shortly.' });

  const parsedResult = schema.safeParse(req.body || {});
  if (!parsedResult.success) return res.status(400).json({ error: 'Invalid document details' });
  const parsed = parsedResult.data;
  if (!verifyBuyerAccessToken(parsed.prequalificationId, parsed.accessToken)) {
    return res.status(403).json({ error: 'Invalid or expired submission access' });
  }
  if (!isValidDocumentPath(parsed.prequalificationId, parsed.documentType, parsed.filePath)) {
    return res.status(400).json({ error: 'Invalid document storage path' });
  }
  if (!ALLOWED_MIME.includes(parsed.mimeType) || parsed.fileSize > MAX_FILE_SIZE) {
    return res.status(400).json({ error: 'File type or size is not allowed' });
  }

  try {
    const db = getDbClient();
    const { data: prequalification, error: prequalificationError } = await db
      .from('buyer_prequalifications')
      .select('id, status')
      .eq('id', parsed.prequalificationId)
      .maybeSingle();
    if (prequalificationError) throw prequalificationError;
    if (!prequalification) return res.status(404).json({ error: 'Prequalification not found' });
    if (['rejected', 'expired'].includes(prequalification.status)) {
      return res.status(400).json({ error: 'This prequalification is no longer accepting documents' });
    }

    const directory = parsed.filePath.slice(0, parsed.filePath.lastIndexOf('/'));
    const filename = parsed.filePath.slice(parsed.filePath.lastIndexOf('/') + 1);
    const { data: storedFiles, error: storageError } = await db.storage
      .from(BUCKET)
      .list(directory, { search: filename });
    if (storageError) throw storageError;
    const storedFile = storedFiles?.find((file) => file.name === filename);
    if (!storedFile) return res.status(400).json({ error: 'Uploaded file was not found' });

    const actualSize = Number(storedFile.metadata?.size);
    const actualMimeType = storedFile.metadata?.mimetype;
    if (
      (Number.isFinite(actualSize) && (actualSize <= 0 || actualSize > MAX_FILE_SIZE)) ||
      (actualMimeType && !ALLOWED_MIME.includes(actualMimeType))
    ) {
      const { error: removeError } = await db.storage.from(BUCKET).remove([parsed.filePath]);
      if (removeError) console.error('Failed to remove rejected buyer document upload:', removeError);
      return res.status(400).json({ error: 'Uploaded file type or size is not allowed' });
    }

    const { data: existing, error: existingError } = await db
      .from('buyer_documents')
      .select('id, prequalification_id, document_type, file_path, file_name, status')
      .eq('file_path', parsed.filePath)
      .maybeSingle();
    if (existingError) throw existingError;

    let document = existing;
    if (!document) {
      const { data, error } = await db
        .from('buyer_documents')
        .insert([{
          prequalification_id: parsed.prequalificationId,
          document_type: parsed.documentType,
          file_path: parsed.filePath,
          file_name: parsed.fileName,
          file_size: Number.isFinite(actualSize) ? actualSize : parsed.fileSize,
          mime_type: actualMimeType || parsed.mimeType,
          status: 'pending',
        }])
        .select('id, prequalification_id, document_type, file_path, file_name, file_size, mime_type, status, uploaded_at')
        .single();

      if (error) throw error;
      document = data;
    }

    const levelInfo = await recomputeQualificationLevel(parsed.prequalificationId);
    return res.status(200).json({ success: true, document, levelInfo });
  } catch (error) {
    console.error('Buyer document registration failed:', error);
    return res.status(500).json({ error: 'Unable to register uploaded document' });
  }
}
