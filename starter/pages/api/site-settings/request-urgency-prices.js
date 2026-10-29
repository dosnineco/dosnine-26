import { getDbClient, requireAdminUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import {
  getRequestUrgencyPrices,
  isValidRequestUrgencyPrices,
} from '@/lib/requestUrgencyPricing';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET', 'PATCH'])) return;

  try {
    const db = getDbClient();

    if (req.method === 'GET') {
      const requestUrgencyPrices = await getRequestUrgencyPrices(db);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ success: true, requestUrgencyPrices });
    }

    const admin = await requireAdminUser(req, res);
    if (!admin) return;

    const requestUrgencyPrices = req.body?.requestUrgencyPrices;
    if (!isValidRequestUrgencyPrices(requestUrgencyPrices)) {
      return res.status(400).json({
        error: 'Enter valid USD prices from $0.01 to $9,999.99 for both urgency levels.',
      });
    }

    const prices = {
      high: Number(Number(requestUrgencyPrices.high).toFixed(2)),
      urgent: Number(Number(requestUrgencyPrices.urgent).toFixed(2)),
    };
    const { error } = await db.from('site_settings').upsert(
      {
        key: 'request_urgency_prices',
        value: prices,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
    if (error) throw error;

    return res.status(200).json({ success: true, requestUrgencyPrices: prices });
  } catch (error) {
    console.error('Request urgency pricing API failed:', error);
    return res.status(500).json({ error: 'Unable to load or save request urgency prices.' });
  }
}
