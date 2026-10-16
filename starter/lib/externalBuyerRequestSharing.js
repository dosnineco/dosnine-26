import { createHash, randomBytes } from 'crypto';
import * as SibApiV3Sdk from '@getbrevo/brevo';
import { getDbClient } from '@/lib/apiAuth';

export const EXTERNAL_SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class ExternalShareError extends Error {}

function getEmailDeliveryFailure(error) {
  const status = Number(error?.statusCode || error?.response?.statusCode || error?.response?.status);
  if (status === 401) {
    return 'Brevo rejected the API key. Set BREVO_API_KEY to a valid Brevo transactional email API key and restart the app.';
  }
  if (status === 403) {
    return 'Brevo denied permission to send this email. Check transactional email access and verify the sender in Brevo.';
  }
  if (status === 400) {
    return 'Brevo rejected the email request. Verify the sender address and transactional email settings.';
  }
  if (status === 429) {
    return 'Brevo email sending is temporarily rate-limited. Please try again later.';
  }
  if (status >= 500) {
    return 'Brevo email delivery is temporarily unavailable. Please try again later.';
  }
  return 'The email service could not send the invitation. Check the Brevo server configuration and try again.';
}

export function hashExternalShareToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function sendExternalBuyerRequestInvitation({
  db,
  request,
  email,
  sharedByUserId,
  existingShareId,
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new ExternalShareError('Email delivery is not configured, so the external agent cannot be invited.');
  }

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + EXTERNAL_SHARE_TTL_MS).toISOString();
  const shareValues = {
    service_request_id: request.id,
    shared_by_user_id: sharedByUserId,
    agent_user_id: null,
    agent_email: email,
    invite_token_hash: hashExternalShareToken(token),
    invite_expires_at: expiresAt,
  };
  const query = existingShareId
    ? db.from('buyer_request_agent_shares').update(shareValues).eq('id', existingShareId)
    : db.from('buyer_request_agent_shares').insert(shareValues);
  const { data: inserted, error: shareError } = await query
    .select('id')
    .single();
  if (shareError) throw shareError;

  const shareId = inserted.id;
  try {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dosnine.com').replace(/\/+$/, '');
    const invitationUrl = `${siteUrl}/shared-request/${encodeURIComponent(token)}`;
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, apiKey);
    const emailPayload = new SibApiV3Sdk.SendSmtpEmail();
    emailPayload.subject = 'A Dosnine buyer shared a property request with you';
    emailPayload.htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>A buyer shared a property request with you</h2>
        <p>The request and supporting documents are available for view-only review.</p>
        <p>This secure invitation expires in seven days. Sign in to a Dosnine agent account with this email address during that time to keep access available in your agent dashboard.</p>
        <p><a href="${invitationUrl}">View shared request</a></p>
        <p>You cannot edit, assign, or transfer the request from this link.</p>
      </div>
    `;
    emailPayload.textContent = [
      'A buyer shared a property request with you.',
      'The request and supporting documents are available for view-only review.',
      'This secure invitation expires in seven days. Sign in to a Dosnine agent account with this email address during that time to keep access available in your agent dashboard.',
      `View shared request: ${invitationUrl}`,
      'You cannot edit, assign, or transfer the request from this link.',
    ].join('\n\n');
    emailPayload.sender = {
      name: process.env.BREVO_FROM_NAME || 'Dosnine Limited ',
      email: process.env.BREVO_FROM_EMAIL || 'admin@dosnine.com',
    };
    emailPayload.to = [{ email }];
    await apiInstance.sendTransacEmail(emailPayload);
    return { expiresAt };
  } catch (error) {
    const statusCode = Number(error?.statusCode || error?.response?.statusCode || error?.response?.status) || null;
    console.error('Sending external buyer request invitation failed', { statusCode });
    const { error: cleanupError } = await getDbClient()
      .from('buyer_request_agent_shares')
      .delete()
      .eq('id', shareId);
    if (cleanupError) {
      console.error('Failed to remove undelivered external buyer request share:', cleanupError);
    }
    throw new ExternalShareError(getEmailDeliveryFailure(error));
  }
}

export async function findActiveExternalShare(db, token) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 128) return null;
  const { data, error } = await db
    .from('buyer_request_agent_shares')
    .select('id, service_request_id, agent_email')
    .eq('invite_token_hash', hashExternalShareToken(token))
    .gt('invite_expires_at', new Date().toISOString())
    .is('agent_user_id', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSharedExternalRequest(db, share) {
  const { data: request, error: requestError } = await db
    .from('service_requests')
    .select('id, request_type, property_type, location, budget_min, budget_max, bedrooms, bathrooms, description, urgency, status, created_at, client_email')
    .eq('id', share.service_request_id)
    .eq('request_type', 'buy')
    .maybeSingle();
  if (requestError) throw requestError;
  if (!request) return null;

  const { data: assessment, error: assessmentError } = await db
    .from('buyer_prequalifications')
    .select('id, buyer_name, buyer_email, purchase_method, target_property_price, monthly_income, deposit_available, financing_progress, lender_name, qualification_level, status, verified_budget_min, verified_budget_max, consent_to_share, created_at')
    .eq('service_request_id', request.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (assessmentError) throw assessmentError;
  if (
    !assessment ||
    !assessment.consent_to_share ||
    String(assessment.buyer_email || '').trim().toLowerCase() !==
      String(request.client_email || '').trim().toLowerCase()
  ) return null;

  const { data: documents, error: documentsError } = await db
    .from('buyer_documents')
    .select('id, document_type, file_name, file_size, mime_type, status, uploaded_at')
    .eq('prequalification_id', assessment.id)
    .order('uploaded_at', { ascending: false });
  if (documentsError) throw documentsError;

  return {
    id: request.id,
    request_type: request.request_type,
    property_type: request.property_type,
    location: request.location,
    budget_min: request.budget_min,
    budget_max: request.budget_max,
    bedrooms: request.bedrooms,
    bathrooms: request.bathrooms,
    description: request.description,
    urgency: request.urgency,
    status: request.status,
    created_at: request.created_at,
    shared_with: share.agent_email,
    buyer_prequalification: {
      id: assessment.id,
      buyer_name: assessment.buyer_name,
      purchase_method: assessment.purchase_method,
      target_property_price: assessment.target_property_price,
      monthly_income: assessment.monthly_income,
      deposit_available: assessment.deposit_available,
      financing_progress: assessment.financing_progress,
      lender_name: assessment.lender_name,
      qualification_level: assessment.qualification_level,
      status: assessment.status,
      verified_budget_min: assessment.verified_budget_min,
      verified_budget_max: assessment.verified_budget_max,
      consent_to_share: assessment.consent_to_share,
      created_at: assessment.created_at,
      documents: documents || [],
    },
  };
}
