import * as SibApiV3Sdk from '@getbrevo/brevo';
import { z } from 'zod';
import { requireAdminUser } from '@/lib/apiAuth';
import { enforceMethods, sanitizeString } from '@/lib/apiSecurity';

const payloadSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  previewText: z.string().trim().max(300).optional(),
  htmlContent: z.string().trim().min(1).max(200_000),
});

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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

  const recipientEmail = resolved.user.email;
  if (!recipientEmail) {
    return res.status(400).json({ error: 'Admin email is not available' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('BREVO_API_KEY not configured');
    return res.status(500).json({ error: 'Brevo API key is not configured' });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dosnine.com';
  const unsubscribeUrl = `${siteUrl.replace(/\/$/, '')}/newsletter/unsubscribe`;
  const htmlWithFooter = `${payload.htmlContent}
    <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;" />
    <p style="font-size:13px;color:#6b7280;line-height:1.6;">If you no longer want these updates, <a href="${unsubscribeUrl}" target="_blank" rel="noreferrer" style="color:#2563eb;">click here to unsubscribe</a>.</p>`;
  const textContent = stripHtml(payload.previewText || payload.htmlContent);

  try {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, apiKey);

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = sanitizeString(`TEST: ${payload.subject}`, 200);
    sendSmtpEmail.htmlContent = htmlWithFooter;
    sendSmtpEmail.textContent = sanitizeString(textContent, 5000);
    sendSmtpEmail.sender = {
      name: 'Dosnine',
      email: 'dosnineco@gmail.com',
    };
    sendSmtpEmail.to = [{ email: recipientEmail }];

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    return res.status(200).json({ success: true, email: recipientEmail });
  } catch (error) {
    console.error('Newsletter test send error:', error);
    const message = error?.message || 'Failed to send test email';
    return res.status(500).json({ error: message });
  }
}
