import { getDbClient } from '@/lib/apiAuth';
import { z } from 'zod';
import { enforceMethods } from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;

  try {
    const rate = await enforceRateLimitDistributed(req, res, {
      keyPrefix: 'marketplace-requests',
      maxRequests: 80,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }

    const { page, limit } = z.object({
      page: z.coerce.number().int().min(1).max(1000).default(1),
      limit: z.coerce.number().int().min(1).max(25).default(25),
    }).parse(req.query || {});

    const offset = (page - 1) * limit;
    const db = getDbClient();

    const [{ data: serviceRequests, error: serviceError }, { data: visitorEmails, error: visitorError }] = await Promise.all([
      db
        .from('service_requests')
        .select('id, request_type, bedrooms, location, parish, budget_min, budget_max, created_at, status, is_contacted')
        .eq('status', 'open')
        .or('is_contacted.is.null,is_contacted.eq.false')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      db
        .from('visitor_emails')
        .select('id, created_at, bedrooms, area, parish, budget_min, email_status')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
    ]);

    if (serviceError || visitorError) {
      return res.status(500).json({ error: 'Failed to load marketplace requests' });
    }

    const combinedRequests = [
      ...(serviceRequests || []).map((request) => ({
        ...request,
        type: 'service_request',
        source: 'agent_request',
        area: null,
      })),
      ...(visitorEmails || []).map((visitor) => ({
        id: visitor.id,
        created_at: visitor.created_at,
        type: 'visitor_email',
        source: 'visitor_email',
        request_type: 'property_inquiry',
        bedrooms: visitor.bedrooms,
        location: null,
        area: visitor.area,
        parish: visitor.parish,
        budget_min: visitor.budget_min,
        budget_max: null,
      })),
    ];

    combinedRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({
      success: true,
      page,
      limit,
      requests: combinedRequests.slice(0, limit),
    });
  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
