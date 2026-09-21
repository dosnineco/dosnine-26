import { z } from 'zod';
import { getDbClient, requireDbUser } from '../../../lib/apiAuth';
import { sendBrevoEmail } from '../../../lib/serviceRequestAllocation';

const inquirySchema = z.object({
  advertisementId: z.string().uuid(),
  message: z.string().trim().min(10).max(2000),
  phone: z.string().trim().min(7).max(40).optional().or(z.literal('')),
});

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

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
      .select('id, company_name, email, advertiser_id, created_by_clerk_id, is_active')
      .eq('id', parsed.data.advertisementId)
      .maybeSingle();

    if (advertisementError || !advertisement?.is_active) {
      return res.status(404).json({ error: 'This advertisement is unavailable for enquiries.' });
    }

    let advertiserId = advertisement.advertiser_id;
    if (!advertiserId && advertisement.created_by_clerk_id) {
      const { data: owner, error: ownerError } = await db
        .from('users')
        .select('id')
        .eq('clerk_id', advertisement.created_by_clerk_id)
        .maybeSingle();

      if (ownerError) throw ownerError;
      advertiserId = owner?.id || null;
    }

    if (!advertiserId && advertisement.email) {
      const { data: owner, error: ownerError } = await db
        .from('users')
        .select('id')
        .eq('email', advertisement.email.trim().toLowerCase())
        .maybeSingle();

      if (ownerError) throw ownerError;
      advertiserId = owner?.id || null;
    }

    if (!advertiserId) {
      return res.status(404).json({ error: 'This advertisement is unavailable for enquiries.' });
    }

    if (!advertisement.advertiser_id) {
      const { error: ownerUpdateError } = await db
        .from('advertisements')
        .update({ advertiser_id: advertiserId })
        .eq('id', advertisement.id);

      if (ownerUpdateError) throw ownerUpdateError;
    }

    const { error } = await db.from('advertisement_inquiries').insert([{
      advertisement_id: advertisement.id,
      advertiser_id: advertiserId,
      client_user_id: resolved.user.id,
      client_name: resolved.user.full_name || 'Dosnine Client',
      client_email: resolved.user.email,
      client_phone: parsed.data.phone || null,
      message: parsed.data.message,
    }]);

    if (error) {
      return res.status(500).json({ error: 'Unable to send your enquiry right now.' });
    }

    try {
      await sendBrevoEmail({
        to: advertisement.email,
        subject: `New enquiry for ${advertisement.company_name || 'your advertisement'}`,
        htmlContent: `
          <h2>New advertisement enquiry</h2>
          <p>Someone is interested in <strong>${escapeHtml(advertisement.company_name || 'your advertisement')}</strong>.</p>
          <hr />
          <p><strong>Name:</strong> ${escapeHtml(resolved.user.full_name || 'Dosnine Client')}</p>
          <p><strong>Email:</strong> ${escapeHtml(resolved.user.email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(parsed.data.phone || 'Not provided')}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(parsed.data.message).replace(/\n/g, '<br />')}</p>
          <p><a href="https://dosnine.com/agent/dashboard">Open your Dosnine dashboard</a></p>
        `,
        textContent: [
          'New advertisement enquiry',
          `Business: ${advertisement.company_name || 'Your advertisement'}`,
          `Name: ${resolved.user.full_name || 'Dosnine Client'}`,
          `Email: ${resolved.user.email}`,
          `Phone: ${parsed.data.phone || 'Not provided'}`,
          `Message: ${parsed.data.message}`,
          'Open your Dosnine dashboard: https://dosnine.com/agent/dashboard',
        ].join('\n'),
      });
    } catch (emailError) {
      console.error('Advertisement enquiry notification email failed:', emailError);
    }

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error('Advertisement enquiry error:', error);
    return res.status(500).json({ error: 'Unable to send your enquiry right now.' });
  }
}