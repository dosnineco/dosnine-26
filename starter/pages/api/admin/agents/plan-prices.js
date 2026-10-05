import { getDbClient, requireAdminUser } from '../../../../lib/apiAuth';

const DEFAULT_PLAN_PRICES = {
  '7-day': 1499,
  '30-day': 4999,
  '90-day': 14999,
  free: 0,
};

const PLAN_IDS = Object.keys(DEFAULT_PLAN_PRICES);

export default async function handler(req, res) {
  if (!['GET', 'PATCH'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const db = getDbClient();
    if (req.method === 'GET') {
      const { data, error } = await db
        .from('site_settings')
        .select('value')
        .eq('key', 'plan_prices')
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json({
        success: true,
        planPrices: { ...DEFAULT_PLAN_PRICES, ...(data?.value || {}) },
      });
    }

    const { planPrices } = req.body || {};
    if (
      !planPrices ||
      typeof planPrices !== 'object' ||
      Array.isArray(planPrices) ||
      PLAN_IDS.some((planId) =>
        !Number.isInteger(Number(planPrices[planId])) ||
        Number(planPrices[planId]) < (planId === 'free' ? 0 : 1) ||
        (planId === 'free' && Number(planPrices[planId]) !== 0) ||
        Number(planPrices[planId]) > 10000000
      )
    ) {
      return res.status(400).json({ error: 'Enter valid whole-number prices for all agent plans.' });
    }

    const values = Object.fromEntries(
      PLAN_IDS.map((planId) => [planId, Number(planPrices[planId])])
    );
    const { error } = await db.from('site_settings').upsert(
      {
        key: 'plan_prices',
        value: values,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
    if (error) throw error;

    return res.status(200).json({ success: true, planPrices: values });
  } catch (error) {
    console.error('Admin agent plan pricing API error:', error);
    return res.status(500).json({ error: error?.message || 'Unable to load agent plan pricing.' });
  }
}
