import { z } from 'zod';
import { getDbClient, requireDbUser } from '../../../lib/apiAuth';

const inquirySchema = z.object({
  advertisementId: z.string().uuid(),
  message: z.string().trim().min(10).max(2000),
  phone: z.string().trim().min(7).max(40).optional().or(z.literal('')),
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resolved = await requireDbUser(req, res);
  if (!resolved) return;

  const accountVerified =
    resolved.user.identity_verified === true ||
    resolved.user.id_verification_status === 'approved' ||
    resolved.user.account_status === 'active';

  if (!accountVerified) {
    return res.status(403).json({ error: 'A verified Dosnine account is required to contact this advertiser.' });
  }

  const parsed = inquirySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter a message of at least 10 characters.' });
  }

  try {
    const db = getDbClient();
    const { data: advertisement, error: advertisementError } = await db
      .from('advertisements')
      .select('id, company_name, advertiser_id, is_active')
      .eq('id', parsed.data.advertisementId)
      .maybeSingle();

    if (advertisementError || !advertisement?.is_active || !advertisement.advertiser_id) {
      return res.status(404).json({ error: 'This advertisement is unavailable for enquiries.' });
    }

    const { error } = await db.from('advertisement_inquiries').insert([{
      advertisement_id: advertisement.id,
      advertiser_id: advertisement.advertiser_id,
      client_user_id: resolved.user.id,
      client_name: resolved.user.full_name || 'Dosnine Client',
      client_email: resolved.user.email,
      client_phone: parsed.data.phone || null,
      message: parsed.data.message,
    }]);

    if (error) {
      return res.status(500).json({ error: 'Unable to send your enquiry right now.' });
    }

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error('Advertisement enquiry error:', error);
    return res.status(500).json({ error: 'Unable to send your enquiry right now.' });
  }
}