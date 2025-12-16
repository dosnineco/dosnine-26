import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  const { agentId } = req.query;

  if (!agentId) {
    return res.status(400).json({ error: 'Agent ID is required' });
  }

  if (req.method === 'GET') {
    // Get all notifications for an agent
    try {
      const { data: notifications, error } = await supabase
        .from('agent_notifications')
        .select(`
          id,
          agent_id,
          service_request_id,
          notification_type,
          is_read,
          read_at,
          created_at,
          service_requests (
            id,
            user_id,
            property_type,
            location,
            budget_min,
            budget_max,
            bedrooms,
            bathrooms,
            timeline,
            requirements,
            status,
            created_at,
            users (
              id,
              full_name,
              email,
              phone
            )
          )
        `)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ error: 'Failed to fetch notifications' });
      }

      // Count unread notifications
      const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

      return res.status(200).json({
        success: true,
        notifications: notifications || [],
        unreadCount,
      });
    } catch (error) {
      console.error('Notifications fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  if (req.method === 'PUT') {
    // Mark notification as read
    const { notificationId, isRead } = req.body;

    if (!notificationId) {
      return res.status(400).json({ error: 'Notification ID is required' });
    }

    try {
      const { data: updated, error } = await supabase
        .from('agent_notifications')
        .update({
          is_read: isRead,
          read_at: isRead ? new Date().toISOString() : null,
        })
        .eq('id', notificationId)
        .eq('agent_id', agentId)
        .select()
        .single();

      if (error) {
        console.error('Error updating notification:', error);
        return res.status(500).json({ error: 'Failed to update notification' });
      }

      return res.status(200).json({
        success: true,
        notification: updated,
      });
    } catch (error) {
      console.error('Notification update error:', error);
      return res.status(500).json({ error: 'Failed to update notification' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
