import { getDbClient, requireAdminUser } from '../../../../lib/apiAuth';

// Approve or reject agent verification
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agentId, status, notes } = req.body;

  if (!agentId || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate status
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;
    const adminUser = resolved.user;
    const db = getDbClient();

    if (!adminUser) {
      return res.status(403).json({ error: 'Access denied - Admin only' });
    }

    // SECURITY FIX: Verify admin has valid email and name
    if (!adminUser.email || !adminUser.full_name) {
      console.error('❌ SECURITY: Admin user has NULL data:', adminUser.id);
      return res.status(403).json({ error: 'Access denied - Admin account incomplete' });
    }

    // Update agent verification status
    const updateData = {
      verification_status: status,
      verification_reviewed_at: new Date().toISOString(),
      verification_notes: notes || `${status === 'approved' ? 'Approved' : 'Rejected'} by ${adminUser.full_name}`,
    };

    // When approving, set payment_status to unpaid and update user role
    if (status === 'approved') {
      // Default newly approved agents to the free plan (aligns with current payment_status constraint)
      updateData.payment_status = 'free';
      
      // First get the agent's user_id
      const { data: agentData, error: agentFetchError } = await db
        .from('agents')
        .select('user_id')
        .eq('id', agentId)
        .single();
      
      if (agentFetchError || !agentData) {
        console.error('Failed to fetch agent data:', agentFetchError);
        return res.status(500).json({ error: 'Failed to fetch agent data' });
      }
      
      // Update user role to 'agent'
      const { error: userError } = await db
        .from('users')
        .update({ role: 'agent' })
        .eq('id', agentData.user_id);
      
      if (userError) {
        console.error('Failed to update user role:', userError);
        return res.status(500).json({ error: 'Failed to update user role' });
      }
      
      console.log(`✓ Agent ${agentId} approved - User role updated to 'agent'`);
    }

    const { data: updatedAgent, error: agentUpdateError } = await db
      .from('agents')
      .update(updateData)
      .eq('id', agentId)
      .select('id, user_id, verification_status, verification_reviewed_at, verification_notes, payment_status')
      .single();

    if (agentUpdateError || !updatedAgent) {
      console.error('Failed to update agent:', agentUpdateError);
      return res.status(500).json({ error: 'Failed to update agent status' });
    }

    // Fetch user separately to avoid joined select failures under RLS
    const { data: agentUser, error: agentUserError } = await db
      .from('users')
      .select('email, full_name')
      .eq('id', updatedAgent.user_id)
      .single();

    if (agentUserError || !agentUser) {
      console.error('Failed to fetch agent user for notification:', agentUserError);
      return res.status(500).json({ error: 'Failed to fetch agent user' });
    }
    // Queue notification for agent without internal API call
    try {
      const notificationMessage = notes || (status === 'approved'
        ? 'Congratulations! Your agent application has been approved. You can now access your agent dashboard to view client requests and post properties.'
        : `Your agent application has been ${status}. ${notes || ''}`);

      const { data: notification, error: notificationError } = await db
        .from('notifications')
        .insert([
          {
            user_id: updatedAgent.user_id,
            notification_type: 'email',
            subject: status === 'approved'
              ? '🎉 Your Agent Application Has Been Approved!'
              : 'Agent Application Update',
            message: notificationMessage,
            recipient_email: agentUser.email,
            status: 'pending',
            related_entity_type: 'agent',
            related_entity_id: agentId,
          },
        ])
        .select('id')
        .single();

      if (!notificationError && notification?.id) {
        await db
          .from('notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', notification.id);
      }
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
      // Don't fail the request if notification fails
    }
    return res.status(200).json({ 
      success: true,
      agent: {
        ...updatedAgent,
        user: agentUser,
      },
      message: `Agent ${status} successfully`
    });

  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
