import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await getAllFeedback(req, res);
      case 'POST':
        return await sendFeedbackToAgents(req, res);
      case 'PUT':
        return await markResponseAsRead(req, res);
      case 'PATCH':
        return await updateFeedbackMessage(req, res);
      case 'DELETE':
        return await deleteFeedback(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAllFeedback(req, res) {
  const { clerkId } = req.query;

  if (!clerkId) {
    return res.status(400).json({ error: 'Clerk ID is required' });
  }

  try {
    // Verify admin access
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Fetch all feedback with agent details
    const { data: feedback, error: feedbackError } = await supabase
      .from('agent_feedback')
      .select(`
        *,
        agents (
          id,
          business_name,
          user_id,
          users (
            full_name,
            email,
            phone
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (feedbackError) {
      throw feedbackError;
    }

    // Count unread responses
    const unreadResponses = feedback?.filter(
      f => f.agent_response && !f.response_read
    ).length || 0;

    return res.status(200).json({ 
      feedback: feedback || [], 
      unreadResponses 
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch feedback' });
  }
}

async function sendFeedbackToAgents(req, res) {
  const { clerkId, message, agentIds } = req.body;

  if (!clerkId || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Verify admin access
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get target agents
    let targetAgents = agentIds;
    if (!agentIds || agentIds.length === 0) {
      // Send to all verified and paid agents
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('id')
        .eq('verification_status', 'approved')
        .eq('payment_status', 'paid');

      if (agentsError) {
        throw agentsError;
      }

      // If no verified/paid agents, try just verified agents
      if (!agents || agents.length === 0) {
        const { data: verifiedAgents, error: verifiedError } = await supabase
          .from('agents')
          .select('id')
          .eq('verification_status', 'approved');

        if (verifiedError) {
          throw verifiedError;
        }

        targetAgents = verifiedAgents?.map(a => a.id) || [];
      } else {
        targetAgents = agents.map(a => a.id);
      }
    }

    if (!targetAgents || targetAgents.length === 0) {
      return res.status(400).json({ error: 'No agents found to send message to' });
    }


    // Create feedback entries for each agent
    const feedbackEntries = targetAgents.map(agentId => ({
      agent_id: agentId,
      admin_message: message,
      admin_clerk_id: clerkId,
      message_read: false,
    }));

    const { data, error } = await supabase
      .from('agent_feedback')
      .insert(feedbackEntries)
      .select();

    if (error) {
      throw error;
    }


    return res.status(200).json({ 
      success: true, 
      count: data.length,
      feedback: data 
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to send feedback',
      details: error.message 
    });
  }
}

async function markResponseAsRead(req, res) {
  const { clerkId, feedbackId } = req.body;

  if (!clerkId || !feedbackId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Verify admin access
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Mark response as read
    const { error } = await supabase
      .from('agent_feedback')
      .update({ response_read: true })
      .eq('id', feedbackId);

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true });
  } catch (error) {

    return res.status(500).json({ error: 'Failed to mark as read' });
  }
}

async function updateFeedbackMessage(req, res) {
  const { clerkId, feedbackId, message } = req.body;

  if (!clerkId || !feedbackId || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Verify admin access
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Update message
    const { data, error } = await supabase
      .from('agent_feedback')
      .update({ admin_message: message })
      .eq('id', feedbackId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, feedback: data });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update feedback' });
  }
}

async function deleteFeedback(req, res) {
  const { clerkId, feedbackId } = req.query;

  if (!clerkId || !feedbackId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Verify admin access
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Delete feedback
    const { error } = await supabase
      .from('agent_feedback')
      .delete()
      .eq('id', feedbackId);

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete feedback' });
  }
}
