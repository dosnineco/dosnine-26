import { z } from 'zod';
import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods, sanitizeLocation, sanitizeString } from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';

const moneySchema = z.string().trim().max(20).regex(/^\d{0,10}(?:\.\d{1,2})?$/).optional().default('');
const schema = z.object({
  requestType: z.enum(['rent', 'buy']),
  propertyType: z.enum(['house', 'apartment', 'land', 'commercial', 'other']),
  location: z.string().trim().min(2).max(180),
  parish: z.string().trim().max(100).optional().default(''),
  budgetMin: moneySchema,
  budgetMax: moneySchema,
  bedrooms: z.union([z.literal(''), z.coerce.number().int().min(0).max(20)]).optional().default(''),
  phone: z.string().trim().min(7).max(40),
  details: z.string().trim().max(1500).optional().default(''),
  currency: z.enum(['USD', 'JMD']),
  acceptedTerms: z.literal(true),
});

function parseMoney(value) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const resolved = await requireDbUser(req, res, { createIfMissing: true });
  if (!resolved) return;
  if (resolved.user.account_type !== 'regular') {
    return res.status(403).json({ error: 'A regular account is required to request a property search.' });
  }

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'property-search-create-request',
    maxRequests: 5,
    windowMs: 60_000,
    identifier: resolved.user.id,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many requests. Try again shortly.' });

  const parsedResult = schema.safeParse(req.body || {});
  if (!parsedResult.success) {
    return res.status(400).json({ error: 'Check the request details, payment currency, and accepted service terms.' });
  }

  const parsed = parsedResult.data;
  const budgetMin = parseMoney(parsed.budgetMin);
  const budgetMax = parseMoney(parsed.budgetMax);
  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
    return res.status(400).json({ error: 'Minimum budget cannot exceed maximum budget.' });
  }
  if (!resolved.user.email) {
    return res.status(400).json({ error: 'Add a verified email address to your account before submitting a property search.' });
  }

  try {
    const { data, error } = await getDbClient().rpc('create_pending_paid_property_search_request', {
      p_user_id: resolved.user.id,
      p_client_name: sanitizeString(resolved.user.full_name || 'Dosnine user', 120),
      p_client_email: String(resolved.user.email).trim().toLowerCase(),
      p_client_phone: sanitizeString(parsed.phone, 40),
      p_request_type: parsed.requestType,
      p_property_type: parsed.propertyType,
      p_location: sanitizeLocation(parsed.location),
      p_parish: parsed.parish ? sanitizeLocation(parsed.parish) : null,
      p_budget_min: budgetMin,
      p_budget_max: budgetMax,
      p_bedrooms: parsed.bedrooms === '' ? null : parsed.bedrooms,
      p_description: sanitizeString(parsed.details, 1500) || null,
      p_currency: parsed.currency,
    });

    if (error) throw error;
    if (!data?.payment_request_id || !data?.service_request_id) {
      throw new Error('The property request could not be created.');
    }

    return res.status(201).json({
      success: true,
      paymentRequestId: data.payment_request_id,
      serviceRequestId: data.service_request_id,
    });
  } catch (error) {
    console.error('Property search request creation failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to create the property search request.' });
  }
}
