import { requireAdminUser } from '../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const admin = resolved.user;
    if (!admin.email || !admin.full_name) {
      return res.status(403).json({ error: 'Access denied - Admin account incomplete' });
    }

    return res.status(200).json({
      isAdmin: true,
      userId: admin.id,
      email: admin.email,
      name: admin.full_name,
    });
  } catch (error) {
    console.error('Admin verification error:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Verification failed';
    return res.status(500).json({ error: message });
  }
}
