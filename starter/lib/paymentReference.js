export function getPayerReference(userId) {
  const match = String(userId || '').match(/^([a-f\d]{8})-/i);
  return match ? match[1].toUpperCase() : null;
}
