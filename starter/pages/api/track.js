import { z } from 'zod';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { enforceMethods, isBotLikely, sanitizeString } from '@/lib/apiSecurity';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  try {
    const rate = await enforceRateLimitDistributed(req, res, {
      keyPrefix: 'analytics-track',
      maxRequests: 120,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }

    const data = z.object({
      event_type: z.string().trim().min(1).max(100),
      page_url: z.string().trim().max(2000).optional(),
      created_at: z.string().trim().max(100).optional(),
      website: z.string().optional(),
      company: z.string().optional(),
      url: z.string().optional(),
    }).parse(req.body || {});

    if (isBotLikely(data)) {
      return res.status(200).json({ success: true, message: 'Analytics tracked successfully' });
    }

    console.log('Analytics tracked:', {
      event: sanitizeString(data.event_type, 100),
      page: data.page_url ? sanitizeString(data.page_url, 2000) : null,
      timestamp: data.created_at ? sanitizeString(data.created_at, 100) : null,
    });

    return res.status(200).json({ 
      success: true,
      message: 'Analytics tracked successfully'
    });

  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request payload' });
    }

    console.error('Error tracking analytics');
    return res.status(500).json({ error: 'Failed to track analytics' });
  }
}
