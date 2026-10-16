export async function claimBuyerRequestsByEmail(db, user) {
  const email = String(user?.email || '').trim().toLowerCase();
  if (!email) return { claimedRequests: 0, claimedPrequalifications: 0 };

  const emailPattern = email.replace(/[\\%_]/g, '\\$&');
  const { data: requests, error: requestsError } = await db
    .from('service_requests')
    .update({ client_user_id: user.id })
    .is('client_user_id', null)
    .ilike('client_email', emailPattern)
    .select('id');
  if (requestsError) {
    console.error('Guest service request claim failed:', requestsError);
    throw new Error('Unable to link earlier service requests');
  }

  const { data: prequalifications, error: prequalificationsError } = await db
    .from('buyer_prequalifications')
    .update({ buyer_user_id: user.id })
    .is('buyer_user_id', null)
    .ilike('buyer_email', emailPattern)
    .select('id');
  if (prequalificationsError) {
    console.error('Guest buyer assessment claim failed:', prequalificationsError);
  }

  return {
    claimedRequests: requests?.length || 0,
    claimedPrequalifications: prequalifications?.length || 0,
    prequalificationClaimFailed: Boolean(prequalificationsError),
  };
}
