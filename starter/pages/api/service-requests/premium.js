import { getDbClient, requireDbUser } from '@/lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res);
    if (!resolved) return;

    const db = getDbClient();
    const userId = resolved.user.id;

    const {
      agentId,
      propertyType,
      location,
      budgetMin,
      budgetMax,
      bedrooms,
      bathrooms,
      timeline,
      requirements,
    } = req.body;

    // Validate required fields
    if (!agentId || !propertyType || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create service request
    const { data: serviceRequest, error: createError } = await db
      .from('service_requests')
      .insert({
        user_id: userId,
        agent_id: agentId,
        property_type: propertyType,
        location,
        budget_min: budgetMin,
        budget_max: budgetMax,
        bedrooms,
        bathrooms,
        timeline,
        requirements,
        status: 'pending',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating service request:', createError);
      return res.status(500).json({ error: 'Failed to create service request' });
    }

    // Create notification for the agent
    const { error: notificationError } = await db
      .from('agent_notifications')
      .insert({
        agent_id: agentId,
        service_request_id: serviceRequest.id,
        notification_type: 'new_request',
        is_read: false,
      });

    if (notificationError) {

      // Don't fail the entire request if notification fails
    }

    // Log the request
    console.log('New service request created:', {
      requestId: serviceRequest.id,
      userId,
      agentId,
      propertyType,
      location,
    });

    return res.status(200).json({
      success: true,
      message: 'Service request sent to agent',
      serviceRequest,
    });
  } catch (error) {
    console.error('Service request error:', error);
    return res.status(500).json({ error: 'Failed to create service request' });
  }
}
