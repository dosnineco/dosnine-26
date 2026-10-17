import { readFile } from 'fs/promises';
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

export const config = {
  api: {
    bodyParser: false,
  },
};

const documentTypes = [
  'mortgage_prequalification',
  'proof_of_savings',
  'proof_of_funds',
  'mortgage_approval',
  'nht_documentation',
  'family_contribution',
  'self_employed_income',
  'bank_confirmation',
  'other',
];

const fieldsSchema = z.object({
  prequalificationId: z.string().uuid(),
  accessToken: z.string().min(1).max(512),
  documentType: z.enum(documentTypes),
});

function firstField(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'buyer-prequal-upload',
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many upload requests. Try again shortly.' });

  try {
    const formidable = await import('formidable');
    const form = formidable.formidable({
      maxFiles: 1,
      maxFileSize: MAX_FILE_SIZE,
      maxTotalFileSize: MAX_FILE_SIZE,
      maxFields: 3,
      maxFieldsSize: 2048,
    });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (error, parsedFields, parsedFiles) => {
        if (error) return reject(error);
        resolve({ fields: parsedFields, files: parsedFiles });
      });
    });

    const parsedFields = fieldsSchema.safeParse({
      prequalificationId: firstField(fields.prequalificationId),
      accessToken: firstField(fields.accessToken),
      documentType: firstField(fields.documentType),
    });
    if (!parsedFields.success) return res.status(400).json({ error: 'Invalid upload details' });

    const { prequalificationId, accessToken, documentType } = parsedFields.data;
    if (!verifyBuyerAccessToken(prequalificationId, accessToken)) {
      return res.status(403).json({ error: 'Invalid or expired submission access' });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ error: 'Choose a document to upload' });
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Only PDF and supported image files are allowed' });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'Files must be between 1 byte and 10 MB' });
    }

    const db = getDbClient();
    const { data: prequalification, error: prequalificationError } = await db
      .from('buyer_prequalifications')
      .select('id, status')
      .eq('id', prequalificationId)
      .maybeSingle();
    if (prequalificationError) throw prequalificationError;
    if (!prequalification) return res.status(404).json({ error: 'Prequalification not found' });
    if (['rejected', 'expired'].includes(prequalification.status)) {
      return res.status(400).json({ error: 'This prequalification is no longer accepting documents' });
    }

    const filePath = buildDocumentPath(prequalificationId, documentType, file.originalFilename);
    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(filePath, await readFile(file.filepath), {
        contentType: file.mimetype,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    return res.status(200).json({
      success: true,
      path: filePath,
    });
  } catch (error) {
    if (error.httpCode === 413) {
      return res.status(413).json({ error: 'Files must be 10 MB or smaller' });
    }
    console.error('Buyer document upload failed:', error);
    return res.status(500).json({ error: 'Unable to upload document' });
  }
}
