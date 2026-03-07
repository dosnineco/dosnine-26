import { getDbClient, requireAdminUser } from '../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const db = getDbClient();
    const tab = req.query.tab === 'users' ? 'users' : 'emails';

    if (tab === 'users') {
      const { data, error } = await db
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        tab: 'users',
        users: data || [],
      });
    }

    const { data, error } = await db
      .from('service_requests')
      .select('id, client_name, client_email, client_phone, request_type, property_type, location, status, urgency, created_at')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      tab: 'emails',
      visitorEmails: data || [],
    });
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Failed to fetch dashboard data';
    return res.status(500).json({ error: message });
  }
}
