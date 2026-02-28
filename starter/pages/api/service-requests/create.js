import { getClerkUserId, getDbClient, getDbUserByClerkId } from '@/lib/apiAuth';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { z } from 'zod';
import {
  enforceMethods,
  isBotLikely,
  sanitizeEmail,
  sanitizeInt,
  sanitizeLocation,
  sanitizeMoney,
  sanitizePhoneInput,
  sanitizeString,
} from '@/lib/apiSecurity';
import { assignRequestRoundRobin } from '@/lib/serviceRequestAllocation';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'service-request-create',
    maxRequests: 10,
    windowMs: 60_000,
  });

  if (!rate.allowed) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  }

  const db = getDbClient();

  const schema = z.object({
    clientName: z.string().trim().min(1).max(120).optional(),
    client_name: z.string().trim().min(1).max(120).optional(),
    clientEmail: z.string().trim().email().max(254).optional(),
    client_email: z.string().trim().email().max(254).optional(),
    clientPhone: z.string().trim().min(7).max(40).optional(),
    client_phone: z.string().trim().min(7).max(40).optional(),
    requestType: z.string().trim().min(1).max(100).optional(),
    request_type: z.string().trim().min(1).max(100).optional(),
    propertyType: z.string().trim().min(1).max(100).optional(),
    property_type: z.string().trim().min(1).max(100).optional(),
    location: z.string().trim().min(1).max(255).optional(),
    parish: z.string().trim().max(120).nullable().optional(),
    budgetMin: z.union([z.number(), z.string()]).optional(),
    budgetMax: z.union([z.number(), z.string()]).optional(),
    budget_min: z.union([z.number(), z.string()]).optional(),
    budget_max: z.union([z.number(), z.string()]).optional(),
    bedrooms: z.union([z.number(), z.string()]).optional(),
    bathrooms: z.union([z.number(), z.string()]).optional(),
    description: z.string().max(5000).nullable().optional(),
    urgency: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    fromAds: z.boolean().optional(),
    from_ads: z.boolean().optional(),
    propertyOwnerId: z.string().uuid().nullable().optional(),
    property_owner_id: z.string().uuid().nullable().optional(),
    website: z.string().optional(),
    company: z.string().optional(),
    url: z.string().optional(),
  });

  let parsed;
  try {
    parsed = schema.parse(req.body || {});
  } catch {
    return res.status(400).json({ error: 'Invalid request payload' });
  }

  if (isBotLikely(parsed)) {
    return res.status(200).json({ success: true, message: 'Service request submitted successfully' });
  }

  const parsedClientName = sanitizeString(parsed.clientName || parsed.client_name, 120);
  const parsedClientEmail = sanitizeEmail(parsed.clientEmail || parsed.client_email);
  const parsedClientPhone = sanitizePhoneInput(parsed.clientPhone || parsed.client_phone);
  const parsedRequestType = sanitizeString(parsed.requestType || parsed.request_type, 100);
  const parsedPropertyType = sanitizeString(parsed.propertyType || parsed.property_type, 100);
  const parsedLocation = sanitizeLocation(parsed.location);
  const parsedParish = parsed.parish ? sanitizeLocation(parsed.parish) : null;
  const parsedBudgetMin = sanitizeMoney(parsed.budgetMin ?? parsed.budget_min ?? 0);
  const parsedBudgetMax = sanitizeMoney(parsed.budgetMax ?? parsed.budget_max ?? 0);
  const parsedBedrooms = sanitizeInt(parsed.bedrooms ?? 0, 0, 99);
  const parsedBathrooms = sanitizeInt(parsed.bathrooms ?? 0, 0, 99);
  const parsedDescription = parsed.description ? sanitizeString(parsed.description, 5000) : null;
  const parsedUrgency = parsed.urgency || 'normal';
  const parsedFromAds = Boolean(parsed.fromAds ?? parsed.from_ads);
  const parsedPropertyOwnerId = parsed.propertyOwnerId || parsed.property_owner_id || null;

  if (!parsedClientName || !parsedClientEmail || !parsedClientPhone || !parsedRequestType || !parsedPropertyType || !parsedLocation) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Resolve authenticated user from session (if present); anonymous remains allowed
    let clientUserId = null;
    const sessionClerkId = getClerkUserId(req);
    if (sessionClerkId) {
      const { user } = await getDbUserByClerkId(sessionClerkId, { createIfMissing: true });
      clientUserId = user?.id || null;
    }

    let assignedAgentId = null;
    if (parsedPropertyOwnerId) {
      const { data: ownerAgent } = await db
        .from('agents')
        .select('id')
        .eq('user_id', parsedPropertyOwnerId)
        .single();

      assignedAgentId = ownerAgent?.id || null;
    }

    // Create service request
    const { data, error } = await db
      .from('service_requests')
      .insert([{
        client_user_id: clientUserId,
        client_name: parsedClientName,
        client_email: parsedClientEmail,
        client_phone: parsedClientPhone,
        request_type: parsedRequestType,
        property_type: parsedPropertyType,
        parish: parsedParish,
        location: parsedLocation,
        budget_min: parsedBudgetMin,
        budget_max: parsedBudgetMax,
        bedrooms: parsedBedrooms,
        bathrooms: parsedBathrooms,
        description: parsedDescription,
        urgency: parsedUrgency,
        status: assignedAgentId ? 'assigned' : 'open',
        assigned_agent_id: assignedAgentId,
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create service request' });
    }

    if (assignedAgentId && data?.id) {
      await db
        .from('agent_notifications')
        .insert([{
          agent_id: assignedAgentId,
          notification_type: 'new_request',
          message: `New Property Inquiry: ${parsedClientName}`,
          service_request_id: data.id,
          is_read: false,
        }]);
    }

    // Automatically assign to a paid agent using fair distribution
    // Skip auto-assignment for leads from ads pages
    if (!parsedFromAds && !assignedAgentId && data?.id) {
      try {
        await assignRequestRoundRobin(data.id);
      } catch {
      }
    }

    return res.status(200).json({ 
      success: true,
      request: data,
      message: 'Service request submitted successfully'
    });

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
