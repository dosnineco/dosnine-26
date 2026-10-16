import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { claimBuyerRequestsByEmail } from '@/lib/buyerRequests';
import { createBuyerAccessToken } from '@/lib/buyerPrequalification';
import { enforceMethods } from '@/lib/apiSecurity';

const PREQUALIFICATION_FIELDS = 'id, buyer_user_id, service_request_id, buyer_email, buyer_name, buyer_phone, purchase_method, target_property_price, monthly_income, deposit_available, employment_type, financing_progress, lender_name, financing_conditions, qualification_level, status, verified_budget_min, verified_budget_max, verified_at, verification_expires_at, consent_to_share, created_at';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;
  const resolved = await requireDbUser(req, res, { createIfMissing: true });
  if (!resolved) return;

  try {
    const db = getDbClient();
    await claimBuyerRequestsByEmail(db, resolved.user);

    const { data: requests, error } = await db
      .from('service_requests')
      .select('id, request_type, property_type, location, budget_min, budget_max, bedrooms, bathrooms, description, urgency, status, created_at, updated_at, client_name, client_email, client_phone')
      .eq('client_user_id', resolved.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const requestIds = (requests || []).map((request) => request.id);
    let prequalifications = [];
    if (requestIds.length) {
      const { data: linkedPrequalifications, error: prequalificationsError } = await db
        .from('buyer_prequalifications')
        .select(PREQUALIFICATION_FIELDS)
        .in('service_request_id', requestIds)
        .order('created_at', { ascending: false });
      if (prequalificationsError) throw prequalificationsError;
      prequalifications = linkedPrequalifications || [];
    }

    const { data: buyerAssessments, error: buyerAssessmentsError } = await db
      .from('buyer_prequalifications')
      .select(PREQUALIFICATION_FIELDS)
      .eq('buyer_user_id', resolved.user.id)
      .order('created_at', { ascending: false });
    if (buyerAssessmentsError) throw buyerAssessmentsError;
    const prequalificationIds = new Set(prequalifications.map((item) => item.id));
    for (const item of buyerAssessments || []) {
      if (!prequalificationIds.has(item.id)) {
        prequalifications.push(item);
        prequalificationIds.add(item.id);
      }
    }

    const requestById = new Map((requests || []).map((request) => [request.id, request]));
    const requestByEmail = new Map((requests || []).map((request) => [
      String(request.client_email || '').trim().toLowerCase(),
      request,
    ]).filter(([email]) => email));
    const requestAssessmentMap = new Map();
    for (const item of prequalifications) {
      const linkedRequest = requestById.get(item.service_request_id) ||
        requestByEmail.get(String(item.buyer_email || '').trim().toLowerCase());
      if (!linkedRequest || String(linkedRequest.request_type || '').toLowerCase() !== 'buy') continue;
      if (String(linkedRequest.client_email || '').trim().toLowerCase() !==
        String(item.buyer_email || '').trim().toLowerCase()) continue;
      if (!requestAssessmentMap.has(linkedRequest.id)) {
        requestAssessmentMap.set(linkedRequest.id, item);
      }
    }

    let documentsByAssessment = new Map();
    if (prequalifications.length) {
      const { data: documents, error: documentsError } = await db
        .from('buyer_documents')
        .select('id, prequalification_id, document_type, file_name, file_size, mime_type, status, review_notes, expires_at, uploaded_at')
        .in('prequalification_id', prequalifications.map((item) => item.id))
        .order('uploaded_at', { ascending: false });
      if (documentsError) throw documentsError;
      documentsByAssessment = (documents || []).reduce((map, document) => {
        const grouped = map.get(document.prequalification_id) || [];
        grouped.push(document);
        map.set(document.prequalification_id, grouped);
        return map;
      }, new Map());
    }

    return res.status(200).json({
      success: true,
      requests: (requests || []).map((request) => ({
        ...request,
        buyer_prequalification: requestAssessmentMap.has(request.id)
          ? {
              ...requestAssessmentMap.get(request.id),
              documents: documentsByAssessment.get(requestAssessmentMap.get(request.id).id) || [],
              access_token: createBuyerAccessToken(requestAssessmentMap.get(request.id).id),
            }
          : null,
      })),
    });
  } catch (error) {
    console.error('Loading buyer requests failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to load your requests' });
  }
}
