import { z } from 'zod';
import { requireAdminUser } from '@/lib/apiAuth';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { enforceMethods, parseBody } from '@/lib/apiSecurity';
import { assignRequestRoundRobin } from '@/lib/serviceRequestAllocation';

/**
 * Fair Request Allocation Algorithm - Round-Robin Distribution
 * Distributes client requests evenly among all verified and paid agents
 * Based on last_request_assigned_at timestamp to ensure fairness
 * 
 * Algorithm:
 * 1. Query all eligible agents (verified + paid)
 * 2. Sort by last_request_assigned_at (ASC, NULL first)
 * 3. Assign to agent at top of list (least recently assigned)
 * 4. Update agent timestamp to move them to back of queue
 * 
 * This ensures:
 * - New agents get priority (NULL timestamp)
 * - Agents who haven't received requests recently get next opportunity
 * - Equal distribution over time
 */

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
