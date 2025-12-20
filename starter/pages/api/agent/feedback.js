import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await getFeedback(req, res);
      case 'POST':
        return await createResponse(req, res);
      case 'PUT':
        return await markAsRead(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getFeedback(req, res) {
  const { clerkId } = req.query;

  if (!clerkId) {
    return res.status(400).json({ error: 'Clerk ID is required' });
  }

  try {
    // Get user ID from clerk_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get agent ID from user_id
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Fetch all feedback for this agent
    const { data: feedback, error: feedbackError } = await supabase
      .from('agent_feedback')
      .select('*')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false });

    if (feedbackError) {
      throw feedbackError;
    }

    // Get unread count
    const unreadCount = feedback?.filter(f => !f.message_read).length || 0;

    return res.status(200).json({ 
      feedback: feedback || [], 
      unreadCount 
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch feedback' });
  }
}

async function createResponse(req, res) {
  const { clerkId, feedbackId, response } = req.body;

  if (!clerkId || !feedbackId || !response) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Get user ID from clerk_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify agent ownership
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Update feedback with agent response
    const { data, error } = await supabase
      .from('agent_feedback')
      .update({
        agent_response: response,
        responded_at: new Date().toISOString(),
        response_read: false, // Admin hasn't read it yet
      })
      .eq('id', feedbackId)
      .eq('agent_id', agent.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, feedback: data });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to submit response' });
  }
}

async function markAsRead(req, res) {
  const { clerkId, feedbackId } = req.body;

  if (!clerkId || !feedbackId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Get user ID from clerk_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify agent ownership
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Mark as read
    const { error } = await supabase
      .from('agent_feedback')
      .update({ message_read: true })
      .eq('id', feedbackId)
      .eq('agent_id', agent.id);

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to mark as read' });
  }
}
