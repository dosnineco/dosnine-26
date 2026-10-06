import { enforceRateLimit } from '@/lib/rateLimit';
import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import * as SibApiV3Sdk from '@getbrevo/brevo';

const AD_PLANS = {
  '3-day': { id: '3-day', name: '3-Day Ad', amount: 5249, durationDays: 3 },
  '7-day': { id: '7-day', name: '7-Day Ad', amount: 11999, durationDays: 7 },
  '14-day': { id: '14-day', name: '14-Day Ad', amount: 17999, durationDays: 14 },
  '30-day': { id: '30-day', name: '30-Day Ad', amount: 52499, durationDays: 30 },
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

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'admin@dosnine.com';
  const senderEmail = process.env.BREVO_FROM_EMAIL || 'admin@dosnine.com';
  const senderName = process.env.BREVO_FROM_NAME || 'Dosnine';

  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, apiKey);

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
      ${(Array.isArray(image_urls) ? image_urls : []).map((url) => `<li>${url}</li>`).join('')}
    </ul>
    <p><strong>Plan:</strong> ${selectedPlan?.name || ''} (${selectedPlan?.durationDays || 0} days)</p>
    <p><strong>Amount:</strong> JMD $${Number(selectedPlan?.amount || 0).toLocaleString()}</p>
    <hr />
    <p><strong>Description:</strong></p>
    <p>${String(description || '').replace(/\n/g, '<br/>')}</p>
  `;

  const emailPayload = new SibApiV3Sdk.SendSmtpEmail();
  emailPayload.sender = { name: senderName, email: senderEmail };
  emailPayload.to = [{ email: adminEmail, name: 'Dosnine Admin' }];
  emailPayload.subject = `New Ad Submission: ${company_name || 'Unknown Business'}`;
  emailPayload.htmlContent = htmlContent;

  await apiInstance.sendTransacEmail(emailPayload);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rate = enforceRateLimit(req, res, {
    keyPrefix: 'sponsor-submit',
    maxRequests: 6,
    windowMs: 60_000,
  });

  if (!rate.allowed) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
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
    return res.status(400).json({ error: 'One or more image URLs exceed allowed length' });
  }

  const primaryImageUrl = normalizedImageUrls[0] || image_url || null;

  try {
    const resolved = await requireDbUser(req, res);
    if (!resolved) return;
    const db = getDbClient();

    if (resolved.user.account_type !== 'advertiser') {
      return res.status(403).json({ error: 'Select the Advertiser account type before submitting an ad.' });
    }

    const accountVerified =
      resolved.user.identity_verified === true ||
      resolved.user.id_verification_status === 'approved';

    if (!accountVerified) {
      return res.status(403).json({ error: 'A verified Dosnine account is required to submit an advertisement.' });
    }

    const defaultPlan = AD_PLANS[plan_id] || AD_PLANS['7-day'];
    const { data: pricing, error: pricingError } = await db
      .from('site_settings')
      .select('value')
      .eq('key', 'ad_plan_prices')
      .maybeSingle();
    if (pricingError) throw pricingError;
    const configuredPrice = Number(pricing?.value?.[defaultPlan.id]);
    const selectedPlan = {
      ...defaultPlan,
      amount: Number.isInteger(configuredPrice) && configuredPrice > 0
        ? configuredPrice
        : defaultPlan.amount,
    };
    const submittedAt = new Date().toISOString();
    const createdByClerkId = resolved.clerkId;
    const normalizedEmail = String(email || resolved.user.email || '').trim() || 'no-email@dosnine.local';
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
      return res.status(500).json({ error: 'Sponsor submission was saved without a returned ID.' });
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
    };

    const adInsert = await db.from('advertisements').insert([adDraft]);

    if (adInsert.error && !String(adInsert.error?.code || '').includes('23505')) {
      console.error('Failed to create advertisement draft:', adInsert.error);
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
      console.error('Failed to send admin ad submission email:', emailError?.message || emailError);
    }

    return res.status(200).json({
      success: true,
      id: submission.id,
      plan: {
        id: selectedPlan.id,
        name: selectedPlan.name,
        amount: selectedPlan.amount,
        durationDays: selectedPlan.durationDays,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
