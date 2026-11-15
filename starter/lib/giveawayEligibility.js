export function isCurrentLevelFourBuyerReadiness(assessment, now = new Date()) {
  const expiry = assessment?.verification_expires_at
    ? new Date(assessment.verification_expires_at).getTime()
    : Infinity;
  return Boolean(
    ['verified', 'confirmed'].includes(assessment?.status) &&
    Number(assessment?.qualification_level) === 4 &&
    expiry > now.getTime()
  );
}

export function getGiveawayEligibility({
  user,
  requests = [],
  boosts = [],
  buyerReadiness = [],
  rentalReadiness,
  now = new Date(),
}) {
  const activeCutoff = now.getTime() - (30 * 24 * 60 * 60 * 1000);
  const premiumExpiry = user?.premium_service_request_expires
    ? new Date(user.premium_service_request_expires).getTime()
    : NaN;
  const requestIds = new Set(requests.map((request) => request.id));
  const hasPaidBoost = boosts.some((boost) =>
    boost.status === 'paid' &&
    (boost.service_request_ids || []).some((id) => requestIds.has(id))
  );
  const hasLevelFourReadiness =
    buyerReadiness.some((assessment) => isCurrentLevelFourBuyerReadiness(assessment, now)) ||
    Number(rentalReadiness?.qualification_level) === 4;

  return {
    isPremium: Boolean(
      user?.account_type === 'regular' &&
      user?.premium_service_request &&
      Number.isFinite(premiumExpiry) &&
      premiumExpiry > now.getTime()
    ),
    isActive: Boolean(
      user?.last_active_at &&
      new Date(user.last_active_at).getTime() >= activeCutoff
    ),
    hasCreatedRequest: requests.length > 0,
    hasPaidBoost,
    hasLevelFourReadiness,
  };
}

export function isGiveawayEligible(checklist) {
  return Object.values(checklist).every(Boolean);
}
