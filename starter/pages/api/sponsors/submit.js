import { getDbClient } from '@/lib/apiAuth';
import { enforceRateLimit } from '@/lib/rateLimit';
import { getClerkUserContext } from '@/lib/apiAuth';

const AD_PLANS = {
  '7-day': { id: '7-day', name: '7-Day Ad', amount: 5000, durationDays: 7 },
  '30-day': { id: '30-day', name: '30-Day Ad', amount: 20000, durationDays: 30 },
};

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
