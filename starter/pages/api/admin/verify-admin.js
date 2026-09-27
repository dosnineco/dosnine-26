import { requireAdminUser } from '../../../lib/apiAuth';
import { enforceRateLimitDistributed } from '../../../lib/rateLimit';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  /* ----------------------------------------------------------
   * Rate limit: 10 requests per minute per IP.
   * The app calls this once per page load, so 10 is generous.
   * Anything past that is almost certainly a script.
   * ---------------------------------------------------------- */
  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'verify-admin',
    maxRequests: 10,
    windowMs: 60 * 1000,
  });

  if (!rate.allowed) {
    return res.status(429).json({
      error: 'Too many requests. Please slow down.',
      retryAfter: rate.retryAfterSeconds,
    });
  }

  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const admin = resolved.user;
    if (!admin.email || !admin.full_name) {
      return res.status(403).json({
        error: 'Access denied - Admin account incomplete',
      });
    }

    res.setHeader('Cache-Control', 'no-store, private, max-age=0');

    return res.status(200).json({
      isAdmin: true,
      userId: admin.id,
      email: admin.email,
      name: admin.full_name,
    });
  } catch (error) {
    console.error('Admin verification error:', error);
    const message =
      typeof error?.message === 'string' ? error.message : 'Verification failed';
    return res.status(500).json({ error: message });
  }
}