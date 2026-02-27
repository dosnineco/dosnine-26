import { getDbClient } from '@/lib/apiAuth';
import { enforceRateLimit } from '@/lib/rateLimit';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rate = enforceRateLimit(req, res, {
    keyPrefix: 'contact-submit',
    maxRequests: 8,
    windowMs: 60_000,
  });

  if (!rate.allowed) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  }

  const { name, email, phone, subject, message } = req.body || {};

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (
    String(name).length > 120 ||
    String(email).length > 254 ||
    String(subject).length > 200 ||
    String(message).length > 5000 ||
    (phone && String(phone).length > 40)
  ) {
    return res.status(400).json({ error: 'One or more fields exceed allowed length' });
  }

  try {
    const db = getDbClient();
    const { error } = await db
      .from('contact_submissions')
      .insert([{
        name,
        email,
        phone: phone || null,
        subject,
        message,
        submitted_at: new Date().toISOString()
      }]);

    if (error) {
      return res.status(500).json({ error: 'Failed to submit contact form' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
