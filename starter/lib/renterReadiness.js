export const RENTAL_READINESS_LEVELS = [
  { number: 1, label: 'Profile started', hint: 'Add your rental details' },
  { number: 2, label: 'Budget & move-in date', hint: 'Rental goals added' },
  { number: 3, label: 'Income & employment', hint: 'Affordability details added' },
  { number: 4, label: 'Rental profile complete', hint: 'Household & references added' },
];

export function getRentalReadinessLevel(profile) {
  if (!profile) return 1;
  const hasBudgetAndMoveDate = Number(profile.monthly_rent_budget) > 0 && Boolean(profile.move_in_date);
  const hasIncomeAndEmployment = Number(profile.monthly_income) > 0 && Boolean(profile.employment_status);
  const hasHouseholdAndReferences = Number(profile.occupants) > 0 && profile.has_rental_references;
  if (hasBudgetAndMoveDate && hasIncomeAndEmployment && hasHouseholdAndReferences) return 4;
  if (hasBudgetAndMoveDate && hasIncomeAndEmployment) return 3;
  if (hasBudgetAndMoveDate) return 2;
  return 1;
}

export async function addAgentRentalReadiness(db, requests) {
  const rentalRequests = requests.filter((request) =>
    ['rent', 'rental', 'lease'].includes(String(request.request_type || '').toLowerCase()) &&
    request.client_user_id
  );
  const userIds = [...new Set(rentalRequests.map((request) => request.client_user_id))];
  if (!userIds.length) return requests;

  const { data, error } = await db
    .from('renter_readiness_profiles')
    .select('user_id, monthly_rent_budget, monthly_income, employment_status, move_in_date, occupants, has_rental_references')
    .in('user_id', userIds);
  if (error) throw error;

  const readinessByUserId = new Map((data || []).map((profile) => [
    profile.user_id,
    getRentalReadinessLevel(profile),
  ]));

  return requests.map((request) => {
    const level = readinessByUserId.get(request.client_user_id);
    if (level === undefined) return request;
    return { ...request, rental_readiness: { qualification_level: level } };
  });
}
