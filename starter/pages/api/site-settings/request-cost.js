import { getDbClient } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;

  try {
    const rate = await enforceRateLimitDistributed(req, res, {
      keyPrefix: 'site-settings-request-cost',
      maxRequests: 120,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }

    const db = getDbClient();

    const { data: directData } = await db
      .from('site_settings')
      .select('request_cost')
      .single();

    if (directData?.request_cost) {
      return res.status(200).json({ success: true, requestCost: Number(directData.request_cost) });
    }

    const { data: kvData } = await db
      .from('site_settings')
      .select('key, value')
      .eq('key', 'request_cost')
      .single();

    const parsed = Number(kvData?.value?.amount ?? kvData?.value ?? 500);
    return res.status(200).json({ success: true, requestCost: Number.isNaN(parsed) ? 500 : parsed });
  } catch (error) {
    return res.status(200).json({ success: true, requestCost: 500 });
  }
}
