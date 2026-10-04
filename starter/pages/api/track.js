import { z } from 'zod';
import { getAuth } from '@clerk/nextjs/server';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { enforceMethods } from '@/lib/apiSecurity';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const EventSchema = z.object({
  event_type: z.string().trim().min(1).max(50).default('page_view'),
  path: z.string().trim().min(1).max(2000),
  page_url: z.string().trim().max(2000).optional().nullable(),
  referrer: z.string().trim().max(2000).optional().nullable(),
  session_id: z.string().trim().max(120).optional().nullable(),
  clerk_user_id: z.string().trim().max(120).optional().nullable(),
  is_authenticated: z.boolean().optional().default(false),
  device_type: z.string().trim().max(20).optional().nullable(),
  browser: z.string().trim().max(40).optional().nullable(),
  os: z.string().trim().max(40).optional().nullable(),
  language: z.string().trim().max(20).optional().nullable(),
  screen_width: z.number().int().positive().max(10000).optional().nullable(),
  screen_height: z.number().int().positive().max(10000).optional().nullable(),
  time_on_page_ms: z.number().int().nonnegative().max(86_400_000).optional().nullable(),
  scroll_depth: z.number().int().min(0).max(100).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  try {
    const rate = await enforceRateLimitDistributed(req, res, {
      keyPrefix: 'analytics-track',
      maxRequests: 180,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return res.status(429).json({ error: 'Too many requests.' });
    }

    const clerkUserId = getAuth(req).userId;
    if (clerkUserId) {
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('clerk_id', clerkUserId)
        .maybeSingle();

      if (userError) {
        console.error('Analytics admin check failed:', userError);
        return res.status(500).json({ error: 'Failed to track analytics' });
      }

      if (user?.role === 'admin') {
        return res.status(200).json({ success: true });
      }
    }

    const parsed = EventSchema.parse(req.body || {});
    const path = parsed.path.split('?')[0].slice(0, 2000);

    // Resolve property / ad IDs from the path
    const propertyMatch = path.match(/^\/property\/([^/]+)$/);
    const adMatch = path.match(/^\/ads\/([0-9a-f-]{36})$/i);

    let propertyId = null;
    if (propertyMatch?.[1]) {
      const { data: property } = await supabaseAdmin
        .from('properties')
        .select('id')
        .eq('slug', propertyMatch[1])
        .maybeSingle();
      propertyId = property?.id || null;
    }

    const { error } = await supabaseAdmin.from('page_clicks').insert([
      {
        event_type: parsed.event_type,
        path,
        page_url: parsed.page_url || null,
        referrer:
          parsed.referrer ||
          String(req.headers.referer || '').slice(0, 2000) ||
          null,
        session_id: parsed.session_id || null,
        clerk_user_id: parsed.clerk_user_id || null,
        is_authenticated: parsed.is_authenticated || false,
        user_agent: String(req.headers['user-agent'] || '').slice(0, 1000) || null,
        device_type: parsed.device_type || null,
        browser: parsed.browser || null,
        os: parsed.os || null,
        language: parsed.language || null,
        screen_width: parsed.screen_width || null,
        screen_height: parsed.screen_height || null,
        time_on_page_ms: parsed.time_on_page_ms || null,
        scroll_depth: parsed.scroll_depth ?? null,
        property_id: propertyId,
        advertisement_id: adMatch?.[1] || null,
        metadata: parsed.metadata || null,
      },
    ]);

    if (error) {
      console.error('Analytics insert failed:', error);
      return res.status(500).json({ error: 'Failed to track analytics' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request payload' });
    }
    console.error('Track error:', error);
    return res.status(500).json({ error: 'Failed to track analytics' });
  }
}