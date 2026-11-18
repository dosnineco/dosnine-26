import { getDbClient, requireAdminUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';

const DEFAULT_PRICES = {
  premium_service_price: 3178.4,
  property_boost_price: 500,
  paid_property_search_prices: { USD: 9.99, JMD: 2500 },
};

function isPrice(value, { allowDecimals = false } = {}) {
  const amount = Number(value);
  return Number.isFinite(amount) &&
    amount > 0 &&
    amount <= 10000000 &&
    (allowDecimals ? Number.isInteger(amount * 100) : Number.isSafeInteger(amount));
}

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET', 'PATCH'])) return;

  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;
    const db = getDbClient();

    if (req.method === 'GET') {
      const { data, error } = await db
        .from('site_settings')
        .select('key, value')
        .in('key', Object.keys(DEFAULT_PRICES));
      if (error) throw error;

      const settings = Object.fromEntries((data || []).map((item) => [item.key, item.value]));
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
    }

    const { premiumServicePrice, propertyBoostPrice, paidPropertySearchPrices } = req.body || {};
    if (
      !isPrice(premiumServicePrice, { allowDecimals: true }) ||
      !isPrice(propertyBoostPrice) ||
      !paidPropertySearchPrices ||
      !Number.isInteger(Number(paidPropertySearchPrices.JMD)) ||
      Number(paidPropertySearchPrices.JMD) < 1 ||
      Number(paidPropertySearchPrices.JMD) > 10000000 ||
      !Number.isFinite(Number(paidPropertySearchPrices.USD)) ||
      Number(paidPropertySearchPrices.USD) < 0.01 ||
      Number(paidPropertySearchPrices.USD) > 9999.99
    ) {
      return res.status(400).json({ error: 'Enter valid JMD prices and a valid USD property-search price.' });
    }

    const values = {
      premium_service_price: Number(Number(premiumServicePrice).toFixed(2)),
      property_boost_price: Number(propertyBoostPrice),
      paid_property_search_prices: {
        USD: Number(Number(paidPropertySearchPrices.USD).toFixed(2)),
        JMD: Number(paidPropertySearchPrices.JMD),
      },
    };
    const updatedAt = new Date().toISOString();
    const { error } = await db.from('site_settings').upsert(
      Object.entries(values).map(([key, value]) => ({ key, value, updated_at: updatedAt })),
      { onConflict: 'key' }
    );
    if (error) throw error;

    return res.status(200).json({ success: true, prices: values });
  } catch (error) {
    console.error('Admin payment pricing API error:', error);
    return res.status(500).json({ error: error?.message || 'Unable to load payment pricing.' });
  }
}
