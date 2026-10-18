import * as SibApiV3Sdk from '@getbrevo/brevo';
import { z } from 'zod';
import { getDbClient, requireAdminUser } from '@/lib/apiAuth';
import { enforceMethods, sanitizeString } from '@/lib/apiSecurity';
import { normalizeParish } from '@/lib/normalizeParish';
import { getIncompleteBuyerReadinessRecipients } from '@/lib/incompleteBuyerReadiness';

const payloadSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  previewText: z.string().trim().max(300).optional(),
  htmlContent: z.string().trim().min(1).max(200_000),
  target: z.enum(['submittedVisitors', 'subscribedUsers', 'advertisements', 'both', 'buyers', 'sellers', 'renters', 'incompleteBuyerReadiness']),
  parish: z.string().trim().max(120).optional(),
});

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

function normalizeRecipientName(name) {
  const trimmed = String(name || '').trim();
  if (trimmed.toLowerCase() === 'website visitor') {
    return 'friend';
  }
  return trimmed;
}

function extractNameParts(fullName) {
  const name = normalizeRecipientName(fullName);
  if (!name) return { firstName: '', lastName: '' };
  const parts = name.split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
}

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const resolved = await requireAdminUser(req, res);
  if (!resolved) return;

  let payload;
  try {
    payload = payloadSchema.parse(req.body || {});
  } catch (error) {
    return res.status(400).json({ error: 'Invalid request payload' });
  }

  const db = getDbClient();
  const recipients = [];
  // Remove parish-specific filtering — send to all matching recipients
  const parishFilter = '';

  try {
    const serviceRequestTypeFilter = payload.target === 'buyers'
      ? ['buy']
      : payload.target === 'sellers'
      ? ['sell']
      : payload.target === 'renters'
      ? ['rent']
      : null;

    if (payload.target === 'submittedVisitors' || payload.target === 'both' || serviceRequestTypeFilter) {
      let requestQuery = db
        .from('service_requests')
        .select('client_email, client_name, parish, request_type')
        .neq('client_email', '')
        .order('created_at', { ascending: false })
        .limit(250);

      if (serviceRequestTypeFilter) {
        requestQuery = requestQuery.in('request_type', serviceRequestTypeFilter);
      }

      const { data: serviceRequests, error: requestError } = await requestQuery;

      if (requestError) throw requestError;
      (serviceRequests || []).forEach((item) => {
        const email = item?.client_email?.trim().toLowerCase();
        if (!email) return;
        const rawName = String(item?.client_name || '').trim();
        const name = normalizeRecipientName(rawName);
        const { firstName, lastName } = extractNameParts(name);
        recipients.push({
          email,
          name: name || undefined,
          firstName,
          lastName,
          parish: item?.parish || '',
        });
      });
    }

    if (payload.target === 'incompleteBuyerReadiness') {
      recipients.push(...await getIncompleteBuyerReadinessRecipients(db));
    }

    if (payload.target === 'subscribedUsers' || payload.target === 'both') {
      const { data: users, error: userError } = await db
        .from('users')
        .select('email, full_name, parish')
        .eq('newsletter_opted_in', true)
        .neq('email', '')
        .limit(250);

      if (userError) throw userError;
      (users || []).forEach((item) => {
        const email = item?.email?.trim().toLowerCase();
        if (!email) return;
        const rawName = String(item?.full_name || '').trim();
        const name = normalizeRecipientName(rawName);
        const { firstName, lastName } = extractNameParts(name);
        recipients.push({
          email,
          name: name || undefined,
          firstName,
          lastName,
          parish: item?.parish || '',
        });
      });
    }

    if (payload.target === 'advertisements' || payload.target === 'both') {
      const { data: ads, error: adsError } = await db
        .from('advertisements')
        .select('email, company_name, contact_name')
        .neq('email', '')
        .order('created_at', { ascending: false })
        .limit(250);

      if (adsError) throw adsError;
      (ads || []).forEach((item) => {
        const email = item?.email?.trim().toLowerCase();
        if (!email) return;
        const name = String(item?.contact_name || item?.company_name || '').trim();
        const { firstName, lastName } = extractNameParts(name);
        recipients.push({
          email,
          name: name || undefined,
          firstName,
          lastName,
          parish: '',
        });
      });
    }

    const deduplicatedRecipients = Array.from(
      new Map(recipients.map((item) => [item.email, item])).values(),
    );
    const uniqueRecipients = payload.target === 'incompleteBuyerReadiness'
      ? deduplicatedRecipients
      : deduplicatedRecipients.slice(0, 250);
    if (uniqueRecipients.length === 0) {
      return res.status(400).json({ error: 'No valid recipients found for the selected list.' });
    }

    const emailCount = uniqueRecipients.length;
    const sendRecipients = uniqueRecipients.slice(0, 100);
    const truncated = emailCount > sendRecipients.length;

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.error('BREVO_API_KEY not configured');
      return res.status(500).json({ error: 'Brevo API key is not configured' });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dosnine.com';
    const unsubscribeUrl = `${siteUrl.replace(/\/$/, '')}/newsletter/unsubscribe`;
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, apiKey);

    let sentCount = 0;
    for (const recipient of sendRecipients) {
      const nameParts = recipient.name ? extractNameParts(recipient.name) : { firstName: recipient.firstName || '', lastName: recipient.lastName || '' };
      const values = {
        first_name: nameParts.firstName || 'there',
        last_name: nameParts.lastName || '',
        parish: recipient.parish || payload.parish || '',
        email: recipient.email,
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

      const personalizedSubject = sanitizeString(formatTemplate(payload.subject, values), 200);
      const readinessUrl = recipient.request?.serviceRequestId
        ? `${siteUrl.replace(/\/$/, '')}/buyer-prequalification?serviceRequestId=${encodeURIComponent(recipient.request.serviceRequestId)}`
        : `${siteUrl.replace(/\/$/, '')}/buyer-prequalification`;
      const personalizedHtml = `${formatTemplate(payload.htmlContent, values, true)}
        ${payload.target === 'incompleteBuyerReadiness'
          ? `${formatRequestDetails(recipient.request || {})}
            <p style="margin:20px 0 0;">
              <a href="${escapeHtml(readinessUrl)}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#F55353;color:#ffffff;text-decoration:none;font-weight:600;">Continue buyer readiness</a>
            </p>`
          : ''}
        <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;" />
        <p style="font-size:13px;color:#6b7280;line-height:1.6;">If you no longer want these updates, <a href="${unsubscribeUrl}" target="_blank" rel="noreferrer" style="color:#2563eb;">click here to unsubscribe</a>.</p>`;
      const personalizedText = sanitizeString(
        `${stripHtml(formatTemplate(payload.previewText || payload.htmlContent, values))}
        ${payload.target === 'incompleteBuyerReadiness'
          ? formatRequestDetailsText(recipient.request || {}, readinessUrl)
          : ''}`,
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
      sendSmtpEmail.to = [{ email: recipient.email, name: recipient.name }];

      try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        sentCount += 1;
      } catch (error) {
        console.error(`Failed to send newsletter to ${recipient.email}:`, error);
      }
    }

    return res.status(200).json({
      success: true,
      sentCount,
      recipientCount: emailCount,
      truncated,
    });
  } catch (error) {
    console.error('Newsletter send error:', error);
    const message = error?.message || 'Failed to send newsletter';
    return res.status(500).json({ error: message });
  }
}
