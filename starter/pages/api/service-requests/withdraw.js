import { getDbClient, requireDbUser } from '@/lib/apiAuth';

// Withdraw service request
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { requestId } = req.body;

  if (!requestId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const resolved = await requireDbUser(req, res);
    if (!resolved) return;
    const db = getDbClient();
    const userId = resolved.user.id;

    // Verify request belongs to user
    const { data: request } = await db
      .from('service_requests')
      .select('*')
      .eq('id', requestId)
      .eq('client_user_id', userId)
      .single();

    if (!request) {
      return res.status(403).json({ error: 'Request not found or access denied' });
    }

    if (request.status === 'withdrawn') {
      return res.status(400).json({ error: 'Request already withdrawn' });
    }

    // Update request status to withdrawn
    const { data, error } = await db
      .from('service_requests')
      .update({
        status: 'withdrawn',
        withdrawn_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Failed to withdraw request:', error);
      return res.status(500).json({ error: 'Failed to withdraw request' });
    }

    return res.status(200).json({ 
      success: true,
      request: data,
      message: 'Request withdrawn successfully'
    });

  } catch (error) {
    console.error('Withdraw request error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
