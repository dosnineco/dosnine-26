import { getDbClient } from '@/lib/apiAuth';

/* Simple per-IP throttle: 10 attempts / 5 minutes */
const attempts = new Map();

function allowed(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count += 1;
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (!allowed(ip)) {
    return res
      .status(429)
      .json({ error: 'Too many attempts. Try again in a few minutes.' });
  }

  try {
    const rawCode = String(req.body?.code || '').replace(/\D/g, '');
    if (rawCode.length !== 6) {
      return res.status(400).json({ error: 'Enter a 6-digit code' });
    }

    const db = getDbClient();

    const { data, error } = await db
      .from('verification_sessions')
      .select(
        'id, token, verification_type, context_id, metadata, status, expires_at'
      )
      .eq('short_code', rawCode)
      .in('status', ['pending', 'mobile_opened'])
      .maybeSingle();

    if (error) {
      console.error('[redeem] query error:', error);
      return res.status(500).json({ error: error.message });
    }
    if (!data) {
      return res
        .status(404)
        .json({ error: 'Invalid or expired code. Check the code and try again.' });
    }
    if (new Date(data.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This code has expired. Ask the desktop for a new one.' });
    }

    if (data.status === 'pending') {
      await db
        .from('verification_sessions')
        .update({
          status: 'mobile_opened',
          opened_at: new Date().toISOString(),
          ip_mobile: ip,
          user_agent_mobile: req.headers['user-agent'] || null,
        })
        .eq('id', data.id);
    }

    return res.status(200).json({
      success: true,
      token: data.token,
      session: {
        id: data.id,
        verification_type: data.verification_type,
        context_id: data.context_id,
        metadata: data.metadata,
        expires_at: data.expires_at,
      },
    });
  } catch (err) {
    console.error('[redeem] unhandled:', err);
    return res
      .status(500)
      .json({ error: err?.message || 'Unexpected error' });
  }
}