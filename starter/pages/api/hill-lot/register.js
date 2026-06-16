import { getDbClient } from '@/lib/apiAuth';
import { enforceMethods, sanitizeEmail, sanitizePhoneInput, sanitizeText } from '@/lib/apiSecurity';
import { enforceRateLimit } from '@/lib/rateLimit';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const rate = enforceRateLimit(req, res, {
    keyPrefix: 'hill-lot-register',
    maxRequests: 10,
    windowMs: 60_000,
  });

  if (!rate.allowed) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  }

  const { email, phone, interest } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  const sanitizedEmail = sanitizeEmail(email);
  const sanitizedPhone = sanitizePhoneInput(phone || '');
  const sanitizedInterest = sanitizeText(interest || 'stay').slice(0, 50);
  const page = '/hill-lot';
  const source = 'hill-lot-waiting-list';

  try {
    const db = getDbClient();
    const { error } = await db.from('visitor_emails').insert([
      {
        email: sanitizedEmail,
        phone: sanitizedPhone || null,
        intent: sanitizedInterest || 'stay',
        page,
        source,
      },
    ]);

    if (error) {
      console.error('Hill lot registration insert error:', error);
      return res.status(500).json({ error: 'Unable to add you to the waiting list right now.' });
    }

    return res.status(200).json({ success: true, message: 'You have been added to the waiting list.' });
  } catch (error) {
    console.error('Hill lot registration error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
