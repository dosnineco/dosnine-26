import { getDbClient, requireDbUser } from '../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { requestId, action, comment } = req.body;

  if (!requestId || !action) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const resolved = await requireDbUser(req, res);
    if (!resolved) return;

    const db = getDbClient();
    const user = resolved.user;
    const isAdmin = user.role === 'admin';

    let agent = null;
    if (!isAdmin) {
      const { data: agentData, error: agentError } = await db
        .from('agents')
        .select('id, payment_status, access_expiry')
        .eq('user_id', user.id)
        .eq('verification_status', 'approved')
        .single();

      if (agentError || !agentData) {
        return res.status(403).json({ error: 'Agent not found or not authorized' });
      }

      const paidPlans = ['7-day', '30-day', '90-day'];
      if (paidPlans.includes(agentData.payment_status) && agentData.access_expiry) {
        const isExpired = new Date(agentData.access_expiry) <= new Date();
        if (isExpired) {
          return res.status(403).json({ error: 'Your agent access has expired. Please renew to continue.' });
        }
      }

      agent = agentData;
    }

    let request;
    if (isAdmin) {
      const { data: reqData, error: requestError } = await db
        .from('service_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !reqData) {
        return res.status(404).json({ error: 'Request not found' });
      }
      request = reqData;
    } else {
      const { data: reqData, error: requestError } = await db
        .from('service_requests')
        .select('*')
        .eq('id', requestId)
        .eq('assigned_agent_id', agent.id)
        .single();

      if (requestError || !reqData) {
        return res.status(404).json({ error: 'Request not found or not assigned to you' });
      }
      request = reqData;
    }

    let updateData = {};

    switch (action) {
      case 'complete':
        updateData = {
          status: 'completed',
          completed_at: new Date().toISOString(),
        };
        break;

      case 'contacted':
        updateData = {
          is_contacted: !request.is_contacted,
        };
        break;

      case 'comment':
        if (!comment || !comment.trim()) {
          return res.status(400).json({ error: 'Comment cannot be empty' });
        }
        updateData = {
          comment,
          comment_updated_at: new Date().toISOString(),
        };
        break;

      case 'release': {
        updateData = {
          status: 'open',
          assigned_agent_id: null,
        };

        const baseRelease = db
          .from('service_requests')
          .update(updateData)
          .eq('id', requestId);

        const { error: releaseError } = isAdmin
          ? await baseRelease
          : await baseRelease.eq('assigned_agent_id', agent.id);

        if (releaseError) throw releaseError;

        return res.status(200).json({
          success: true,
          message: 'Request released to queue',
          reassigned: false,
        });
      }

      case 'remove':
        if (!isAdmin) {
          return res.status(403).json({ error: 'Only admins can remove requests' });
        }
        updateData = {
          status: 'cancelled',
          assigned_agent_id: null,
        };
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    const baseUpdate = db
      .from('service_requests')
      .update(updateData)
      .eq('id', requestId);

    const { error: updateError } = isAdmin
      ? await baseUpdate
      : await baseUpdate.eq('assigned_agent_id', agent.id);

    if (updateError) throw updateError;

    return res.status(200).json({
      success: true,
      message: `Request ${action}d successfully`,
    });
  } catch (error) {
    console.error('Error updating request:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Failed to update request';
    return res.status(500).json({ error: message });
  }
}
