import { getDbClient } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import {
  ALLOWED_MIME,
  BUCKET,
  MAX_FILE_SIZE,
  buildDocumentPath,
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
  filename: z.string().trim().min(1).max(255),
  mimeType: z.string().min(3).max(120),
  fileSize: z.number().int().positive(),
});

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'buyer-prequal-upload-url',
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many upload requests. Try again shortly.' });

  const parsedResult = schema.safeParse(req.body || {});
  if (!parsedResult.success) return res.status(400).json({ error: 'Invalid upload request' });
  const parsed = parsedResult.data;
  if (!verifyBuyerAccessToken(parsed.prequalificationId, parsed.accessToken)) {
    return res.status(403).json({ error: 'Invalid or expired submission access' });
  }
  if (!ALLOWED_MIME.includes(parsed.mimeType)) {
    return res.status(400).json({ error: 'Only PDF and supported image files are allowed' });
  }
  if (parsed.fileSize > MAX_FILE_SIZE) {
    return res.status(400).json({ error: 'Files must be 10 MB or smaller' });
  }

  try {
    const { data: prequalification, error: prequalificationError } = await getDbClient()
      .from('buyer_prequalifications')
      .select('id, status')
      .eq('id', parsed.prequalificationId)
      .maybeSingle();

    if (prequalificationError) throw prequalificationError;
    if (!prequalification) return res.status(404).json({ error: 'Prequalification not found' });
    if (['rejected', 'expired'].includes(prequalification.status)) {
      return res.status(400).json({ error: 'This prequalification is no longer accepting documents' });
    }

    const path = buildDocumentPath(
      parsed.prequalificationId,
      parsed.documentType,
      parsed.filename
    );
    const { data, error } = await getDbClient()
      .storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error) throw error;
    return res.status(200).json({
      success: true,
      uploadUrl: data.signedUrl,
      path,
    });
  } catch (error) {
    console.error('Buyer document upload URL creation failed:', error);
    return res.status(500).json({ error: 'Unable to prepare document upload' });
  }
}
