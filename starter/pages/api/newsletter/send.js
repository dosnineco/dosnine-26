import { z } from 'zod';
import { getDbClient, requireAdminUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { getIncompleteBuyerReadinessRecipients } from '@/lib/incompleteBuyerReadiness';
import { processNewsletterQueue } from '@/lib/newsletterQueue';

const DAILY_SEND_LIMIT = 300;
const PAGE_SIZE = 500;

const payloadSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  previewText: z.string().trim().max(300).optional(),
  htmlContent: z.string().trim().min(1).max(200_000),
  target: z.enum(['submittedVisitors', 'subscribedUsers', 'advertisements', 'both', 'buyers', 'sellers', 'renters', 'incompleteBuyerReadiness']),
  parish: z.string().trim().max(120).optional(),
});

async function loadAll(query) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

function normalizeRecipientName(name) {
  const trimmed = String(name || '').trim();
  return trimmed.toLowerCase() === 'website visitor' ? 'friend' : trimmed;
}

function extractNameParts(fullName) {
  const name = normalizeRecipientName(fullName);
  if (!name) return { firstName: '', lastName: '' };
  const parts = name.split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
}

function addRecipient(recipients, emailValue, nameValue, parish = '', extra = {}) {
  const email = String(emailValue || '').trim().toLowerCase();
  if (!email) return;
  const name = normalizeRecipientName(nameValue);
  const { firstName, lastName } = extractNameParts(name);
  recipients.push({
    email,
    name: name || undefined,
    firstName,
    lastName,
    parish: parish || '',
    ...extra,
  });
}

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const resolved = await requireAdminUser(req, res);
  if (!resolved) return;

  let payload;
  try {
    payload = payloadSchema.parse(req.body || {});
  } catch {
    return res.status(400).json({ error: 'Invalid request payload' });
  }

  if (!process.env.BREVO_API_KEY) {
    return res.status(500).json({ error: 'Brevo API key is not configured' });
  }

  const db = getDbClient();
  const recipients = [];
  let campaignId = null;

  try {
    const serviceRequestTypeFilter = payload.target === 'buyers'
      ? ['buy']
      : payload.target === 'sellers'
      ? ['sell']
      : payload.target === 'renters'
      ? ['rent']
      : null;

    if (payload.target === 'submittedVisitors' || payload.target === 'both' || serviceRequestTypeFilter) {
      let requestQuery = db
        .from('service_requests')
        .select('id, client_email, client_name, parish, request_type')
        .neq('client_email', '')
        .order('created_at', { ascending: false })
        .order('id', { ascending: true });

      if (serviceRequestTypeFilter) {
        requestQuery = requestQuery.in('request_type', serviceRequestTypeFilter);
      }

      const serviceRequests = await loadAll(requestQuery);
      serviceRequests.forEach((item) => {
        addRecipient(recipients, item.client_email, item.client_name, item.parish);
      });
    }

    if (payload.target === 'incompleteBuyerReadiness') {
      recipients.push(...await getIncompleteBuyerReadinessRecipients(db));
    }

    if (payload.target === 'subscribedUsers' || payload.target === 'both') {
      const users = await loadAll(
        db
          .from('users')
          .select('id, email, full_name, parish')
          .eq('newsletter_opted_in', true)
          .neq('email', '')
          .order('id', { ascending: true })
      );
      users.forEach((item) => {
        addRecipient(recipients, item.email, item.full_name, item.parish);
      });
    }

    if (payload.target === 'advertisements' || payload.target === 'both') {
      const ads = await loadAll(
        db
          .from('advertisements')
          .select('id, email, company_name, contact_name')
          .neq('email', '')
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
      );
      ads.forEach((item) => {
        addRecipient(recipients, item.email, item.contact_name || item.company_name);
      });
    }

    const uniqueRecipients = Array.from(
      new Map(recipients.map((recipient) => [recipient.email, recipient])).values(),
    );
    if (uniqueRecipients.length === 0) {
      return res.status(400).json({ error: 'No valid recipients found for the selected list.' });
    }

    const { data: campaign, error: campaignError } = await db
      .from('newsletter_campaigns')
      .insert([{
        subject: payload.subject,
        preview_text: payload.previewText || '',
        html_content: payload.htmlContent,
        target: payload.target,
        created_by: resolved.user.id,
      }])
      .select('id')
      .single();
    if (campaignError) throw campaignError;
    campaignId = campaign.id;

    try {
      for (let offset = 0; offset < uniqueRecipients.length; offset += PAGE_SIZE) {
        const batch = uniqueRecipients.slice(offset, offset + PAGE_SIZE).map((recipient) => ({
          campaign_id: campaign.id,
          email: recipient.email,
          recipient_data: recipient,
        }));
        const { error } = await db.from('newsletter_campaign_recipients').insert(batch);
        if (error) throw error;
      }
    } catch (error) {
      const { error: cleanupError } = await db
        .from('newsletter_campaigns')
        .delete()
        .eq('id', campaign.id);
      if (cleanupError) {
        console.error('Failed to clean up incomplete newsletter campaign:', cleanupError);
      } else {
        campaignId = null;
      }
      throw error;
    }

    await processNewsletterQueue(db);
    const [sentResult, failedResult, queuedResult] = await Promise.all([
      db
        .from('newsletter_campaign_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('status', 'sent'),
      db
        .from('newsletter_campaign_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('status', 'failed'),
      db
        .from('newsletter_campaign_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .in('status', ['pending', 'processing']),
    ]);
    const countError = sentResult.error || failedResult.error || queuedResult.error;
    if (countError) throw countError;

    const sentCount = sentResult.count || 0;
    const failedCount = failedResult.count || 0;
    const queuedCount = queuedResult.count || 0;
    return res.status(200).json({
      success: true,
      campaignId: campaign.id,
      sentCount,
      failedCount,
      recipientCount: uniqueRecipients.length,
      queuedCount,
      dailyLimit: DAILY_SEND_LIMIT,
      resumesTomorrow: queuedCount > 0,
    });
  } catch (error) {
    console.error('Newsletter send error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to send newsletter',
      campaignId,
      campaignQueued: Boolean(campaignId),
    });
  }
}
