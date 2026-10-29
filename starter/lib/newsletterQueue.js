import * as SibApiV3Sdk from '@getbrevo/brevo';
import { createBuyerAccessToken } from '@/lib/buyerPrequalification';
import { sanitizeString } from '@/lib/apiSecurity';

const DAILY_SEND_LIMIT = 300;
const SEND_CONCURRENCY = 5;

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatTemplate(template, values, escapeValues = false) {
  return String(template || '').replace(/{{\s*([^}]+)\s*}}/g, (_, key) => {
    const normalizedKey = String(key).trim().toLowerCase();
    const value = String(values[normalizedKey] ?? '');
    return escapeValues ? escapeHtml(value) : value;
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function formatRequestDetails(request) {
  if (!request) return '';
  const rows = [
    ['Request type', request.requestType],
    ['Property type', request.propertyType],
    ['Location', request.location],
    ['Parish', request.parish],
    ['Budget', request.budgetMin != null || request.budgetMax != null
      ? [request.budgetMin, request.budgetMax]
          .map((value) => value == null ? '' : `J$${Number(value).toLocaleString()}`)
          .filter(Boolean)
          .join(' – ')
      : ''],
    ['Bedrooms', request.bedrooms],
    ['Bathrooms', request.bathrooms],
    ['Additional details', request.description],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (!rows.length) return '';

  return `<div style="margin:24px 0;padding:18px 20px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;">
    <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">Your property request</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${rows.map(([label, value]) => `<tr>
        <td style="padding:4px 12px 4px 0;font-size:14px;font-weight:600;color:#475569;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:4px 0;font-size:14px;color:#0f172a;vertical-align:top;">${escapeHtml(value)}</td>
      </tr>`).join('')}
    </table>
  </div>`;
}

function formatRequestDetailsText(request, readinessUrl) {
  if (!request) return `Continue your buyer readiness assessment: ${readinessUrl}`;
  const details = [
    `Request type: ${request.requestType || ''}`,
    `Property type: ${request.propertyType || ''}`,
    `Location: ${request.location || ''}`,
    request.parish ? `Parish: ${request.parish}` : '',
    request.budgetMin != null || request.budgetMax != null
      ? `Budget: ${[request.budgetMin, request.budgetMax]
          .map((value) => value == null ? '' : `J$${Number(value).toLocaleString()}`)
          .filter(Boolean)
          .join(' – ')}`
      : '',
    request.bedrooms != null ? `Bedrooms: ${request.bedrooms}` : '',
    request.bathrooms != null ? `Bathrooms: ${request.bathrooms}` : '',
    request.description ? `Additional details: ${request.description}` : '',
  ].filter(Boolean);

  return `Your property request\n${details.join('\n')}\n\nContinue your buyer readiness assessment: ${readinessUrl}`;
}

function getNameParts(recipient) {
  const name = String(recipient.name || '').trim();
  if (name) {
    const parts = name.split(/\s+/);
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' };
  }
  return {
    firstName: String(recipient.firstName || ''),
    lastName: String(recipient.lastName || ''),
  };
}

function getReadinessUrl(recipient, siteUrl) {
  const baseUrl = `${siteUrl.replace(/\/$/, '')}/buyer-prequalification`;
  if (recipient.prequalificationId) {
    const query = new URLSearchParams({
      prequalificationId: recipient.prequalificationId,
      accessToken: createBuyerAccessToken(recipient.prequalificationId),
    });
    return `${baseUrl}?${query}`;
  }
  if (recipient.request?.serviceRequestId) {
    return `${baseUrl}?serviceRequestId=${encodeURIComponent(recipient.request.serviceRequestId)}`;
  }
  return baseUrl;
}

async function sendRecipient(apiInstance, campaign, recipientRow, siteUrl) {
  const recipient = recipientRow.recipient_data || {};
  const nameParts = getNameParts(recipient);
  const values = {
    first_name: nameParts.firstName || 'there',
    last_name: nameParts.lastName || '',
    parish: recipient.parish || '',
    email: recipientRow.email,
    request_type: recipient.request?.requestType || '',
    property_type: recipient.request?.propertyType || '',
    location: recipient.request?.location || '',
    budget_min: recipient.request?.budgetMin == null
      ? ''
      : `J$${Number(recipient.request.budgetMin).toLocaleString()}`,
    budget_max: recipient.request?.budgetMax == null
      ? ''
      : `J$${Number(recipient.request.budgetMax).toLocaleString()}`,
    bedrooms: recipient.request?.bedrooms ?? '',
    bathrooms: recipient.request?.bathrooms ?? '',
    request_description: recipient.request?.description || '',
  };

  const personalizedSubject = sanitizeString(formatTemplate(campaign.subject, values), 200);
  const readinessUrl = getReadinessUrl(recipient, siteUrl);
  const isReadinessCampaign = campaign.target === 'incompleteBuyerReadiness';
  const unsubscribeUrl = `${siteUrl.replace(/\/$/, '')}/newsletter/unsubscribe`;
  const personalizedHtml = `${formatTemplate(campaign.html_content, values, true)}
    ${isReadinessCampaign
      ? `${formatRequestDetails(recipient.request)}
        <p style="margin:20px 0 0;">
          <a href="${escapeHtml(readinessUrl)}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#F55353;color:#ffffff;text-decoration:none;font-weight:600;">Continue buyer readiness</a>
        </p>`
      : ''}
    <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;" />
    <p style="font-size:13px;color:#6b7280;line-height:1.6;">If you no longer want these updates, <a href="${unsubscribeUrl}" target="_blank" rel="noreferrer" style="color:#2563eb;">click here to unsubscribe</a>.</p>`;
  const personalizedText = sanitizeString(
    `${stripHtml(formatTemplate(campaign.preview_text || campaign.html_content, values))}
    ${isReadinessCampaign ? formatRequestDetailsText(recipient.request, readinessUrl) : ''}`,
    5000
  );

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = personalizedSubject;
  sendSmtpEmail.htmlContent = personalizedHtml;
  sendSmtpEmail.textContent = personalizedText;
  sendSmtpEmail.sender = {
    name: process.env.BREVO_FROM_NAME || 'Dosnine Limited ',
    email: 'admin@dosnine.com',
  };
  sendSmtpEmail.to = [{ email: recipientRow.email, name: recipient.name }];
  await apiInstance.sendTransacEmail(sendSmtpEmail);
}

export async function processNewsletterQueue(db) {
  const { data: pending, error: pendingError } = await db
    .from('newsletter_campaign_recipients')
    .select('id, campaign_id, email, recipient_data')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(DAILY_SEND_LIMIT);
  if (pendingError) throw pendingError;
  if (!pending?.length) {
    return { sentCount: 0, failedCount: 0, queuedCount: 0, processedCount: 0 };
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not configured');

  const campaignIds = [...new Set(pending.map((recipient) => recipient.campaign_id))];
  const { data: campaigns, error: campaignError } = await db
    .from('newsletter_campaigns')
    .select('id, subject, preview_text, html_content, target')
    .in('id', campaignIds);
  if (campaignError) throw campaignError;
  const campaignsById = new Map((campaigns || []).map((campaign) => [campaign.id, campaign]));

  const { data: reservedSlots, error: quotaError } = await db.rpc(
    'reserve_newsletter_daily_send_slots',
    { requested_slots: pending.length }
  );
  if (quotaError) throw quotaError;

  const slotCount = Number(reservedSlots);
  if (!Number.isInteger(slotCount) || slotCount < 0 || slotCount > DAILY_SEND_LIMIT) {
    throw new Error('Newsletter daily quota returned an invalid reservation');
  }
  if (slotCount === 0) {
    return {
      sentCount: 0,
      failedCount: 0,
      queuedCount: pending.length,
      processedCount: 0,
    };
  }

  const candidateIds = pending.slice(0, slotCount).map((recipient) => recipient.id);
  const { data: claimed, error: claimError } = await db
    .from('newsletter_campaign_recipients')
    .update({ status: 'processing' })
    .in('id', candidateIds)
    .eq('status', 'pending')
    .select('id, campaign_id, email, recipient_data');
  if (claimError) throw claimError;
  if (!claimed?.length) {
    return {
      sentCount: 0,
      failedCount: 0,
      queuedCount: pending.length,
      processedCount: 0,
    };
  }

  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, apiKey);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dosnine.com';
  let sentCount = 0;
  let failedCount = 0;

  for (let offset = 0; offset < claimed.length; offset += SEND_CONCURRENCY) {
    const batch = claimed.slice(offset, offset + SEND_CONCURRENCY);
    await Promise.all(batch.map(async (recipient) => {
      const campaign = campaignsById.get(recipient.campaign_id);
      if (!campaign) {
        failedCount += 1;
        const { error } = await db
          .from('newsletter_campaign_recipients')
          .update({ status: 'failed', error_message: 'Campaign was not found' })
          .eq('id', recipient.id);
        if (error) console.error('Failed to record missing newsletter campaign:', error);
        return;
      }

      try {
        await sendRecipient(apiInstance, campaign, recipient, siteUrl);
        const { error } = await db
          .from('newsletter_campaign_recipients')
          .update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null })
          .eq('id', recipient.id);
        if (error) {
          console.error('Newsletter sent but recipient status could not be recorded:', error);
          return;
        }
        sentCount += 1;
      } catch (error) {
        failedCount += 1;
        console.error(`Failed to send newsletter to ${recipient.email}:`, error);
        const { error: updateError } = await db
          .from('newsletter_campaign_recipients')
          .update({
            status: 'failed',
            error_message: String(error?.message || 'Email delivery failed').slice(0, 1000),
          })
          .eq('id', recipient.id);
        if (updateError) console.error('Failed to record newsletter delivery failure:', updateError);
      }
    }));
  }

  for (const campaignId of campaignIds) {
    const { count, error } = await db
      .from('newsletter_campaign_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .in('status', ['pending', 'processing']);
    if (error) throw error;

    const { error: updateError } = await db
      .from('newsletter_campaigns')
      .update({
        status: count ? 'queued' : 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);
    if (updateError) throw updateError;
  }

  const { count: queuedCount, error: queuedError } = await db
    .from('newsletter_campaign_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (queuedError) throw queuedError;

  return {
    sentCount,
    failedCount,
    queuedCount: queuedCount || 0,
    processedCount: claimed.length,
  };
}
