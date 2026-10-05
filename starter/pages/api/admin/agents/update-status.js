import { getDbClient, requireAdminUser } from '../../../../lib/apiAuth';
import { sendBrevoEmail } from '../../../../lib/serviceRequestAllocation';

const escapeHtml = (value) =>
  String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

// Approve or reject agent verification
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    /* ----------------------------------------------------------
     * 1. AUTH FIRST — always before touching req.body
     * ----------------------------------------------------------
     * Reject unauthenticated callers with 401/403 before any
     * validation happens, so the endpoint never confirms its
     * existence or shape to anonymous probes.
     * ---------------------------------------------------------- */
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const adminUser = resolved.user;

    // SECURITY FIX: Verify admin has valid email and name
    if (!adminUser?.email || !adminUser?.full_name) {
      console.error(
        '❌ SECURITY: Admin user has NULL data:',
        adminUser?.id || 'unknown'
      );
      return res
        .status(403)
        .json({ error: 'Access denied - Admin account incomplete' });
    }

    /* ----------------------------------------------------------
     * 2. VALIDATE INPUT — after auth passes
     * ---------------------------------------------------------- */
    const { agentId, status, notes } = req.body || {};

    if (!agentId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (typeof agentId !== 'string' || agentId.length > 100) {
      return res.status(400).json({ error: 'Invalid agentId' });
    }

    const db = getDbClient();

    /* ----------------------------------------------------------
     * 3. UPDATE AGENT
     * ---------------------------------------------------------- */
    const updateData = {
      verification_status: status,
      verification_reviewed_at: new Date().toISOString(),
      verification_notes:
        notes ||
        `${status === 'approved' ? 'Approved' : 'Rejected'} by ${
          adminUser.full_name
        }`,
    };

    // When approving, set payment_status to unpaid and update user role
    if (status === 'approved') {
      // Default newly approved agents to the free plan (aligns with
      // current payment_status constraint)
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
      .select(
        'id, user_id, verification_status, verification_reviewed_at, verification_notes, payment_status'
      )
      .single();

    if (agentUpdateError || !updatedAgent) {
      console.error('Failed to update agent:', agentUpdateError);
      return res
        .status(500)
        .json({ error: 'Failed to update agent status' });
    }

    // Fetch user separately to avoid joined select failures under RLS
    const { data: agentUser, error: agentUserError } = await db
      .from('users')
      .select('email, full_name')
      .eq('id', updatedAgent.user_id)
      .single();

    if (agentUserError || !agentUser) {
      console.error(
        'Failed to fetch agent user for notification:',
        agentUserError
      );
      return res
        .status(500)
        .json({ error: 'Failed to fetch agent user' });
    }

    /* ----------------------------------------------------------
     * 4. NOTIFY THE AGENT (non-blocking)
     * ---------------------------------------------------------- */
    let emailWarning = null;
    try {
      const notificationMessage =
        notes ||
        (status === 'approved'
          ? 'Congratulations! Your agent application has been approved. You can now access your agent dashboard to view client requests and post properties.'
          : `Your agent application has been ${status}. ${notes || ''}`);

      let emailSent = false;
      if (status === 'approved') {
        const recipient = String(agentUser.email || '').trim();
        if (!recipient || recipient.endsWith('@dosnine.local')) {
          throw new Error('Agent email address is unavailable.');
        }
        const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dosnine.com').replace(/\/+$/, '');
        const dashboardUrl = `${siteUrl}/agent/dashboard`;
        await sendBrevoEmail({
          to: recipient,
          subject: 'Your Dosnine agent account is approved',
          htmlContent: `
            <h2>Your agent account is approved</h2>
            <p>Hi ${escapeHtml(agentUser.full_name || 'there')},</p>
            <p>Your Dosnine agent application has been approved. You can now sign in to access your agent profile and dashboard.</p>
            <p><a href="${dashboardUrl}">Sign in to your agent dashboard</a></p>
            <p>Thank you,<br />Dosnine</p>
          `,
          textContent: [
            'Your agent account is approved',
            `Hi ${agentUser.full_name || 'there'},`,
            'Your Dosnine agent application has been approved. You can now sign in to access your agent profile and dashboard.',
            `Sign in to your agent dashboard: ${dashboardUrl}`,
            'Thank you, Dosnine',
          ].join('\n\n'),
        });
        emailSent = true;
      }

      const { data: notification, error: notificationError } = await db
        .from('notifications')
        .insert([
          {
            user_id: updatedAgent.user_id,
            notification_type: 'email',
            subject:
              status === 'approved'
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
        if (emailSent) {
          const { error: notificationUpdateError } = await db
            .from('notifications')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', notification.id);
          if (notificationUpdateError) {
            console.error('Failed to mark agent approval notification as sent:', notificationUpdateError);
          }
        }
      }
    } catch (notifError) {
      emailWarning = 'Agent account approved, but the confirmation email could not be sent.';
      console.error('Failed to send agent status notification:', notifError);
    }

    return res.status(200).json({
      success: true,
      agent: {
        ...updatedAgent,
        user: agentUser,
      },
      message: `Agent ${status} successfully`,
      emailWarning,
    });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}