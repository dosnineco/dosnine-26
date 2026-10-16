export function clampBuyerLevel(value) {
  const level = Number(value);
  return Number.isFinite(level) ? Math.min(4, Math.max(1, level)) : 1;
}
