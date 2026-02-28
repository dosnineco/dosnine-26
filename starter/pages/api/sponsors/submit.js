import { getDbClient } from '@/lib/apiAuth';
import { enforceRateLimit } from '@/lib/rateLimit';
import { getClerkUserContext } from '@/lib/apiAuth';
import * as SibApiV3Sdk from '@getbrevo/brevo';

const AD_PLANS = {
  '7-day': { id: '7-day', name: '7-Day Ad', amount: 5000, durationDays: 7 },
  '30-day': { id: '30-day', name: '30-Day Ad', amount: 20000, durationDays: 30 },
};

async function sendAdminAdSubmissionEmail({
  company_name,
  title,
  category,
  description,
  phone,
  email,
  website,
  image_url,
  contact_name,
  selectedPlan,
  submittedAt,
  syntheticId,
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'dosnineco@gmail.com';
  const senderEmail = process.env.BREVO_FROM_EMAIL || 'dosnineco@gmail.com';
  const senderName = process.env.BREVO_FROM_NAME || 'Dosnine';

  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, apiKey);

  const htmlContent = `
    <h2>New Ad Submission Received</h2>
    <p><strong>Submission ID:</strong> ${syntheticId}</p>
    <p><strong>Submitted At:</strong> ${submittedAt}</p>
    <hr />
    <p><strong>Business Name:</strong> ${company_name || ''}</p>
    <p><strong>Ad Title:</strong> ${title || ''}</p>
    <p><strong>Contact Name:</strong> ${contact_name || ''}</p>
    <p><strong>Category:</strong> ${category || ''}</p>
    <p><strong>Phone:</strong> ${phone || ''}</p>
    <p><strong>Email:</strong> ${email || ''}</p>
    <p><strong>Website:</strong> ${website || ''}</p>
    <p><strong>Image URL:</strong> ${image_url || ''}</p>
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

  try {
    const db = getDbClient();
    const clerkContext = getClerkUserContext(req);
    const selectedPlan = AD_PLANS[plan_id] || AD_PLANS['7-day'];
    const submittedAt = new Date().toISOString();
    const createdByClerkId = clerkContext?.clerkId || 'public_submission';

    const payload = {
      company_name,
      category: category || 'contractor',
      description,
      phone,
      email: email || null,
      website: website || null,
      image_url: image_url || null,
      is_featured: Boolean(is_featured),
      status: 'pending_payment',
      submitted_at: submittedAt,
      plan_id: selectedPlan.id,
      plan_name: selectedPlan.name,
      amount: selectedPlan.amount,
      duration_days: selectedPlan.durationDays,
      created_by_clerk_id: clerkContext?.clerkId || null,
    };

    const syntheticId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

    let { error } = await db
      .from('sponsor_submissions')
      .insert([payload]);

    if (error && String(error?.message || '').toLowerCase().includes('column')) {
      const fallbackPayload = {
        company_name,
        category: category || 'contractor',
        description,
        phone,
        email: email || null,
        website: website || null,
        image_url: image_url || null,
        is_featured: Boolean(is_featured),
        status: 'pending_payment',
        submitted_at: submittedAt,
      };

      const retry = await db.from('sponsor_submissions').insert([fallbackPayload]);
      error = retry.error;
    }

    if (error) {
      return res.status(500).json({ error: 'Failed to submit sponsor application' });
    }

    const adDraft = {
      title: title || company_name,
      category: category || 'contractor',
      company_name,
      description,
      contact_name: contact_name || null,
      email: email || null,
      phone,
      website: website || null,
      image_url: image_url || null,
      is_active: false,
      display_order: 0,
      created_by_clerk_id: createdByClerkId,
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
        category,
        description,
        phone,
        email,
        website,
        image_url,
        contact_name,
        selectedPlan,
        submittedAt,
        syntheticId,
      });
    } catch (emailError) {
      console.error('Failed to send admin ad submission email:', emailError?.message || emailError);
    }

    return res.status(200).json({
      success: true,
      id: syntheticId,
      plan: {
        id: selectedPlan.id,
        name: selectedPlan.name,
        amount: selectedPlan.amount,
        durationDays: selectedPlan.durationDays,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
