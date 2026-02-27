import { getClerkUserId, getDbClient, getDbUserByClerkId } from '@/lib/apiAuth';
import { enforceRateLimit } from '@/lib/rateLimit';

function getInternalBaseUrl(req) {
  const origin = req.headers.origin;
  if (origin) return origin;

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'http';

  return host ? `${proto}://${host}` : 'http://localhost:3000';
}

// Create service request
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rate = enforceRateLimit(req, res, {
    keyPrefix: 'service-request-create',
    maxRequests: 10,
    windowMs: 60_000,
  });

  if (!rate.allowed) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  }

  const db = getDbClient();
  const {
    clientName,
    clientEmail,
    clientPhone,
    requestType,
    propertyType,
    location,
    parish,
    budgetMin,
    budgetMax,
    bedrooms,
    bathrooms,
    description,
    urgency,
    fromAds,
    propertyOwnerId,
  } = req.body;

  const parsedClientName = clientName || req.body.client_name;
  const parsedClientEmail = clientEmail || req.body.client_email;
  const parsedClientPhone = clientPhone || req.body.client_phone;
  const parsedRequestType = requestType || req.body.request_type;
  const parsedPropertyType = propertyType || req.body.property_type;
  const parsedLocation = location || req.body.location;
  const parsedParish = parish || req.body.parish || null;
  const parsedBudgetMin = budgetMin ?? req.body.budget_min ?? null;
  const parsedBudgetMax = budgetMax ?? req.body.budget_max ?? null;
  const parsedBedrooms = bedrooms ?? req.body.bedrooms ?? null;
  const parsedBathrooms = bathrooms ?? req.body.bathrooms ?? null;
  const parsedDescription = description || req.body.description || null;
  const parsedUrgency = urgency || req.body.urgency || 'normal';
  const parsedFromAds = Boolean(fromAds ?? req.body.from_ads);
  const parsedPropertyOwnerId = propertyOwnerId || req.body.property_owner_id || null;

  if (!parsedClientName || !parsedClientEmail || !parsedClientPhone || !parsedRequestType || !parsedPropertyType || !parsedLocation) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (
    String(parsedClientName).length > 120 ||
    String(parsedClientEmail).length > 254 ||
    String(parsedClientPhone).length > 40 ||
    String(parsedLocation).length > 255 ||
    (parsedParish && String(parsedParish).length > 120) ||
    (parsedDescription && String(parsedDescription).length > 5000)
  ) {
    return res.status(400).json({ error: 'One or more fields exceed allowed length' });
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
      return res.status(500).json({ 
        error: 'Failed to create service request',
        details: error.message || 'Unknown error'
      });
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
        const baseUrl = getInternalBaseUrl(req);
        await fetch(`${baseUrl}/api/service-requests/auto-assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: data.id })
        });
      } catch (assignError) {
        // Don't fail request creation if auto-assignment fails
        // Request will remain 'open' and can be manually assigned
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
