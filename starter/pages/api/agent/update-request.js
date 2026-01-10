import { supabaseAdmin } from '../../../lib/supabaseAdmin';
const supabase = supabaseAdmin;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clerkId, requestId, action, comment } = req.body;

  if (!clerkId || !requestId || !action) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Get user first, then agent
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }

    // Check if user is admin (for remove action)
    const isAdmin = user.role === 'admin';

    // Verify agent exists and is verified + paid (unless admin)
    let agent = null;
    if (!isAdmin) {
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .eq('verification_status', 'approved')
        .eq('payment_status', 'paid')
        .single();

      if (agentError || !agentData) {
        return res.status(403).json({ error: 'Agent not found or not authorized' });
      }

      agent = agentData;
    }

    // Verify the request belongs to this agent (or is admin)
    let request;
    if (isAdmin) {
      const { data: req_data, error: requestError } = await supabase
        .from('service_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !req_data) {
        return res.status(404).json({ error: 'Request not found' });
      }
      request = req_data;
    } else {
      const { data: req_data, error: requestError } = await supabase
        .from('service_requests')
        .select('*')
        .eq('id', requestId)
        .eq('assigned_agent_id', agent.id)
        .single();

      if (requestError || !req_data) {
        return res.status(404).json({ error: 'Request not found or not assigned to you' });
      }
      request = req_data;
    }

    let updateData = {};

    switch (action) {
      case 'complete':
        // Mark as completed
        updateData = {
          status: 'completed',
          completed_at: new Date().toISOString(),
        };
        break;

      case 'contacted':
        // Toggle contacted status
        updateData = {
          is_contacted: !request.is_contacted,
        };
        break;

      case 'comment':
        // Save comment
        if (!comment || !comment.trim()) {
          return res.status(400).json({ error: 'Comment cannot be empty' });
        }
        updateData = {
          comment: comment,
          comment_updated_at: new Date().toISOString(),
        };
        break;

      case 'release':
        // Release back to queue - assign to next agent
        // First, set status to open
        updateData = {
          status: 'open',
          assigned_agent_id: null,
        };

        // Update the request
        const { error: releaseError } = await supabase
          .from('service_requests')
          .update(updateData)
          .eq('id', requestId);

        if (releaseError) {
          throw releaseError;
        }

        // Now auto-assign to next available agent
        // Get next agent in queue (oldest last_request_assigned_at)
        const { data: nextAgent, error: nextAgentError } = await supabase
          .from('agents')
          .select('id')
          .eq('verification_status', 'approved')
          .eq('payment_status', 'paid')
          .neq('id', agent.id) // Don't assign back to same agent
          .order('last_request_assigned_at', { ascending: true, nullsFirst: true })
          .limit(1)
          .single();

        if (nextAgent && !nextAgentError) {
          // Assign to next agent
          const now = new Date().toISOString();
          const { error: assignError } = await supabase
            .from('service_requests')
            .update({
              assigned_agent_id: nextAgent.id,
              status: 'assigned',
              assigned_at: now,
            })
            .eq('id', requestId);

          if (!assignError) {
            // Update agent's last_request_assigned_at
            await supabase
              .from('agents')
              .update({ last_request_assigned_at: now })
              .eq('id', nextAgent.id);
          }
        }

        return res.status(200).json({ 
          success: true,
          message: 'Request released and reassigned to next agent',
          reassigned: !!nextAgent
        });

      case 'remove':
        // Only admins can remove
        if (!isAdmin) {
          return res.status(403).json({ error: 'Only admins can remove requests' });
        }
        // Mark as cancelled/removed
        updateData = {
          status: 'cancelled',
          assigned_agent_id: null,
        };
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    // Update the request
    const { error: updateError } = await supabase
      .from('service_requests')
      .update(updateData)
      .eq('id', requestId);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({ 
      success: true,
      message: `Request ${action}d successfully`
    });

  } catch (error) {
    console.error('Error updating request:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Failed to update request';
    return res.status(500).json({ error: message });
  }
}
