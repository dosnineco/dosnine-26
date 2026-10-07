// pages/api/sponsors/submit.js
import { enforceRateLimit } from '@/lib/rateLimit';
import { getDbClient, isAdvertiserAccount, requireDbUser } from '@/lib/apiAuth';

const AD_PLANS = {
  '14-day': { id: '14-day', name: 'Professional', amount: 17999, durationDays: 14 },
  '30-day': { id: '30-day', name: 'Elite', amount: 52499, durationDays: 30 },
  pro: { id: 'pro', name: 'Pro', amount: 90999, durationDays: 30 },
};

const STANDARD_PLACEMENTS = ['popup', 'display', 'infeed'];
const PRO_PLACEMENTS = [...STANDARD_PLACEMENTS, 'newsletter'];
const MAX_DATABASE_INTEGER = 2147483647;
const PLACEMENT_LABELS = {
  popup: 'Pop-up',
  display: 'Display',
  infeed: 'In-feed',
  newsletter: 'Newsletter',
};

const ALLOWED_AD_CATEGORIES = new Set([
  'home_inspection',
  'legal',
  'architect',
  'mortgage',
  'insurance',
  'valuation',
  'contractor',
  'other',
]);

const CATEGORY_ALIASES = {
  electrician: 'contractor',
  plumber: 'contractor',
  mover: 'contractor',
  pest_control: 'contractor',
  realtor: 'other',
  attorney: 'legal',
  surveyor: 'other',
  property_manager: 'other',
  developer: 'other',
  furniture_store: 'other',
  hardware_store: 'other',
  solar: 'other',
  ac: 'other',
};

function normalizeCategory(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'contractor';
  if (ALLOWED_AD_CATEGORIES.has(normalized)) return normalized;
  return CATEGORY_ALIASES[normalized] || 'other';
}

/**
 * Lazily resolve the Brevo SDK. Supports both the legacy namespace shape
 * (v1.x) and the newer ESM shape (v2.x) so this never throws at module load.
 */
async function loadBrevoSdk() {
  const mod = await import('@getbrevo/brevo');
  const sdk =
    mod?.default && typeof mod.default === 'object'
      ? { ...mod, ...mod.default }
      : mod;

  const TransactionalEmailsApi = sdk.TransactionalEmailsApi;
  const TransactionalEmailsApiApiKeys = sdk.TransactionalEmailsApiApiKeys;
  const SendSmtpEmail = sdk.SendSmtpEmail;

  if (!TransactionalEmailsApi || !TransactionalEmailsApiApiKeys || !SendSmtpEmail) {
    throw new Error('Brevo SDK is missing required exports.');
  }

  return { TransactionalEmailsApi, TransactionalEmailsApiApiKeys, SendSmtpEmail };
}

async function sendAdminAdSubmissionEmail({
  company_name,
  title,
  category,
  description,
  phone,
  email,
  website,
  image_url,
  image_urls,
  contact_name,
  selectedPlan,
  submittedAt,
  submissionId,
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;

  const adminEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'admin@dosnine.com';
  const senderEmail = process.env.BREVO_FROM_EMAIL || 'admin@dosnine.com';
  const senderName = process.env.BREVO_FROM_NAME || 'Dosnine';

  const { TransactionalEmailsApi, TransactionalEmailsApiApiKeys, SendSmtpEmail } =
    await loadBrevoSdk();

  const apiInstance = new TransactionalEmailsApi();
  apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, apiKey);

  const planDuration = selectedPlan?.durationMonths
    ? `${selectedPlan.durationMonths} ${
        selectedPlan.durationMonths === 1 ? 'month' : 'months'
      }`
    : `${selectedPlan?.durationDays || 0} days`;

  const htmlContent = `
    <h2>New Ad Submission Received</h2>
    <p><strong>Submission ID:</strong> ${submissionId}</p>
    <p><strong>Submitted At:</strong> ${submittedAt}</p>
    <hr />
    <p><strong>Business Name:</strong> ${company_name || ''}</p>
    <p><strong>Ad Title:</strong> ${title || ''}</p>
    <p><strong>Contact Name:</strong> ${contact_name || ''}</p>
    <p><strong>Category:</strong> ${category || ''}</p>
    <p><strong>Phone:</strong> ${phone || ''}</p>
    <p><strong>Email:</strong> ${email || ''}</p>
    <p><strong>Website:</strong> ${website || ''}</p>
    <p><strong>Primary Image URL:</strong> ${image_url || ''}</p>
    <p><strong>All Images:</strong></p>
    <ul>
      ${(Array.isArray(image_urls) ? image_urls : [])
        .map((url) => `<li>${url}</li>`)
        .join('')}
    </ul>
    <p><strong>Plan:</strong> ${selectedPlan?.name || ''} (${planDuration})</p>
    <p><strong>Amount:</strong> JMD $${Number(selectedPlan?.amount || 0).toLocaleString()}</p>
    <p><strong>Placements:</strong> ${(selectedPlan?.placements || [])
      .map((placement) => PLACEMENT_LABELS[placement])
      .join(', ')}</p>
    <hr />
    <p><strong>Description:</strong></p>
    <p>${String(description || '').replace(/\n/g, '<br/>')}</p>
  `;

  const emailPayload = new SendSmtpEmail();
  emailPayload.sender = { name: senderName, email: senderEmail };
  emailPayload.to = [{ email: adminEmail, name: 'Dosnine Admin' }];
  emailPayload.subject = `New Ad Submission: ${company_name || 'Unknown Business'}`;
  emailPayload.htmlContent = htmlContent;

  await apiInstance.sendTransacEmail(emailPayload);
}

export default async function handler(req, res) {
  // Guarantee a JSON response, even if something blows up above/below.
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limit: fail-open if the backing store is unavailable, so a bad
    // rate-limit config never turns into a 500 HTML page for the client.
    let rate = { allowed: true };
    try {
      const rateResult = enforceRateLimit(req, res, {
        keyPrefix: 'sponsor-submit',
        maxRequests: 6,
        windowMs: 60_000,
      });
      if (rateResult && typeof rateResult === 'object') rate = rateResult;
    } catch (rateError) {
      console.error('Rate limit check failed:', rateError);
    }

    if (!rate.allowed) {
      if (!res.headersSent) {
        return res
          .status(429)
          .json({ error: 'Too many requests. Please try again shortly.' });
      }
      return undefined;
    }

    const {
      company_name,
      category,
      description,
      phone,
      email,
      website,
      image_url,
      image_urls,
      is_featured,
      plan_id,
      duration_months,
      title,
      contact_name,
    } = req.body || {};

    if (!company_name || !description || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (
      String(company_name).length > 150 ||
      String(description).length > 5000 ||
      String(phone).length > 40 ||
      (email && String(email).length > 254) ||
      (website && String(website).length > 500) ||
      (image_url && String(image_url).length > 2000)
    ) {
      return res.status(400).json({ error: 'One or more fields exceed allowed length' });
    }

    const normalizedImageUrls = Array.isArray(image_urls)
      ? image_urls
          .map((url) => String(url || '').trim())
          .filter(Boolean)
          .slice(0, 3)
      : [];

    if (normalizedImageUrls.some((url) => url.length > 2000)) {
      return res
        .status(400)
        .json({ error: 'One or more image URLs exceed allowed length' });
    }

    const primaryImageUrl = normalizedImageUrls[0] || image_url || null;

    // requireDbUser may write its own response and return null.
    let resolved;
    try {
      resolved = await requireDbUser(req, res);
    } catch (authError) {
      console.error('requireDbUser threw:', authError);
      if (!res.headersSent) {
        return res
          .status(500)
          .json({ error: 'Failed to authenticate request.' });
      }
      return undefined;
    }
    if (!resolved) return undefined;

    const db = getDbClient();

    if (!isAdvertiserAccount(resolved.user)) {
      return res
        .status(403)
        .json({ error: 'Select the Advertiser account type before submitting an ad.' });
    }

    const accountVerified =
      resolved.user.identity_verified === true ||
      resolved.user.id_verification_status === 'approved';

    if (!accountVerified) {
      return res.status(403).json({
        error: 'A verified Dosnine account is required to submit an advertisement.',
      });
    }

    const defaultPlan = AD_PLANS[plan_id];
    if (!defaultPlan) {
      return res.status(400).json({ error: 'Select a valid advertisement plan.' });
    }

    const durationMonths = plan_id === 'pro' ? Number(duration_months) : null;
    if (
      plan_id === 'pro' &&
      (!Number.isSafeInteger(durationMonths) || durationMonths < 1)
    ) {
      return res
        .status(400)
        .json({ error: 'Pro campaigns must run for at least one whole month.' });
    }

    let configuredPrice;
    try {
      const { data: pricing, error: pricingError } = await db
        .from('site_settings')
        .select('value')
        .eq('key', 'ad_plan_prices')
        .maybeSingle();
      if (pricingError) throw pricingError;
      configuredPrice = Number(pricing?.value?.[defaultPlan.id]);
    } catch (pricingError) {
      console.error('Failed to load ad plan pricing:', pricingError);
      configuredPrice = NaN;
    }

    const monthlyPrice =
      Number.isInteger(configuredPrice) &&
      configuredPrice > 0 &&
      configuredPrice <= 10000000
        ? configuredPrice
        : defaultPlan.amount;

    const amount = plan_id === 'pro' ? monthlyPrice * durationMonths : monthlyPrice;
    const durationDays =
      plan_id === 'pro' ? durationMonths * 30 : defaultPlan.durationDays;

    if (
      !Number.isSafeInteger(amount) ||
      amount > MAX_DATABASE_INTEGER ||
      !Number.isSafeInteger(durationDays) ||
      durationDays > MAX_DATABASE_INTEGER
    ) {
      return res.status(400).json({
        error: 'The selected campaign duration exceeds the supported limit.',
      });
    }

    const placements = plan_id === 'pro' ? PRO_PLACEMENTS : STANDARD_PLACEMENTS;
    const selectedPlan = {
      ...defaultPlan,
      amount,
      durationDays,
      durationMonths,
      placements,
    };
    const submittedAt = new Date().toISOString();
    const createdByClerkId = resolved.clerkId;
    const normalizedEmail =
      String(email || resolved.user.email || '').trim() ||
      'no-email@dosnine.local';
    const normalizedCategory = normalizeCategory(category);

    const payload = {
      company_name,
      category: normalizedCategory,
      description,
      phone,
      email: normalizedEmail,
      website: website || null,
      image_url: primaryImageUrl,
      image_urls: normalizedImageUrls,
      is_featured: Boolean(is_featured),
      status: 'pending_payment',
      submitted_at: submittedAt,
      plan_id: selectedPlan.id,
      plan_name: selectedPlan.name,
      amount: selectedPlan.amount,
      duration_days: selectedPlan.durationDays,
      duration_months: selectedPlan.durationMonths,
      placement_types: selectedPlan.placements,
      title: title || company_name,
      contact_name: contact_name || null,
      created_by_clerk_id: resolved.clerkId,
    };

    const { data: submission, error } = await db
      .from('sponsor_submissions')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message || 'Failed to submit sponsor application',
      });
    }
    if (!submission?.id) {
      return res
        .status(500)
        .json({ error: 'Sponsor submission was saved without a returned ID.' });
    }

    const adDraft = {
      title: title || company_name,
      category: normalizedCategory,
      company_name,
      description,
      contact_name: contact_name || null,
      email: normalizedEmail,
      phone,
      website: website || null,
      image_url: primaryImageUrl,
      image_urls: normalizedImageUrls,
      is_active: false,
      display_order: 0,
      created_by_clerk_id: createdByClerkId,
      advertiser_id: resolved.user.id,
      expires_at: null,
      is_featured: Boolean(is_featured),
      plan_id: selectedPlan.id,
      plan_name: selectedPlan.name,
      duration_months: selectedPlan.durationMonths,
      placement_types: selectedPlan.placements,
    };

    try {
      const adInsert = await db.from('advertisements').insert([adDraft]);
      if (
        adInsert.error &&
        !String(adInsert.error?.code || '').includes('23505')
      ) {
        console.error('Failed to create advertisement draft:', adInsert.error);
      }
    } catch (draftError) {
      console.error('Failed to create advertisement draft:', draftError);
    }

    try {
      await sendAdminAdSubmissionEmail({
        company_name,
        title,
        category: normalizedCategory,
        description,
        phone,
        email,
        website,
        image_url: primaryImageUrl,
        image_urls: normalizedImageUrls,
        contact_name,
        selectedPlan,
        submittedAt,
        submissionId: submission.id,
      });
    } catch (emailError) {
      console.error(
        'Failed to send admin ad submission email:',
        emailError?.message || emailError
      );
    }

    return res.status(200).json({
      success: true,
      id: submission.id,
      plan: {
        id: selectedPlan.id,
        name: selectedPlan.name,
        amount: selectedPlan.amount,
        durationDays: selectedPlan.durationDays,
        durationMonths: selectedPlan.durationMonths,
        placements: selectedPlan.placements,
      },
    });
  } catch (error) {
    console.error('sponsor/submit handler failed:', error);
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ error: error?.message || 'Internal server error' });
    }
    return undefined;
  }
}