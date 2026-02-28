import { z } from 'zod';
import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods, parseBody, sanitizeString } from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';

export default async function handler(req, res) {
  const { method } = req;
  if (!enforceMethods(req, res, ['GET', 'POST', 'PUT'])) return;

  try {
    const resolved = await requireDbUser(req, res);
    if (!resolved) return;

    const rate = await enforceRateLimitDistributed(req, res, {
      keyPrefix: 'agent-feedback',
      maxRequests: 90,
      windowMs: 60_000,
      identifier: String(resolved.user.id),
    });

    if (!rate.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }

    switch (method) {
      case 'GET':
        return await getFeedback(req, res, resolved.user.id);
      case 'POST':
        return await createResponse(req, res, resolved.user.id);
      case 'PUT':
        return await markAsRead(req, res, resolved.user.id);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function resolveAgentIdByUserId(db, userId) {
  const { data: agent, error: agentError } = await db
    .from('agents')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (agentError || !agent) {
    return null;
  }

  return agent.id;
}

async function getFeedback(req, res, userId) {
  try {
    const db = getDbClient();
    const agentId = await resolveAgentIdByUserId(db, userId);

    if (!agentId) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { data: feedback, error: feedbackError } = await db
      .from('agent_feedback')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (feedbackError) {
      return res.status(500).json({ error: 'Failed to fetch feedback' });
    }

    const unreadCount = feedback?.filter(f => !f.message_read).length || 0;

    return res.status(200).json({ 
      feedback: feedback || [], 
      unreadCount 
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch feedback' });
  }
}

async function createResponse(req, res, userId) {
  try {
    const payload = parseBody(
      z.object({
        feedbackId: z.string().uuid(),
        response: z.string().min(1).max(5000),
      }),
      req.body
    );

    const db = getDbClient();
    const agentId = await resolveAgentIdByUserId(db, userId);
    if (!agentId) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const safeResponse = sanitizeString(payload.response, 5000);

    const { data, error } = await db
      .from('agent_feedback')
      .update({
        agent_response: safeResponse,
        responded_at: new Date().toISOString(),
        response_read: false,
      })
      .eq('id', payload.feedbackId)
      .eq('agent_id', agentId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to submit response' });
    }

    return res.status(200).json({ success: true, feedback: data });
  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request payload' });
    }

    return res.status(500).json({ error: 'Failed to submit response' });
  }
}

async function markAsRead(req, res, userId) {
  try {
    const payload = parseBody(
      z.object({
        feedbackId: z.string().uuid(),
      }),
      req.body
    );

    const db = getDbClient();
    const agentId = await resolveAgentIdByUserId(db, userId);
    if (!agentId) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { error } = await db
      .from('agent_feedback')
      .update({ message_read: true })
      .eq('id', payload.feedbackId)
      .eq('agent_id', agentId);

    if (error) {
      return res.status(500).json({ error: 'Failed to mark as read' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request payload' });
    }

    return res.status(500).json({ error: 'Failed to mark as read' });
  }
}
