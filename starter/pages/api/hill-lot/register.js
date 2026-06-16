import { getDbClient } from '@/lib/apiAuth';
import { enforceMethods, sanitizeEmail, sanitizePhoneInput, sanitizeText } from '@/lib/apiSecurity';
import { enforceRateLimit } from '@/lib/rateLimit';
import * as SibApiV3Sdk from '@getbrevo/brevo';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const rate = enforceRateLimit(req, res, {
    keyPrefix: 'hill-lot-register',
    maxRequests: 8,
    windowMs: 60_000,
  });

  if (!rate.allowed) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  }

  const {
    fullName,
    email,
    phone,
    stayType,
  } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  const sanitizedFullName = sanitizeText(fullName).slice(0, 200);
  const sanitizedEmail = sanitizeEmail(email);
  const sanitizedPhone = sanitizePhoneInput(phone || '');
  const sanitizedStayType = sanitizeText(stayType || 'pre-registration (end 2030)').slice(0, 50);
  const page = '/hill-lot';
  const source = 'hill-lot-airbnb-registration-form';

  try {
    const db = getDbClient();
    const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
    const referrer = typeof req.headers.referer === 'string' ? req.headers.referer : null;
    const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;

    const { error } = await db.from('hill_lot_pre_registrations').insert([
      {
        full_name: sanitizedFullName,
        email: sanitizedEmail,
        phone: sanitizedPhone || null,
        stay_type: sanitizedStayType,
        page,
        source,
        ip_address: ipAddress || null,
        referrer,
        user_agent: userAgent,
      },
    ]);

    if (error) {
      console.error('Hill lot registration insert error:', error);
      return res.status(500).json({ error: 'Unable to register your booking request right now.' });
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
    let emailSent = false;

    if (BREVO_API_KEY) {
      try {
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);

        const userEmail = new SibApiV3Sdk.SendSmtpEmail();
        userEmail.sender = { name: 'The Hill Lot Airbnb', email: 'hello@dosnine.com' };
        userEmail.to = [{ email: sanitizedEmail, name: sanitizedFullName }];
        userEmail.subject = 'Your Hill Lot Airbnb booking request was received';
        userEmail.htmlContent = `
          <html>
            <body style="font-family: Arial, sans-serif; background: #f4f7f5; margin: 0; padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2ebe7;">
                <tr>
                  <td style="background: #428475; color: #ffffff; padding: 32px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">Your booking request is confirmed</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px; color: #1f3e34;">
                    <p style="margin: 0 0 24px;">Hi ${sanitizedFullName},</p>
                    <p style="margin: 0 0 24px; line-height: 1.75;">Thank you for registering your interest in The Hill Lot Airbnb. We have received your request and will contact you soon with booking details and availability.</p>
                    <p style="margin: 0 0 16px;"><strong>Stay type:</strong> ${sanitizedStayType}</p>
                    <p style="margin: 0 0 24px; line-height: 1.75;">If you have questions, reply to this email or contact us at <a href="mailto:hello@dosnine.com">hello@dosnine.com</a>.</p>
                    <p style="margin: 0; color: #425f53;">Best regards,<br/>The Hill Lot Airbnb team</p>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `;

        await apiInstance.sendTransacEmail(userEmail);
        emailSent = true;
      } catch (sendError) {
        console.error('Hill lot registration email error:', sendError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Your booking request has been received. We will be in touch shortly.',
      emailSent,
    });
  } catch (error) {
    console.error('Hill lot registration error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
