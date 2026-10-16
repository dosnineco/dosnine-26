import { getClerkUserId, getDbClient, getDbUserByClerkId } from '@/lib/apiAuth';
import {
  enforceMethods,
  isBotLikely,
  sanitizeEmail,
  sanitizePhoneInput,
  sanitizeString,
} from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { createBuyerAccessToken } from '@/lib/buyerPrequalification';
import { z } from 'zod';

const moneySchema = z.union([
  z.number().finite().min(0),
  z.string().trim().max(20).regex(/^\d{0,14}(?:\.\d{1,2})?$/),
]).optional();

const schema = z.object({
  buyerName: z.string().trim().min(1).max(120),
  buyerEmail: z.string().trim().email().max(254),
  buyerPhone: z.string().trim().min(7).max(40),
  purchaseMethod: z.enum(['mortgage', 'cash', 'nht', 'savings_and_financing', 'still_saving']),
  targetPropertyPrice: moneySchema,
  monthlyIncome: moneySchema,
  depositAvailable: moneySchema,
  employmentType: z.enum(['employed', 'self_employed', 'other']).optional(),
  financingProgress: z.enum(['not_applied', 'submitted', 'prequalified', 'approved']).optional(),
  lenderName: z.string().trim().max(160).optional(),
  financingConditions: z.string().trim().max(1000).optional(),
  consentToShare: z.literal(true),
  serviceRequestId: z.string().uuid().optional(),
  website: z.string().optional(),
});

function numericOrNull(value) {
  if (value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'buyer-prequal-create',
    maxRequests: 8,
    windowMs: 60_000,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many requests. Try again shortly.' });

  const parsedResult = schema.safeParse(req.body || {});
  if (!parsedResult.success) return res.status(400).json({ error: 'Invalid payload' });
  const parsed = parsedResult.data;
  if (isBotLikely(parsed)) return res.status(200).json({ success: true });

  try {
    const db = getDbClient();
    const buyerEmail = sanitizeEmail(parsed.buyerEmail);
    let buyerUserId = null;
    const clerkId = getClerkUserId(req);
    if (clerkId) {
      const { user, error: userError } = await getDbUserByClerkId(clerkId, { createIfMissing: true });
      if (userError) throw userError;
      if (sanitizeEmail(user?.email) === buyerEmail) buyerUserId = user.id;
    }

    let linkedServiceRequestId = null;
    if (parsed.serviceRequestId) {
      const { data: serviceRequest, error: requestError } = await db
        .from('service_requests')
        .select('id, client_email')
        .eq('id', parsed.serviceRequestId)
        .maybeSingle();
      if (requestError) throw requestError;
      if (!serviceRequest) return res.status(404).json({ error: 'Service request not found' });
      if (sanitizeEmail(serviceRequest.client_email) === buyerEmail) {
        linkedServiceRequestId = serviceRequest.id;
      } else {
        console.warn('Buyer assessment email differs from linked service request email', {
          serviceRequestId: serviceRequest.id,
        });
      }
    }

    if (linkedServiceRequestId) {
      const { data: existing, error: existingError } = await db
        .from('buyer_prequalifications')
        .select('id, qualification_level, status, buyer_email')
        .eq('service_request_id', linkedServiceRequestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing && sanitizeEmail(existing.buyer_email) === buyerEmail) {
        return res.status(200).json({
          success: true,
          prequalification: existing,
          accessToken: createBuyerAccessToken(existing.id),
          serviceRequestLinked: true,
          reused: true,
        });
      }
    }

    const { data, error } = await db
      .from('buyer_prequalifications')
      .insert([{
        buyer_user_id: buyerUserId,
        service_request_id: linkedServiceRequestId,
        buyer_name: sanitizeString(parsed.buyerName, 120),
        buyer_email: buyerEmail,
        buyer_phone: sanitizePhoneInput(parsed.buyerPhone),
        purchase_method: parsed.purchaseMethod,
        target_property_price: numericOrNull(parsed.targetPropertyPrice),
        monthly_income: numericOrNull(parsed.monthlyIncome),
        deposit_available: numericOrNull(parsed.depositAvailable),
        employment_type: parsed.employmentType || null,
        financing_progress: parsed.financingProgress || null,
        lender_name: sanitizeString(parsed.lenderName, 160) || null,
        financing_conditions: sanitizeString(parsed.financingConditions, 1000) || null,
        consent_to_share: true,
        consent_given_at: new Date().toISOString(),
      }])
      .select('id, qualification_level, status')
      .single();

    if (error) {
      console.error('Buyer prequalification insert failed:', error);
      return res.status(500).json({ error: 'Unable to save buyer assessment' });
    }

    return res.status(201).json({
      success: true,
      prequalification: data,
      accessToken: createBuyerAccessToken(data.id),
      serviceRequestLinked: !parsed.serviceRequestId || Boolean(linkedServiceRequestId),
    });
  } catch (error) {
    console.error('Buyer prequalification creation failed:', error);
    return res.status(500).json({ error: 'Unable to save buyer assessment' });
  }
}
