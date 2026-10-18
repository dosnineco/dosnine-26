const PAGE_SIZE = 500;
const BATCH_SIZE = 100;

async function loadAll(query) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

function hasSubmittedReadiness(assessment) {
  return (
    Number(assessment.qualification_level) >= 2 ||
    ['under_review', 'verified', 'confirmed'].includes(
      String(assessment.status || '').toLowerCase()
    )
  );
}

export async function getIncompleteBuyerReadinessRecipients(db) {
  const requests = await loadAll(
    db
      .from('service_requests')
      .select('id, client_email, client_name, parish, request_type, property_type, location, budget_min, budget_max, bedrooms, bathrooms, description, created_at')
      .eq('request_type', 'buy')
      .neq('client_email', '')
      .order('created_at', { ascending: false })
  );

  const requestIds = requests.map((request) => request.id).filter(Boolean);
  const emails = [...new Set(requests
    .map((request) => String(request.client_email || '').trim().toLowerCase())
    .filter(Boolean))];
  const assessments = [];

  for (let offset = 0; offset < requestIds.length; offset += BATCH_SIZE) {
    assessments.push(...await loadAll(
      db
        .from('buyer_prequalifications')
          .select('service_request_id, buyer_email, status, qualification_level')
        .in('service_request_id', requestIds.slice(offset, offset + BATCH_SIZE))
    ));
  }

  for (let offset = 0; offset < emails.length; offset += BATCH_SIZE) {
    assessments.push(...await loadAll(
      db
        .from('buyer_prequalifications')
          .select('service_request_id, buyer_email, status, qualification_level')
        .in('buyer_email', emails.slice(offset, offset + BATCH_SIZE))
    ));
  }

  const submittedRequestIds = new Set();
  const submittedEmails = new Set();
  for (const assessment of assessments) {
    if (!hasSubmittedReadiness(assessment)) continue;
    if (assessment.service_request_id) submittedRequestIds.add(assessment.service_request_id);
    const email = String(assessment.buyer_email || '').trim().toLowerCase();
    if (email) submittedEmails.add(email);
  }

  const recipientsByEmail = new Map();
  for (const request of requests) {
    const email = String(request.client_email || '').trim().toLowerCase();
    if (
      !email ||
      submittedRequestIds.has(request.id) ||
      submittedEmails.has(email) ||
      recipientsByEmail.has(email)
    ) {
      continue;
    }

    const name = String(request.client_name || '').trim();
    const nameParts = name.split(/\s+/).filter(Boolean);
    recipientsByEmail.set(email, {
      email,
      name: name || undefined,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' '),
      parish: request.parish || '',
      request: {
        serviceRequestId: request.id,
        requestType: request.request_type || '',
        propertyType: request.property_type || '',
        location: request.location || '',
        parish: request.parish || '',
        budgetMin: request.budget_min,
        budgetMax: request.budget_max,
        bedrooms: request.bedrooms,
        bathrooms: request.bathrooms,
        description: request.description || '',
      },
    });
  }

  return [...recipientsByEmail.values()];
}
