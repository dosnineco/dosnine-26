import { getDbClient, requireDbUser } from '../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res, { createIfMissing: true });
    if (!resolved) return;

    const db = getDbClient();
    const clerkId = resolved.clerkId;

    const { data: userDataRaw } = await db
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single();

    const userData = userDataRaw || resolved.user || {
      clerk_id: clerkId,
      role: 'user',
    };

    const { data: agentDataRaw } = await db
      .from('agents')
      .select('*')
      .eq('user_id', userData.id)
      .maybeSingle();

    const agentData = agentDataRaw || null;

    // Return user with normalized agent data
    return res.status(200).json({
      ...userData,
      agent: agentData
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
