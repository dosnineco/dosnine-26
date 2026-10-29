import { getDbClient, requireAgentAccountUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { compareServiceRequestPriority } from '@/lib/serviceRequestPriority';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;
  const resolved = await requireAgentAccountUser(req, res);
  if (!resolved) return;

  try {
    const db = getDbClient();
    const email = String(resolved.user.email || '').trim().toLowerCase();
    if (email) {
      const { data: invitations, error: invitationError } = await db
        .from('buyer_request_agent_shares')
        .select('id')
        .eq('agent_email', email)
        .is('agent_user_id', null)
        .gt('invite_expires_at', new Date().toISOString());
      if (invitationError) throw invitationError;
      for (const invitation of invitations || []) {
        const { error } = await db
          .from('buyer_request_agent_shares')
          .update({
            agent_user_id: resolved.user.id,
            invite_token_hash: null,
            invite_expires_at: null,
          })
          .eq('id', invitation.id)
          .is('agent_user_id', null);
        if (error) throw error;
      }
    }

    const { data: shares, error: sharesError } = await db
      .from('buyer_request_agent_shares')
      .select('service_request_id, created_at')
      .eq('agent_user_id', resolved.user.id)
      .order('created_at', { ascending: false });
    if (sharesError) throw sharesError;
    const requestIds = [...new Set((shares || []).map((share) => share.service_request_id))];
    if (!requestIds.length) return res.status(200).json({ requests: [] });

    const { data: requests, error: requestsError } = await db
      .from('service_requests')
      .select('id, request_type, property_type, location, budget_min, budget_max, bedrooms, bathrooms, description, urgency, status, created_at, client_name, client_email, client_phone')
      .in('id', requestIds)
      .eq('request_type', 'buy')
      .order('created_at', { ascending: false });
    if (requestsError) throw requestsError;
    if (!requests?.length) return res.status(200).json({ requests: [] });

    const { data: assessments, error: assessmentsError } = await db
      .from('buyer_prequalifications')
      .select('id, service_request_id, buyer_name, buyer_email, buyer_phone, purchase_method, target_property_price, monthly_income, deposit_available, financing_progress, lender_name, qualification_level, status, verified_budget_min, verified_budget_max, consent_to_share, created_at')
      .in('service_request_id', requests.map((request) => request.id))
      .order('created_at', { ascending: false });
    if (assessmentsError) throw assessmentsError;

    const assessmentByRequest = new Map();
    const requestById = new Map(requests.map((request) => [request.id, request]));
    const latestAssessmentRequests = new Set();
    for (const assessment of assessments || []) {
      if (latestAssessmentRequests.has(assessment.service_request_id)) continue;
      latestAssessmentRequests.add(assessment.service_request_id);
      const request = requestById.get(assessment.service_request_id);
      if (
        !request ||
        !assessment.consent_to_share ||
        String(assessment.buyer_email || '').trim().toLowerCase() !==
          String(request.client_email || '').trim().toLowerCase()
      ) continue;
      if (!assessmentByRequest.has(assessment.service_request_id)) {
        assessmentByRequest.set(assessment.service_request_id, assessment);
      }
    }
    const linkedAssessments = [...assessmentByRequest.values()];
    const documentsByAssessment = new Map();
    if (linkedAssessments.length) {
      const { data: documents, error: documentsError } = await db
        .from('buyer_documents')
        .select('id, prequalification_id, document_type, file_name, mime_type, status, uploaded_at')
        .in('prequalification_id', linkedAssessments.map((item) => item.id))
        .order('uploaded_at', { ascending: false });
      if (documentsError) throw documentsError;
      for (const document of documents || []) {
        const grouped = documentsByAssessment.get(document.prequalification_id) || [];
        grouped.push(document);
        documentsByAssessment.set(document.prequalification_id, grouped);
      }
    }

    const sharedAtByRequest = new Map(
      (shares || []).map((share) => [share.service_request_id, share.created_at])
    );
    return res.status(200).json({
      requests: requests
        .filter((request) => assessmentByRequest.has(request.id))
        .map((request) => {
          const assessment = assessmentByRequest.get(request.id);
          return {
            ...request,
            shared_at: sharedAtByRequest.get(request.id),
            buyer_prequalification: {
              ...assessment,
              documents: documentsByAssessment.get(assessment.id) || [],
            },
          };
        })
        .sort(compareServiceRequestPriority),
    });
  } catch (error) {
    console.error('Loading shared buyer requests failed:', error);
    return res.status(500).json({ error: 'Unable to load requests shared with you' });
  }
}
