import { getDbClient } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { verifyBuyerAccessToken } from '@/lib/buyerPrequalification';
import { z } from 'zod';

const querySchema = z.object({
  prequalificationId: z.string().uuid(),
  accessToken: z.string().min(1).max(512),
});

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success || !verifyBuyerAccessToken(
    parsed.data?.prequalificationId,
    parsed.data?.accessToken
  )) {
    return res.status(403).json({ error: 'Invalid or expired access link' });
  }

  try {
    const db = getDbClient();
    const { data: prequalification, error } = await db
      .from('buyer_prequalifications')
      .select('id, buyer_name, buyer_email, buyer_phone, purchase_method, target_property_price, monthly_income, deposit_available, employment_type, financing_progress, lender_name, financing_conditions, qualification_level, status, verified_budget_min, verified_budget_max, verification_notes, verified_at, verification_expires_at, consent_to_share, service_request_id')
      .eq('id', parsed.data.prequalificationId)
      .maybeSingle();
    if (error) throw error;
    if (!prequalification) return res.status(404).json({ error: 'Assessment not found' });

    const { data: documents, error: documentsError } = await db
      .from('buyer_documents')
      .select('id, document_type, file_name, file_size, mime_type, status, review_notes, expires_at, uploaded_at')
      .eq('prequalification_id', prequalification.id)
      .order('uploaded_at', { ascending: false });
    if (documentsError) throw documentsError;

    return res.status(200).json({
      success: true,
      prequalification: {
        ...prequalification,
        documents: documents || [],
      },
    });
  } catch (error) {
    console.error('Buyer prequalification access lookup failed:', error);
    return res.status(500).json({ error: 'Unable to load assessment' });
  }
}
