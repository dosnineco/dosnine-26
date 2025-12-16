import { supabase } from '../../../lib/supabase';

/**
 * Fair Request Allocation Algorithm
 * Uses round-robin distribution based on last_request_assigned_at timestamp
 * Ensures equal opportunity for all verified and paid agents
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { requestId } = req.body;

  if (!requestId) {
    return res.status(400).json({ error: 'Request ID required' });
  }

  try {
    // Verify request exists and is open
    const { data: request, error: requestError } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'open')
      .single();

    if (requestError || !request) {
      return res.status(404).json({ error: 'Request not found or already assigned' });
    }

    // Get all verified and paid agents, sorted by last assignment (oldest first)
    // Agents who have never received a request (last_request_assigned_at IS NULL) get priority
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, full_name, email, last_request_assigned_at')
      .eq('verification_status', 'approved')
      .eq('payment_status', 'paid')
      .order('last_request_assigned_at', { ascending: true, nullsFirst: true })
      .limit(1);

    if (agentsError || !agents || agents.length === 0) {
      return res.status(404).json({ error: 'No available agents found' });
    }

    // The first agent in the sorted list is the one who should get the next request
    const selectedAgent = agents[0];
    const now = new Date().toISOString();

    // Assign request to agent
    const { error: assignError } = await supabase
      .from('service_requests')
      .update({
        assigned_agent_id: selectedAgent.id,
        status: 'assigned',
        assigned_at: now,
      })
      .eq('id', requestId);

    if (assignError) {
      throw assignError;
    }

    // Update agent's last_request_assigned_at to maintain fair rotation
    const { error: updateAgentError } = await supabase
      .from('agents')
      .update({ last_request_assigned_at: now })
      .eq('id', selectedAgent.id);

    if (updateAgentError) {
      console.error('Failed to update agent timestamp:', updateAgentError);
      // Don't fail the request if timestamp update fails
    }

    // Create notification for agent (if notifications table exists)
    try {
      await supabase
        .from('notifications')
        .insert({
          agent_id: selectedAgent.id,
          type: 'new_request',
          title: 'New Client Request',
          message: `You have a new ${request.request_type} request for ${request.property_type} in ${request.location}`,
          request_id: requestId,
          read: false,
        });
    } catch (notifError) {
      console.log('Notifications table may not exist yet');
    }

    return res.status(200).json({
      success: true,
      message: 'Request assigned successfully',
      agent: {
        id: selectedAgent.id,
        name: selectedAgent.full_name,
        email: selectedAgent.email,
      },
      algorithm: 'round-robin',
      reason: selectedAgent.last_request_assigned_at 
        ? `Agent last received request on ${new Date(selectedAgent.last_request_assigned_at).toLocaleString()}`
        : 'Agent has never received a request',
    });

  } catch (error) {
    console.error('Error assigning request:', error);
    return res.status(500).json({ error: 'Failed to assign request' });
  }
}
