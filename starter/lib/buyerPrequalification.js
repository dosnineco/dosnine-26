import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { getDbClient } from '@/lib/apiAuth';

export const BUCKET = 'buyer-documents';
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];

const DOCUMENT_TYPES = [
  'mortgage_prequalification',
  'proof_of_savings',
  'proof_of_funds',
  'mortgage_approval',
  'nht_documentation',
  'family_contribution',
  'self_employed_income',
  'bank_confirmation',
  'other',
];

function getTokenSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return secret;
}

function signBuyerToken(prequalificationId, expiresAt) {
  return createHmac('sha256', getTokenSecret())
    .update(`${prequalificationId}.${expiresAt}`)
    .digest('base64url');
}

export function createBuyerAccessToken(prequalificationId) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  return `${expiresAt}.${signBuyerToken(prequalificationId, expiresAt)}`;
}

export function verifyBuyerAccessToken(prequalificationId, token) {
  if (typeof token !== 'string') return false;
  const [expiresAtText, signature] = token.split('.');
  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() || !signature) {
    return false;
  }

  const expected = Buffer.from(signBuyerToken(prequalificationId, expiresAt));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function sanitizeFilename(name) {
  return String(name || 'file')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 120) || 'file';
}

export function buildDocumentPath(prequalificationId, documentType, filename) {
  if (!DOCUMENT_TYPES.includes(documentType)) {
    throw new Error('Unsupported buyer document type');
  }
  return `${prequalificationId}/${documentType}/${randomUUID()}-${sanitizeFilename(filename)}`;
}

export function isValidDocumentPath(prequalificationId, documentType, filePath) {
  if (typeof filePath !== 'string') return false;
  const parts = filePath.split('/');
  return parts.length === 3 &&
    parts[0] === prequalificationId &&
    parts[1] === documentType &&
    Boolean(parts[2]) &&
    !parts[2].includes('..');
}

export function levelFromStatus({ status, hasDocuments, verifiedDocCount, hasLenderEvidence }) {
  if (status === 'confirmed' || (hasLenderEvidence && verifiedDocCount > 0)) return 4;
  if (status === 'verified' && verifiedDocCount > 0) return 3;
  if (hasDocuments) return 2;
  return 1;
}

export function statusFromLevel(level) {
  switch (level) {
    case 4: return 'confirmed';
    case 3: return 'verified';
    case 2: return 'under_review';
    default: return 'registered';
  }
}

export async function recomputeQualificationLevel(prequalificationId) {
  const db = getDbClient();
  const [{ data: documents, error: documentsError }, { data: current, error: currentError }] =
    await Promise.all([
      db
        .from('buyer_documents')
        .select('id, document_type, status, expires_at')
        .eq('prequalification_id', prequalificationId),
      db
        .from('buyer_prequalifications')
        .select('status')
        .eq('id', prequalificationId)
        .single(),
    ]);

  if (documentsError) throw documentsError;
  if (currentError) throw currentError;

  const allDocuments = documents || [];
  const now = Date.now();
  const verifiedDocuments = allDocuments.filter((document) =>
    document.status === 'reviewed' &&
    (!document.expires_at || new Date(document.expires_at).getTime() > now)
  );
  const verifiedDocCount = verifiedDocuments.length;
  const hasLenderEvidence = verifiedDocuments.some((document) =>
    ['mortgage_approval', 'nht_documentation'].includes(document.document_type)
  );
  const level = levelFromStatus({
    status: current.status,
    hasDocuments: allDocuments.length > 0,
    verifiedDocCount,
    hasLenderEvidence,
  });
  const status = ['rejected', 'expired'].includes(current.status)
    ? current.status
    : statusFromLevel(level);

  const { error: updateError } = await db
    .from('buyer_prequalifications')
    .update({ qualification_level: level, status })
    .eq('id', prequalificationId);

  if (updateError) throw updateError;
  return { level, status };
}

export async function createSignedDownloadUrl(filePath, expiresInSeconds = 300) {
  const { data, error } = await getDbClient()
    .storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function streamBuyerDocument(db, document, res) {
  const { data, error } = await db.storage
    .from(BUCKET)
    .download(document.file_path);
  if (error) throw error;
  if (!data) throw new Error('Buyer document storage returned no file');

  const contentType = ALLOWED_MIME.includes(document.mime_type)
    ? document.mime_type
    : 'application/octet-stream';
  const filename = sanitizeFilename(document.file_name || 'buyer-document');
  const contents = Buffer.from(await data.arrayBuffer());

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Content-Length', contents.length);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(200).send(contents);
}

export function getAgentBuyerReadiness(prequalification) {
  if (
    !prequalification ||
    !prequalification.consent_to_share ||
    !['verified', 'confirmed'].includes(prequalification.status) ||
    prequalification.qualification_level < 3 ||
    (prequalification.verification_expires_at &&
      new Date(prequalification.verification_expires_at).getTime() <= Date.now())
  ) {
    return null;
  }

  return {
    qualification_level: prequalification.qualification_level,
    status: prequalification.status,
    verified_budget_min: prequalification.verified_budget_min,
    verified_budget_max: prequalification.verified_budget_max,
    financing_progress: prequalification.financing_progress,
    verified_at: prequalification.verified_at,
  };
}

export async function addAgentBuyerReadiness(db, serviceRequests) {
  if (!serviceRequests.length) return [];

  const requestIds = serviceRequests.map((request) => request.id).filter(Boolean);
  if (!requestIds.length) {
    return serviceRequests.map((request) => ({ ...request, buyer_readiness: null }));
  }

  const { data, error } = await db
    .from('buyer_prequalifications')
    .select('service_request_id, qualification_level, status, verified_budget_min, verified_budget_max, financing_progress, verified_at, verification_expires_at, consent_to_share, created_at')
    .in('service_request_id', requestIds)
    .eq('consent_to_share', true)
    .in('status', ['verified', 'confirmed'])
    .gte('qualification_level', 3)
    .order('qualification_level', { ascending: false })
    .order('verified_at', { ascending: false, nullsFirst: false });

  if (error) throw error;

  const readinessByRequest = new Map();
  for (const prequalification of data || []) {
    if (!readinessByRequest.has(prequalification.service_request_id)) {
      readinessByRequest.set(
        prequalification.service_request_id,
        getAgentBuyerReadiness(prequalification)
      );
    }
  }

  return serviceRequests.map((request) => ({
    ...request,
    buyer_readiness: readinessByRequest.get(request.id) || null,
  }));
}

export async function addAdminBuyerDocuments(db, serviceRequests) {
  if (!serviceRequests.length) return [];

  const buyerRequests = serviceRequests.filter((request) =>
    String(request.request_type || '').toLowerCase() === 'buy'
  );
  const requestIds = buyerRequests.map((request) => request.id).filter(Boolean);
  const requestEmails = [...new Set(buyerRequests
    .map((request) => String(request.client_email || '').trim().toLowerCase())
    .filter(Boolean))];
  const selectFields = 'id, service_request_id, buyer_email, buyer_name, buyer_phone, status, qualification_level, consent_to_share, verified_budget_min, verified_budget_max, verified_at, verification_expires_at, created_at';

  const loadInBatches = async (column, values) => {
    const rows = [];
    for (let offset = 0; offset < values.length; offset += 100) {
      const { data, error } = await db
        .from('buyer_prequalifications')
        .select(selectFields)
        .in(column, values.slice(offset, offset + 100))
        .order('created_at', { ascending: false });
      if (error) throw error;
      rows.push(...(data || []));
    }
    return rows;
  };

  const [byRequest, byEmail] = await Promise.all([
    loadInBatches('service_request_id', requestIds),
    loadInBatches('buyer_email', requestEmails),
  ]);
  const prequalificationsById = new Map();
  for (const item of [...byRequest, ...byEmail]) {
    if (!prequalificationsById.has(item.id)) prequalificationsById.set(item.id, item);
  }
  const prequalifications = [...prequalificationsById.values()];
  const documentsByPrequalification = new Map();

  for (let offset = 0; offset < prequalifications.length; offset += 100) {
    const ids = prequalifications.slice(offset, offset + 100).map((item) => item.id);
    const { data: documents, error } = await db
      .from('buyer_documents')
      .select('id, prequalification_id, document_type, file_name, mime_type, status, review_notes, uploaded_at')
      .in('prequalification_id', ids)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    for (const document of documents || []) {
      const grouped = documentsByPrequalification.get(document.prequalification_id) || [];
      grouped.push(document);
      documentsByPrequalification.set(document.prequalification_id, grouped);
    }
  }

  const prequalificationByRequest = new Map();
  const prequalificationByEmail = new Map();
  for (const item of prequalifications) {
    if (item.service_request_id && !prequalificationByRequest.has(item.service_request_id)) {
      prequalificationByRequest.set(item.service_request_id, item);
    }
    const email = String(item.buyer_email || '').trim().toLowerCase();
    if (email && !prequalificationByEmail.has(email)) prequalificationByEmail.set(email, item);
  }

  return serviceRequests.map((request) => {
    if (String(request.request_type || '').toLowerCase() !== 'buy') {
      return { ...request, buyer_prequalification: null };
    }
    const email = String(request.client_email || '').trim().toLowerCase();
    const item = prequalificationByRequest.get(request.id) || prequalificationByEmail.get(email) || null;
    return {
      ...request,
      buyer_prequalification: item
        ? { ...item, documents: documentsByPrequalification.get(item.id) || [] }
        : null,
    };
  });
}

export async function addAssignedAgentBuyerDocuments(db, serviceRequests) {
  const buyerRequests = serviceRequests.filter((request) =>
    String(request.request_type || '').toLowerCase() === 'buy'
  );
  if (!buyerRequests.length) {
    return serviceRequests.map((request) => ({ ...request, buyer_documents: [] }));
  }

  const requestIds = buyerRequests.map((request) => request.id).filter(Boolean);
  const assessments = [];
  for (let offset = 0; offset < requestIds.length; offset += 100) {
    const { data, error } = await db
      .from('buyer_prequalifications')
      .select('id, service_request_id, consent_to_share')
      .in('service_request_id', requestIds.slice(offset, offset + 100))
      .order('created_at', { ascending: false });
    if (error) throw error;
    assessments.push(...(data || []).filter((assessment) => assessment.consent_to_share));
  }

  const assessmentsByRequest = new Map();
  for (const assessment of assessments) {
    if (!assessmentsByRequest.has(assessment.service_request_id)) {
      assessmentsByRequest.set(assessment.service_request_id, assessment);
    }
  }

  const documentsByRequest = new Map();
  const assessmentRows = [...assessmentsByRequest.values()];
  for (let offset = 0; offset < assessmentRows.length; offset += 100) {
    const batch = assessmentRows.slice(offset, offset + 100);
    const { data, error } = await db
      .from('buyer_documents')
      .select('id, prequalification_id, document_type, file_name, mime_type, status, uploaded_at')
      .in('prequalification_id', batch.map((item) => item.id))
      .order('uploaded_at', { ascending: false });
    if (error) throw error;

    const requestByAssessment = new Map(batch.map((item) => [item.id, item.service_request_id]));
    for (const document of data || []) {
      const requestId = requestByAssessment.get(document.prequalification_id);
      const documents = documentsByRequest.get(requestId) || [];
      documents.push(document);
      documentsByRequest.set(requestId, documents);
    }
  }

  return serviceRequests.map((request) => ({
    ...request,
    buyer_documents: documentsByRequest.get(request.id) || [],
  }));
}
