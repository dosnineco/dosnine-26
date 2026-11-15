export function hasActiveRegularPremium(user, now = new Date()) {
  const expiresAt = user?.premium_service_request_expires
    ? new Date(user.premium_service_request_expires).getTime()
    : NaN;
  return Boolean(
    user?.account_type === 'regular' &&
    user?.premium_service_request &&
    Number.isFinite(expiresAt) &&
    expiresAt > now.getTime()
  );
}
