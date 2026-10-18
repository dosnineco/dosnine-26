import { getAuth } from '@clerk/nextjs/server';
import { verifyToken } from '@clerk/backend';
import { getDbClient } from '@/lib/apiAuth';
import crypto from 'crypto';

async function resolveUserId(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      if (payload?.sub) return payload.sub;
    } catch (err) {
      console.warn('[verification/sessions] Bearer verify failed:', err.message);
    }
  }
  const { userId } = getAuth(req);
  return userId || null;
}

function generateSixDigitCode() {
  // 000000–999999, zero-padded
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}

async function insertWithCode(db, payload) {
  // Retry on partial-unique violation (23505) for short_code
  for (let attempt = 0; attempt < 6; attempt++) {
    const shortCode = generateSixDigitCode();
    const { data, error } = await db
      .from('verification_sessions')
      .insert({ ...payload, short_code: shortCode })
      .select('id, token, short_code, expires_at')
      .single();

    if (error) {
      if (error.code === '23505' && /short_code/i.test(error.message)) {
        continue; // collision — try a new code
      }
      throw error;
    }
    return data;
  }
  throw new Error('Could not allocate a unique verification code');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not signed in' });
    }

    const { verificationType, contextId, metadata } = req.body || {};
    if (!verificationType) {
      return res.status(400).json({ error: 'verificationType is required' });
    }

    const db = getDbClient();
    const token = crypto.randomBytes(24).toString('base64url');

    const data = await insertWithCode(db, {
      user_clerk_id: userId,
      token,
      verification_type: verificationType,
      context_id: contextId || null,
      metadata: metadata || {},
      ip_desktop:
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null,
    });

    return res.status(200).json({
      success: true,
      sessionId: data.id,
      token: data.token,
      shortCode: data.short_code,
      expiresAt: data.expires_at,
      mobileUrl: '/verify/mobile',
    });
  } catch (err) {
    console.error('[verification/sessions] unhandled:', err);
    return res
      .status(500)
      .json({ error: err?.message || 'Failed to create session' });
  }
}