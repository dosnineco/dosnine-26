import { getDbClient } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';

const DEFAULT_PRICES = {
  premium_service_price: 3178.4,
  property_boost_price: 500,
  paid_property_search_prices: { USD: 9.99, JMD: 2500 },
};

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;

  try {
    const { data, error } = await getDbClient()
      .from('site_settings')
      .select('key, value')
      .in('key', Object.keys(DEFAULT_PRICES));
    if (error) throw error;
    const settings = Object.fromEntries((data || []).map((item) => [item.key, item.value]));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      prices: {
        ...DEFAULT_PRICES,
        ...settings,
        paid_property_search_prices: {
          ...DEFAULT_PRICES.paid_property_search_prices,
          ...(settings.paid_property_search_prices || {}),
        },
      },
    });
  } catch (error) {
    console.error('Payment prices API error:', error);
    return res.status(500).json({ error: 'Unable to load payment prices.' });
  }
}
