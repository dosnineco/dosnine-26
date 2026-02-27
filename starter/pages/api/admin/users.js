import { getDbClient, requireAdminUser } from '../../../lib/apiAuth';

export default async function handler(req, res) {
  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const db = getDbClient();

    if (req.method === 'GET') {
      const { data, error } = await db
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        users: data || [],
      });
    }

    if (req.method === 'PATCH') {
      const { id, full_name, email, phone, role } = req.body || {};

      if (!id || !full_name || !email || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { data, error } = await db
        .from('users')
        .update({
          full_name,
          email,
          phone: phone || null,
          role,
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        user: data,
      });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: 'Missing user id' });
      }

      if (id === resolved.user.id) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
      }

      const { error } = await db
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in admin users API:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Request failed';
    return res.status(500).json({ error: message });
  }
}
