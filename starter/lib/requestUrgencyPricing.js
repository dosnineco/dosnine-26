export const DEFAULT_REQUEST_URGENCY_PRICES = {
  high: 9.99,
  urgent: 14.99,
};

const isValidPrice = (value) => {
  const price = Number(value);
  const formattedPrice = String(value);
  return Number.isFinite(price) &&
    price >= 0.01 &&
    price <= 9999.99 &&
    /^\d{1,4}(?:\.\d{1,2})?$/.test(formattedPrice);
};

export async function getRequestUrgencyPrices(db) {
  const { data, error } = await db
    .from('site_settings')
    .select('value')
    .eq('key', 'request_urgency_prices')
    .maybeSingle();

  if (error) throw error;
  if (!data) return DEFAULT_REQUEST_URGENCY_PRICES;

  const prices = data.value;
  if (
    !prices ||
    typeof prices !== 'object' ||
    Array.isArray(prices) ||
    !isValidPrice(prices.high) ||
    !isValidPrice(prices.urgent)
  ) {
    throw new Error('Request urgency prices are invalid in site settings.');
  }

  return { high: Number(prices.high), urgent: Number(prices.urgent) };
}

export function isValidRequestUrgencyPrices(prices) {
  return Boolean(
    prices &&
    typeof prices === 'object' &&
    !Array.isArray(prices) &&
    isValidPrice(prices.high) &&
    isValidPrice(prices.urgent)
  );
}
