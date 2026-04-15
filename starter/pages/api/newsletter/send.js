import * as SibApiV3Sdk from '@getbrevo/brevo';
import { z } from 'zod';
import { getDbClient, requireAdminUser } from '@/lib/apiAuth';
import { enforceMethods, sanitizeString } from '@/lib/apiSecurity';
import { normalizeParish } from '@/lib/normalizeParish';

const payloadSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  previewText: z.string().trim().max(300).optional(),
  htmlContent: z.string().trim().min(1).max(200_000),
  target: z.enum(['submittedVisitors', 'subscribedUsers', 'both']),
  parish: z.string().trim().max(120).optional(),
});

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatTemplate(template, values) {
  return String(template || '').replace(/{{\s*([^}]+)\s*}}/g, (_, key) => {
    const normalizedKey = String(key).trim().toLowerCase();
    return String(values[normalizedKey] ?? '');
  });
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
  const parishFilter = payload.parish ? normalizeParish(payload.parish) : '';

  try {
    if (payload.target === 'submittedVisitors' || payload.target === 'both') {
      const { data: serviceRequests, error: requestError } = await db
        .from('service_requests')
        .select('client_email, client_name, parish')
        .neq('client_email', '')
        .order('created_at', { ascending: false })
        .limit(250);

      if (requestError) throw requestError;
      (serviceRequests || []).forEach((item) => {
        const email = item?.client_email?.trim().toLowerCase();
        const parish = normalizeParish(item?.parish || '');
        if (!email) return;
        if (parishFilter && parish !== parishFilter) return;
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
        const parish = normalizeParish(item?.parish || '');
        if (!email) return;
        if (parishFilter && parish !== parishFilter) return;
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

    const uniqueRecipients = Array.from(
      new Map(recipients.map((item) => [item.email, item])).values(),
    ).slice(0, 250);
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
      };

      const personalizedSubject = sanitizeString(formatTemplate(payload.subject, values), 200);
      const personalizedHtml = `${formatTemplate(payload.htmlContent, values)}
        <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;" />
        <p style="font-size:13px;color:#6b7280;line-height:1.6;">If you no longer want these updates, <a href="${unsubscribeUrl}" target="_blank" rel="noreferrer" style="color:#2563eb;">click here to unsubscribe</a>.</p>`;
      const personalizedText = stripHtml(formatTemplate(payload.previewText || payload.htmlContent, values));

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.subject = personalizedSubject;
      sendSmtpEmail.htmlContent = personalizedHtml;
      sendSmtpEmail.textContent = sanitizeString(personalizedText, 5000);
      sendSmtpEmail.sender = {
        name: 'Tahjay- Dosnine',
        email: 'dosnineco@gmail.com',
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
