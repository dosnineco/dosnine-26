import { z } from 'zod';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { enforceMethods, isBotLikely, sanitizeString } from '@/lib/apiSecurity';
import { getDbClient } from '@/lib/apiAuth';

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
      session_id: z.string().trim().max(120).nullable().optional(),
      website: z.string().optional(),
      company: z.string().optional(),
      url: z.string().optional(),
    }).parse(req.body || {});

    if (isBotLikely(data)) {
      return res.status(200).json({ success: true, message: 'Analytics tracked successfully' });
    }

    const path = String(data.page_url || '/').split('?')[0].slice(0, 2000);
    const propertyMatch = path.match(/^\/property\/([^/]+)$/);
    const advertisementMatch = path.match(/^\/ads\/([0-9a-f-]{36})$/i);
    const db = getDbClient();
    let propertyId = null;

    if (propertyMatch?.[1]) {
      const { data: property } = await db
        .from('properties')
        .select('id')
        .eq('slug', propertyMatch[1])
        .maybeSingle();
      propertyId = property?.id || null;
    }

    const { error } = await db.from('page_clicks').insert([{
      path,
      source: 'site_page_view',
      referrer: String(req.headers.referer || '').slice(0, 2000) || null,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 1000) || null,
      session_id: data.session_id || null,
      property_id: propertyId,
      advertisement_id: advertisementMatch?.[1] || null,
    }]);

    if (error) {
      console.error('Analytics insert failed:', error);
      return res.status(500).json({ error: 'Failed to track analytics' });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Analytics tracked successfully'
    });

  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request payload' });
    }

    return res.status(500).json({ error: 'Failed to track analytics' });
  }
}
