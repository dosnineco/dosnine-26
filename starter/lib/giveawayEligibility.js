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
  buyerReadiness = [],
  rentalReadiness,
  now = new Date(),
}) {
  const premiumExpiry = user?.premium_service_request_expires
    ? new Date(user.premium_service_request_expires).getTime()
    : NaN;
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
    hasLevelFourReadiness,
  };
}

export function isGiveawayEligible(checklist) {
  return Object.values(checklist).every(Boolean);
}
