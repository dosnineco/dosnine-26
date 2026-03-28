import { z } from 'zod';
import { requireAdminUser } from '@/lib/apiAuth';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { enforceMethods, parseBody } from '@/lib/apiSecurity';
import { assignRequestRoundRobin } from '@/lib/serviceRequestAllocation';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  try {
    const admin = await requireAdminUser(req, res);
    if (!admin) return;

    const rate = await enforceRateLimitDistributed(req, res, {
      keyPrefix: 'service-request-auto-assign',
      maxRequests: 60,
      windowMs: 60_000,
      identifier: String(admin.user.id),
    });

    if (!rate.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }

    const { requestId } = parseBody(
      z.object({
        requestId: z.string().uuid(),
      }),
      req.body
    );

    const result = await assignRequestRoundRobin(requestId);

    return res.status(200).json({
      success: result.success,
      message: result.message,
      assigned: result.assigned,
      agentId: result.agentId || null,
    });

  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request payload' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
