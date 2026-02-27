import * as SibApiV3Sdk from '@getbrevo/brevo';
import { enforceRateLimit } from '@/lib/rateLimit';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rate = enforceRateLimit(req, res, {
    keyPrefix: 'send-brevo-email',
    maxRequests: 4,
    windowMs: 60_000,
  });

  if (!rate.allowed) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  }

  const { to, subject, htmlContent, textContent } = req.body;

  if (!to || !subject || !htmlContent) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, htmlContent' });
  }

  if (
    String(to).length > 254 ||
    String(subject).length > 200 ||
    String(htmlContent).length > 200_000 ||
    (textContent && String(textContent).length > 10_000)
  ) {
    return res.status(400).json({ error: 'One or more fields exceed allowed length' });
  }

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
    return res.status(500).json({ 
      error: 'Failed to send email', 
      details: error.message 
    });
  }
}
