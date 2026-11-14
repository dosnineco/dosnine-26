import { getDbClient } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { verifyBuyerAccessToken } from '@/lib/buyerPrequalification';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { z } from 'zod';

const schema = z.object({
  prequalificationId: z.string().uuid(),
  accessToken: z.string().min(1).max(512),
  consent: z.boolean(),
});

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;
  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'buyer-prequal-ai-consent',
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many requests. Try again shortly.' });

  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success || !verifyBuyerAccessToken(parsed.data?.prequalificationId, parsed.data?.accessToken)) {
    return res.status(403).json({ error: 'Invalid or expired assessment access' });
  }

  try {
    const db = getDbClient();
    const { data: assessment, error: lookupError } = await db
      .from('buyer_prequalifications')
      .select('id')
      .eq('id', parsed.data.prequalificationId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    const { error } = await db
      .from('buyer_prequalifications')
      .update({
        ai_document_review_consent: parsed.data.consent,
        ai_document_review_consent_at: parsed.data.consent ? new Date().toISOString() : null,
      })
      .eq('id', assessment.id);
    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Saving buyer AI review consent failed:', error);
    return res.status(500).json({ error: 'Unable to save AI review consent' });
  }
}
