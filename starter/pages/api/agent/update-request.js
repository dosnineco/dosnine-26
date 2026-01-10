import { supabase } from '../../../lib/supabase';

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
        // Set status to open and clear assignment
        updateData = {
          status: 'open',
          assigned_agent_id: null,
        };

        // Update the request (guard by assigned agent when not admin)
        const baseRelease = supabase
          .from('service_requests')
          .update(updateData)
          .eq('id', requestId);

        const { error: releaseError } = isAdmin
          ? await baseRelease
          : await baseRelease.eq('assigned_agent_id', agent.id);

        if (releaseError) {
          throw releaseError;
        }

        // Do not reassign here to avoid RLS conflicts; client may call auto-assign
        return res.status(200).json({ 
          success: true,
          message: 'Request released to queue',
          reassigned: false
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
    const baseUpdate = supabase
      .from('service_requests')
      .update(updateData)
      .eq('id', requestId);

    const { error: updateError } = isAdmin
      ? await baseUpdate
      : await baseUpdate.eq('assigned_agent_id', agent.id);

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
