/**
 * Format money with commas and millions notation
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency symbol (default: 'JMD $')
 * @returns {string} Formatted money string
 * 
 * Examples:
 * 20000 -> $20,000
 * 1000000 -> $1m
 * 1120000 -> $1.12m
 * 2500000 -> $2.5m
 */
export function formatMoney(amount, currency = '$') {
  if (!amount || isNaN(amount)) return `${currency}0`;
  
  const num = Number(amount);
  
  // If 1 million or more, use million notation
  if (num >= 1000000) {
    const millions = num / 1000000;
    // Show up to 2 decimal places, but remove trailing zeros
    const formatted = millions.toFixed(2).replace(/\.?0+$/, '');
    return `${currency}${formatted}m`;
  }
  
  // Otherwise, use comma notation
  return `${currency}${num.toLocaleString()}`;
}

/**
 * Format money for JMD specifically
 */
export function formatJMD(amount) {
  return formatMoney(amount, 'JMD $');
}
