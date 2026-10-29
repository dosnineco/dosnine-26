const PAGE_SIZE = 500;
const BATCH_SIZE = 100;
const COMPLETED_STATUSES = new Set(['verified', 'confirmed', 'rejected', 'expired']);

async function loadAll(query) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

export async function getIncompleteBuyerReadinessRecipients(db) {
  const requests = await loadAll(
    db
      .from('service_requests')
      .select('id, client_email, client_name, parish, request_type, property_type, location, budget_min, budget_max, bedrooms, bathrooms, description, created_at')
      .eq('request_type', 'buy')
      .neq('client_email', '')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
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
          .select('id, service_request_id, buyer_email, buyer_name, status, qualification_level')
        .in('service_request_id', requestIds.slice(offset, offset + BATCH_SIZE))
        .order('id', { ascending: true })
    ));
  }

  for (let offset = 0; offset < emails.length; offset += BATCH_SIZE) {
    assessments.push(...await loadAll(
      db
        .from('buyer_prequalifications')
          .select('id, service_request_id, buyer_email, buyer_name, status, qualification_level')
        .in('buyer_email', emails.slice(offset, offset + BATCH_SIZE))
        .order('id', { ascending: true })
    ));
  }

  const standaloneAssessments = await loadAll(
    db
      .from('buyer_prequalifications')
      .select('id, service_request_id, buyer_email, buyer_name, status, qualification_level')
      .is('service_request_id', null)
      .not('buyer_email', 'is', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
  );
  assessments.push(...standaloneAssessments);

  const assessmentIds = [...new Set(assessments.map((assessment) => assessment.id).filter(Boolean))];
  const assessmentsWithDocuments = new Set();
  for (let offset = 0; offset < assessmentIds.length; offset += BATCH_SIZE) {
    const { data, error } = await db
      .from('buyer_documents')
      .select('prequalification_id')
      .in('prequalification_id', assessmentIds.slice(offset, offset + BATCH_SIZE));
    if (error) throw error;
    for (const document of data || []) assessmentsWithDocuments.add(document.prequalification_id);
  }

  const assessmentsByRequest = new Map();
  const assessmentsByEmail = new Map();
  const submittedRequestIds = new Set();
  const submittedEmails = new Set();
  for (const assessment of assessments) {
    const email = String(assessment.buyer_email || '').trim().toLowerCase();
    if (assessment.service_request_id) {
      const current = assessmentsByRequest.get(assessment.service_request_id) || [];
      current.push(assessment);
      assessmentsByRequest.set(assessment.service_request_id, current);
    }
    if (email) {
      const current = assessmentsByEmail.get(email) || [];
      current.push(assessment);
      assessmentsByEmail.set(email, current);
    }

    if (
      assessmentsWithDocuments.has(assessment.id) ||
      COMPLETED_STATUSES.has(String(assessment.status || '').toLowerCase())
    ) {
      if (assessment.service_request_id) submittedRequestIds.add(assessment.service_request_id);
      if (email) submittedEmails.add(email);
    }
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
    const assessment = [
      ...(assessmentsByRequest.get(request.id) || []),
      ...(assessmentsByEmail.get(email) || []),
    ].find((candidate) =>
      !assessmentsWithDocuments.has(candidate.id) &&
      !COMPLETED_STATUSES.has(String(candidate.status || '').toLowerCase())
    );
    recipientsByEmail.set(email, {
      email,
      name: name || undefined,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' '),
      parish: request.parish || '',
      prequalificationId: assessment?.id || null,
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

  for (const assessment of standaloneAssessments) {
    const email = String(assessment.buyer_email || '').trim().toLowerCase();
    if (
      !email ||
      recipientsByEmail.has(email) ||
      assessmentsWithDocuments.has(assessment.id) ||
      COMPLETED_STATUSES.has(String(assessment.status || '').toLowerCase())
    ) {
      continue;
    }

    const name = String(assessment.buyer_name || '').trim();
    const nameParts = name.split(/\s+/).filter(Boolean);
    recipientsByEmail.set(email, {
      email,
      name: name || undefined,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' '),
      parish: '',
      prequalificationId: assessment.id,
      request: null,
    });
  }

  return [...recipientsByEmail.values()];
}
