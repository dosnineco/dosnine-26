import { getDbClient } from '@/lib/apiAuth';

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token' });
  }

  try {
    const db = getDbClient();

    /* ---------- GET — validate token before showing form ---------- */
    if (req.method === 'GET') {
      const { data, error } = await db
        .from('verification_sessions')
        .select(
          'id, verification_type, context_id, metadata, status, expires_at'
        )
        .eq('token', token)
        .maybeSingle();

      if (error) {
        console.error('[verification/sessions/[token]] get error:', error);
        return res.status(500).json({ error: error.message });
      }
      if (!data) {
        return res.status(404).json({ error: 'Invalid or expired link' });
      }
      if (new Date(data.expires_at) < new Date()) {
        return res.status(410).json({ error: 'This link has expired' });
      }
      if (data.status === 'completed') {
        return res.status(200).json({ success: true, alreadyCompleted: true });
      }
      if (data.status === 'cancelled') {
        return res.status(410).json({ error: 'This verification was cancelled' });
      }

      if (data.status === 'pending') {
        await db
          .from('verification_sessions')
          .update({
            status: 'mobile_opened',
            opened_at: new Date().toISOString(),
            ip_mobile:
              req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null,
            user_agent_mobile: req.headers['user-agent'] || null,
          })
          .eq('token', token);
      }

      return res.status(200).json({ success: true, session: data });
    }

    /* ---------- PATCH — mobile marks session complete ---------- */
    if (req.method === 'PATCH') {
      const { data, error } = await db
        .from('verification_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('token', token)
        .in('status', ['pending', 'mobile_opened'])
        .select('id')
        .maybeSingle();

      if (error) {
        return res.status(500).json({ error: error.message });
      }
      if (!data) {
        return res
          .status(409)
          .json({ error: 'Session already used or expired' });
      }
      return res.status(200).json({ success: true });
    }

    /* ---------- DELETE — desktop cancels ---------- */
    if (req.method === 'DELETE') {
      await db
        .from('verification_sessions')
        .update({ status: 'cancelled' })
        .eq('token', token)
        .in('status', ['pending', 'mobile_opened']);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[verification/sessions/[token]] unhandled:', err);
    return res
      .status(500)
      .json({ error: err?.message || 'Unexpected error' });
  }
}