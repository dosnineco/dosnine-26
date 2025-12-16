import { supabase } from '../../../lib/supabase';

/**
 * Fair Request Allocation Algorithm - Round-Robin Distribution
 * Distributes client requests evenly among all verified and paid agents
 * Based on last_request_assigned_at timestamp to ensure fairness
 * 
 * Algorithm:
 * 1. Query all eligible agents (verified + paid)
 * 2. Sort by last_request_assigned_at (ASC, NULL first)
 * 3. Assign to agent at top of list (least recently assigned)
 * 4. Update agent timestamp to move them to back of queue
 * 
 * This ensures:
 * - New agents get priority (NULL timestamp)
 * - Agents who haven't received requests recently get next opportunity
 * - Equal distribution over time
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
    // Get all paid agents eligible to receive requests
    const { data: paidAgents, error: agentsError } = await supabase
      .from('agents')
      .select('id, user_id, last_request_assigned_at')
      .eq('verification_status', 'approved')
      .eq('payment_status', 'paid')
      .order('last_request_assigned_at', { ascending: true, nullsFirst: true });

    if (agentsError || !paidAgents || paidAgents.length === 0) {
      return res.status(200).json({ 
        success: false, 
        message: 'No paid agents available',
        assigned: false 
      });
    }

    // Round-robin: Assign to agent who received request longest ago (or never)
    const selectedAgent = paidAgents[0];

    // Check if request is already assigned
    const { data: existingRequest } = await supabase
      .from('service_requests')
      .select('assigned_agent_id, status')
      .eq('id', requestId)
      .single();

    if (existingRequest?.assigned_agent_id) {
      return res.status(200).json({
        success: false,
        message: 'Request already assigned',
        assigned: true,
        agentId: existingRequest.assigned_agent_id
      });
    }

    // Assign request to selected agent
    const { error: assignError } = await supabase
      .from('service_requests')
      .update({
        assigned_agent_id: selectedAgent.id,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (assignError) {
      return res.status(500).json({ error: 'Failed to assign request' });
    }

    // Update agent's last assignment timestamp
    await supabase
      .from('agents')
      .update({
        last_request_assigned_at: new Date().toISOString()
      })
      .eq('id', selectedAgent.id);

    // Create notification for agent
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: selectedAgent.user_id,
          notification_type: 'email',
          subject: 'New Client Request Assigned',
          message: 'You have received a new client request. Check your agent dashboard to view details.',
          related_entity_type: 'service_request',
          related_entity_id: requestId,
          status: 'pending'
        });
    } catch (notifError) {
      // Don't fail if notification fails
    }

    return res.status(200).json({
      success: true,
      message: 'Request assigned successfully',
      assigned: true,
      agentId: selectedAgent.id
    });

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
