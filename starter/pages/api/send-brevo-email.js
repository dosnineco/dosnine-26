import * as SibApiV3Sdk from '@getbrevo/brevo';
import { z } from 'zod';
import { requireAdminUser } from '@/lib/apiAuth';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { enforceMethods, sanitizeEmail, sanitizeString } from '@/lib/apiSecurity';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const admin = await requireAdminUser(req, res);
  if (!admin) return;

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'send-brevo-email',
    maxRequests: 4,
    windowMs: 60_000,
    identifier: String(admin.user.id),
  });

  if (!rate.allowed) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  }

  let payload;
  try {
    payload = z.object({
      to: z.string().email().max(254),
      subject: z.string().trim().min(1).max(200),
      htmlContent: z.string().trim().min(1).max(200_000),
      textContent: z.string().max(10_000).optional(),
    }).parse(req.body || {});
  } catch {
    return res.status(400).json({ error: 'Invalid request payload' });
  }

  const to = sanitizeEmail(payload.to);
  const subject = sanitizeString(payload.subject, 200);
  const htmlContent = String(payload.htmlContent || '').slice(0, 200_000);
  const textContent = payload.textContent ? sanitizeString(payload.textContent, 10_000) : null;

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('BREVO_API_KEY not configured');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, apiKey);

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = {
      name: 'Dosnine',
      email: 'dosnineco@gmail.com',
    };
    sendSmtpEmail.to = [{ email: to }];
    if (textContent) {
      sendSmtpEmail.textContent = textContent;
    }

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log('✅ Email sent successfully via Brevo:', data);
    return res.status(200).json({ success: true, messageId: data.messageId });
  } catch (error) {
    console.error('❌ Brevo API error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
