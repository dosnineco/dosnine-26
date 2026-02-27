import { getDbClient } from '@/lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDbClient();

    const [{ data: serviceRequests, error: serviceError }, { data: visitorEmails, error: visitorError }] = await Promise.all([
      db
        .from('service_requests')
        .select('id, request_type, bedrooms, location, parish, budget_min, budget_max, created_at, status, is_contacted')
        .eq('status', 'open')
        .or('is_contacted.is.null,is_contacted.eq.false')
        .order('created_at', { ascending: false })
        .limit(24),
      db
        .from('visitor_emails')
        .select('id, created_at, bedrooms, area, parish, budget_min, email_status')
        .order('created_at', { ascending: false })
        .limit(24),
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
      requests: combinedRequests.slice(0, 25),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
