import { getDbClient, requireAdminUser } from '../../../lib/apiAuth';
import { sendBrevoEmail } from '../../../lib/serviceRequestAllocation';

const escapeHtml = (value) =>
  String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

async function sendAdvertiserApprovalEmail(db, submission) {
  const recipient = String(submission.email || '').trim();
  if (
    !recipient ||
    recipient.endsWith('@dosnine.local') ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)
  ) {
    throw new Error('Advertiser email address is unavailable or invalid.');
  }

  const { data: linkedAd, error: linkError } = await db
    .from('advertisements')
    .select('id, title, company_name')
    .eq('sponsor_submission_id', submission.id)
    .maybeSingle();
  if (linkError && !['42703', 'PGRST204'].includes(linkError.code)) throw linkError;

  let ad = linkedAd;
  if (!ad?.id) {
    const { data: userAds, error: userAdsError } = await db
      .from('advertisements')
      .select('id, title, company_name, email')
      .eq('created_by_clerk_id', submission.created_by_clerk_id)
      .order('created_at', { ascending: false });
    if (userAdsError) throw userAdsError;

    const normalizedCompany = String(submission.company_name || '').trim().toLowerCase();
    const normalizedEmail = recipient.toLowerCase();
    ad = (userAds || []).find((item) =>
      String(item.company_name || '').trim().toLowerCase() === normalizedCompany &&
      String(item.email || '').trim().toLowerCase() === normalizedEmail
    );
  }
  if (!ad?.id) throw new Error('Approved advertisement link could not be resolved.');

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dosnine.com').replace(/\/+$/, '');
  const adUrl = `${siteUrl}/ads/${encodeURIComponent(ad.id)}`;
  const title = ad.title || ad.company_name || submission.company_name || 'your advertisement';
  const htmlContent = `
    <h2>Your advertisement is approved</h2>
    <p>Hi ${escapeHtml(submission.contact_name || submission.company_name || 'there')},</p>
    <p>Your payment has been verified and your advertisement is now approved and active on Dosnine.</p>
    <p><strong>Advertisement:</strong> ${escapeHtml(title)}</p>
    <p><a href="${adUrl}">View your advertisement</a></p>
    <p>You can also sign in to your Dosnine account to manage your advertisement.</p>
    <p>Thank you,<br />Dosnine</p>
  `;
  const textContent = [
    'Your advertisement is approved',
    `Hi ${submission.contact_name || submission.company_name || 'there'},`,
    'Your payment has been verified and your advertisement is now approved and active on Dosnine.',
    `Advertisement: ${title}`,
    `View your advertisement: ${adUrl}`,
    'You can also sign in to your Dosnine account to manage your advertisement.',
    'Thank you, Dosnine',
  ].join('\n\n');

  await sendBrevoEmail({
    to: recipient,
    subject: 'Your Dosnine advertisement is approved',
    htmlContent,
    textContent,
  });
}

export default async function handler(req, res) {
  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const db = getDbClient();

    if (req.method === 'GET') {
      let waitlistWarning = null;
      const { error: waitlistError } = await db.rpc(
        'promote_available_waitlisted_sponsor_submissions'
      );
      if (waitlistError) {
        waitlistWarning = 'Apply migration 057 to automatically promote paid waitlisted ads when a monthly slot opens.';
        console.error('Automatic sponsor waitlist promotion failed:', waitlistError);
      }

      const [{ data: ads, error: adsError }, { data: submissions, error: submissionsError }] = await Promise.all([
        db.from('advertisements').select('*').order('created_at', { ascending: false }),
        db.from('sponsor_submissions').select('*').order('submitted_at', { ascending: false }),
      ]);

      if (adsError) throw adsError;
      if (submissionsError) throw submissionsError;

      const monthParts = new Intl.DateTimeFormat('en', {
        timeZone: 'America/Jamaica',
        year: 'numeric',
        month: '2-digit',
      }).formatToParts(new Date());
      const currentSponsorMonth = `${monthParts.find((part) => part.type === 'year')?.value}-${monthParts.find((part) => part.type === 'month')?.value}-01`;
      let reservedSlots = null;
      let capacityWarning = waitlistWarning;
      const capacityWithReleases = await db
        .from('sponsor_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('payment_status', 'paid')
        .eq('scheduled_month', currentSponsorMonth)
        .is('capacity_released_at', null)
        .neq('status', 'rejected');
      if (!capacityWithReleases.error) {
        reservedSlots = capacityWithReleases.count || 0;
      } else if (['42703', 'PGRST204'].includes(capacityWithReleases.error.code)) {
        const legacyCapacity = await db
          .from('sponsor_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('payment_status', 'paid')
          .eq('scheduled_month', currentSponsorMonth)
          .neq('status', 'rejected');
        if (legacyCapacity.error) {
          capacityWarning = 'Apply migration 056 to enable accurate capacity tracking.';
          console.error('Monthly capacity lookup failed:', legacyCapacity.error);
        } else {
          reservedSlots = legacyCapacity.count || 0;
          capacityWarning = 'Apply migration 056 to release slots when ads are deactivated or deleted.';
          console.error('Monthly capacity release migration is missing:', capacityWithReleases.error);
        }
      } else {
        capacityWarning = 'Monthly capacity could not be loaded.';
        console.error('Monthly capacity lookup failed:', capacityWithReleases.error);
      }

      const { data: pricing, error: pricingError } = await db
        .from('site_settings')
        .select('value')
        .eq('key', 'ad_plan_prices')
        .maybeSingle();
      if (pricingError) {
        console.error('Ad pricing settings are not configured; using default prices:', pricingError);
      }

      const submissionsWithReceipts = await Promise.all(
        (submissions || []).map(async (submission) => {
          if (!submission.payment_receipt_path) return submission;
          try {
            const { data, error } = await db.storage
              .from('payment-receipts')
              .createSignedUrl(submission.payment_receipt_path, 3600);
            if (error) throw error;
            return { ...submission, payment_receipt_url: data.signedUrl };
          } catch (error) {
            console.error(`Failed to create receipt URL for submission ${submission.id}:`, error);
            return { ...submission, payment_receipt_url: null };
          }
        })
      );

      res.setHeader('Cache-Control', 'no-store, max-age=0');
      return res.status(200).json({
        success: true,
        ads: ads || [],
        submissions: submissionsWithReceipts,
        monthlyCapacity: reservedSlots === null
          ? { month: currentSponsorMonth, limit: 40, reserved: null, warning: capacityWarning }
          : {
              month: currentSponsorMonth,
              limit: 40,
              reserved: reservedSlots,
              warning: capacityWarning,
            },
        capacityWarning,
        adPlanPrices: { '14-day': 17999, '30-day': 52499, pro: 90999, ...(pricing?.value || {}) },
      });
    }

    if (req.method === 'PATCH') {
      if (req.body?.adPlanPrices) {
        const { adPlanPrices } = req.body;
        const planIds = ['14-day', '30-day', 'pro'];
        if (
          !adPlanPrices ||
          typeof adPlanPrices !== 'object' ||
          Array.isArray(adPlanPrices) ||
          planIds.some((planId) =>
            !Number.isInteger(Number(adPlanPrices[planId])) ||
            Number(adPlanPrices[planId]) < 1 ||
            Number(adPlanPrices[planId]) > 10000000
          )
        ) {
          return res.status(400).json({ error: 'Enter valid prices for all ad plans.' });
        }

        const { error } = await db.from('site_settings').upsert(
          {
            key: 'ad_plan_prices',
            value: Object.fromEntries(planIds.map((planId) => [planId, Number(adPlanPrices[planId])])),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      const { id, status } = req.body || {};
      if (!id || !status) {
        return res.status(400).json({ error: 'Missing id or status' });
      }

      const allowedStatuses = ['pending', 'pending_payment', 'pending_review', 'waitlisted', 'approved', 'rejected'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const { data: submission, error: submissionError } = await db
        .from('sponsor_submissions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (submissionError) throw submissionError;
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      if (
        status === 'pending_review' &&
        ['pending_payment', 'pending_review'].includes(submission.status) &&
        submission.payment_status !== 'paid'
      ) {
        if (!submission.payment_receipt_path) {
          return res.status(409).json({ error: 'Upload a payment receipt before confirming this transfer.' });
        }
        const { error } = await db.rpc('confirm_bank_transfer_sponsor_payment', {
          p_submission_id: id,
        });
        if (error) {
          if (
            String(error.message || '').includes('Rejected sponsor submissions')
            || String(error.message || '').includes('Sponsor submission not found')
          ) {
            return res.status(409).json({ error: error.message });
          }
          throw error;
        }
        return res.status(200).json({ success: true });
      }

      if (status === 'approved') {
        const { error } = await db.rpc('approve_paid_sponsor_submission', {
          p_submission_id: id,
        });
        if (error) {
          if (String(error.message || '').includes('Only paid submissions')) {
            return res.status(409).json({ error: error.message });
          }
          throw error;
        }
        let emailWarning = null;
        try {
          await sendAdvertiserApprovalEmail(db, submission);
        } catch (emailError) {
          const reason = emailError?.message || 'Unknown email delivery error';
          emailWarning = `Advertisement approved, but the customer email could not be sent: ${reason}`;
          console.error(`Advertiser approval email failed for submission ${id}:`, emailError);
        }
        return res.status(200).json({ success: true, emailWarning });
      }

      if (status === 'pending_review' && submission.status === 'waitlisted') {
        const { error } = await db.rpc('promote_waitlisted_sponsor_submission', {
          p_submission_id: id,
        });
        if (error) {
          if (String(error.message || '').includes('Only paid waitlisted submissions')
            || String(error.message || '').includes('future month')
            || String(error.message || '').includes('current month is full')
            || String(error.message || '').includes('No available monthly slot')) {
            return res.status(409).json({ error: error.message });
          }
          throw error;
        }
        return res.status(200).json({ success: true });
      }

      const updates = {
        status,
      };

      const { error } = await db
        .from('sponsor_submissions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin advertisements API error:', error);
    if (error?.code === 'PGRST205' && String(error?.message || '').includes('site_settings')) {
      return res.status(503).json({
        error: 'The site_settings table is missing from Supabase. Run db-migrations/052_ensure_site_settings_for_ad_pricing.sql in the Supabase SQL Editor, then retry.',
      });
    }
    const message = typeof error?.message === 'string' ? error.message : 'Request failed';
    return res.status(500).json({ error: message });
  }
}
