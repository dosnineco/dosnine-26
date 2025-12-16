import { supabase } from '@/lib/supabase';

// Send notification when agent is approved/rejected
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agentId, userId, email, status, message } = req.body;

  if (!email || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Create notification record
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        notification_type: 'email',
        subject: status === 'approved' 
          ? '🎉 Your Agent Application Has Been Approved!'
          : 'Agent Application Update',
        message: message || (status === 'approved' 
          ? 'Congratulations! Your agent application has been approved. You can now start receiving client requests and posting properties.'
          : 'Your agent application has been reviewed. Please check your dashboard for more details.'),
        recipient_email: email,
        status: 'pending',
        related_entity_type: 'agent',
        related_entity_id: agentId,
      }])
      .select()
      .single();

    if (notifError) {
      console.error('Failed to create notification:', notifError);
      return res.status(500).json({ error: 'Failed to create notification' });
    }

    // In production, integrate with email service (SendGrid, Resend, etc.)
    // For now, just log it
    console.log('📧 Email notification queued:', {
      to: email,
      subject: notification.subject,
      status: status,
    });

    // TODO: Integrate with actual email service
    // Example with Resend:
    // await resend.emails.send({
    //   from: 'DosNine <notifications@dosnine.com>',
    //   to: email,
    //   subject: notification.subject,
    //   html: generateEmailTemplate(status, message)
    // });

    // Update notification status to sent
    await supabase
      .from('notifications')
      .update({ 
        status: 'sent', 
        sent_at: new Date().toISOString() 
      })
      .eq('id', notification.id);

    return res.status(200).json({ 
      success: true,
      notification,
      message: 'Notification sent successfully'
    });

  } catch (error) {
    console.error('Send notification error:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}
