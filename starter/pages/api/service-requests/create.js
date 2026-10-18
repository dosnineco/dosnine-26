import { getClerkUserId, getDbClient, getDbUserByClerkId } from '@/lib/apiAuth';
import { enforceRateLimitDistributed } from '@/lib/rateLimit';
import { z } from 'zod';
import {
  enforceMethods,
  isBotLikely,
  sanitizeEmail,
  sanitizeInt,
  sanitizeLocation,
  sanitizeMoney,
  sanitizePhoneInput,
  sanitizeString,
} from '@/lib/apiSecurity';
import { assignRequestRoundRobin } from '@/lib/serviceRequestAllocation';
import * as SibApiV3Sdk from '@getbrevo/brevo';

const titleCase = (value) => {
  const text = String(value || '').trim();
  if (!text) return 'Not provided';
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[char]);

const sendDashboardInvitationEmail = async ({ clientName, clientEmail, requestType }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY not configured');

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dosnine.com').replace(/\/+$/, '');
  const isBuyRequest = String(requestType || '').toLowerCase() === 'buy';
  const dashboardUrl = new URL('/dashboard', `${siteUrl}/`).toString();
  const typeLabel = titleCase(requestType).toLowerCase();
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, apiKey);

  const emailPayload = new SibApiV3Sdk.SendSmtpEmail();
  emailPayload.subject = 'Track your Dosnine request with a free account';
  emailPayload.htmlContent = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h2>Your request is in. Stay up to date.</h2>
      <p>Hi ${escapeHtml(clientName || 'there')},</p>
      <p>Thanks for submitting your ${escapeHtml(typeLabel)} request to Dosnine. Visit your dashboard to follow updates to your request and keep your information in one place. Sign in if you already have an account, or create a free account to get started.</p>
      ${isBuyRequest ? `
        <h3>Complete your Buyer Financial Check</h3>
        <p>Tell us about your purchase plan and, if available, provide supporting documents for private review by Dosnine. You do not need to upload every document type. Completing your account and financial check is free.</p>
        <p><strong>Helpful documents may include:</strong> mortgage prequalification or approval, proof of savings or funds, NHT eligibility or financing, family contribution, self-employed income, or bank confirmation. PDF or image files up to 10 MB each.</p>
      ` : ''}
      <p><a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#d93636;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:600">Open your Dosnine dashboard</a></p>
      <p>Thank you,<br />Dosnine</p>
    </div>
  `;
  emailPayload.textContent = [
    'Your request is in. Stay up to date.',
    `Hi ${clientName || 'there'},`,
    `Thanks for submitting your ${typeLabel} request to Dosnine. Visit your dashboard to follow updates to your request and keep your information in one place. Sign in if you already have an account, or create a free account to get started.`,
    ...(isBuyRequest ? [
      'Complete your Buyer Financial Check: share your purchase plan and, if available, supporting documents for private review by Dosnine. You do not need to upload every document type. The account and financial check are free.',
      'Helpful documents may include mortgage prequalification or approval, proof of savings or funds, NHT eligibility or financing, family contribution, self-employed income, or bank confirmation. PDF or image files up to 10 MB each.',
    ] : []),
    `Open your Dosnine dashboard: ${dashboardUrl}`,
    'Thank you, Dosnine',
  ].join('\n\n');
  emailPayload.sender = {
    name: process.env.BREVO_FROM_NAME || 'Dosnine Limited ',
    email: process.env.BREVO_FROM_EMAIL || 'admin@dosnine.com',
  };
  emailPayload.to = [{ email: clientEmail, name: clientName || 'Dosnine user' }];
  await apiInstance.sendTransacEmail(emailPayload);
};

const sendPropertyOwnerNotificationEmail = async ({
  ownerEmail,
  ownerName,
  clientName,
  clientEmail,
  clientPhone,
  clientIncome,
  clientJob,
  propertyTitle,
  propertyType,
  requestType,
  location,
  description,
}) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || !ownerEmail) {
    return;
  }

  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, apiKey);

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin: 0 0 12px;">New Property Inquiry</h2>
      <p>Hi ${ownerName || 'there'},</p>
      <p>A client is interested in your property listing: <strong>${propertyTitle || 'Property Listing'}</strong>.</p>
      <ul style="padding-left: 18px; margin: 8px 0;">
        <li><strong>Customer Name:</strong> ${clientName}</li>
        <li><strong>Phone:</strong> ${clientPhone}</li>
        <li><strong>Email:</strong> ${clientEmail}</li>
        <li><strong>Monthly Income:</strong> ${clientIncome || 'Not provided'}</li>
        <li><strong>Job / Occupation:</strong> ${clientJob || 'Not provided'}</li>
        <li><strong>Request Type:</strong> ${String(requestType || '').toUpperCase()}</li>
        <li><strong>Property Type:</strong> ${propertyType || 'Not provided'}</li>
        <li><strong>Location:</strong> ${location || 'Not provided'}</li>
      </ul>
      <p><strong>Message:</strong> ${description || 'No message provided'}</p>
      <p>Please reply directly to the client using the phone number or email above.</p>
    </div>
  `;

  const emailPayload = new SibApiV3Sdk.SendSmtpEmail();
  emailPayload.subject = `New inquiry for ${propertyTitle || 'your property'}`;
  emailPayload.htmlContent = htmlContent;
  emailPayload.textContent = [
    `New property inquiry for ${propertyTitle || 'your property'}`,
    '',
    `Hi ${ownerName || 'there'},`,
    '',
    `A client is interested in your property listing.`,
    `Customer Name: ${clientName}`,
    `Phone: ${clientPhone}`,
    `Email: ${clientEmail}`,
    `Monthly Income: ${clientIncome || 'Not provided'}`,
    `Job / Occupation: ${clientJob || 'Not provided'}`,
    `Request Type: ${String(requestType || '').toUpperCase()}`,
    `Property Type: ${propertyType || 'Not provided'}`,
    `Location: ${location || 'Not provided'}`,
    `Message: ${description || 'No message provided'}`,
    '',
    'Please reply directly to the client using the phone number or email above.',
  ].join('\n');
  emailPayload.sender = {
    name: process.env.BREVO_FROM_NAME || 'Dosnine Limited ',
    email: process.env.BREVO_FROM_EMAIL || 'admin@dosnine.com',
  };
  emailPayload.to = [{ email: ownerEmail, name: ownerName || 'Property Owner' }];

  await apiInstance.sendTransacEmail(emailPayload);
};

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'service-request-create',
    maxRequests: 10,
    windowMs: 60_000,
  });

  if (!rate.allowed) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  }

  const db = getDbClient();

  const normalizeOwnerId = (value) => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (!text || text === 'null' || text === 'undefined') return null;
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(text)
      ? text
      : null;
  };

  const schema = z.object({
    clientName: z.string().trim().min(1).max(120).optional(),
    client_name: z.string().trim().min(1).max(120).optional(),
    clientEmail: z.string().trim().email().max(254).optional(),
    client_email: z.string().trim().email().max(254).optional(),
    clientPhone: z.string().trim().min(7).max(40).optional(),
    client_phone: z.string().trim().min(7).max(40).optional(),
    clientIncome: z.string().trim().max(80).nullable().optional(),
    client_income: z.string().trim().max(80).nullable().optional(),
    clientJob: z.string().trim().max(120).nullable().optional(),
    client_job: z.string().trim().max(120).nullable().optional(),
    requestType: z.string().trim().min(1).max(100).optional(),
    request_type: z.string().trim().min(1).max(100).optional(),
    propertyType: z.string().trim().min(1).max(100).optional(),
    property_type: z.string().trim().min(1).max(100).optional(),
    propertyTitle: z.string().trim().max(255).nullable().optional(),
    property_title: z.string().trim().max(255).nullable().optional(),
    location: z.string().trim().min(1).max(255).optional(),
    parish: z.string().trim().max(120).nullable().optional(),
    budgetMin: z.union([z.number(), z.string()]).nullable().optional(),
    budgetMax: z.union([z.number(), z.string()]).nullable().optional(),
    budget_min: z.union([z.number(), z.string()]).nullable().optional(),
    budget_max: z.union([z.number(), z.string()]).nullable().optional(),
    bedrooms: z.union([z.number(), z.string()]).nullable().optional(),
    bathrooms: z.union([z.number(), z.string()]).nullable().optional(),
    description: z.string().max(5000).nullable().optional(),
    urgency: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    fromAds: z.boolean().optional(),
    from_ads: z.boolean().optional(),
    propertyOwnerId: z.any().optional().transform(normalizeOwnerId),
    property_owner_id: z.any().optional().transform(normalizeOwnerId),
    website: z.string().optional(),
    company: z.string().optional(),
    url: z.string().optional(),
  });

  const validation = schema.safeParse(req.body || {});
  if (!validation.success) {
    const details = validation.error.issues.map((issue) => {
      const field = issue.path.length ? issue.path.join('.') : 'request';
      return `${field}: ${issue.message}`;
    });
    console.warn('Invalid service request payload:', details);
    return res.status(400).json({ error: 'Invalid request payload', details: details.join('; ') });
  }
  const parsed = validation.data;

  if (isBotLikely(parsed)) {
    return res.status(200).json({ success: true, message: 'Service request submitted successfully' });
  }

  const parsedClientName = sanitizeString(parsed.clientName || parsed.client_name, 120);
  const parsedClientEmail = sanitizeEmail(parsed.clientEmail || parsed.client_email);
  const parsedClientPhone = sanitizePhoneInput(parsed.clientPhone || parsed.client_phone);
  const parsedClientIncome = sanitizeString(parsed.clientIncome || parsed.client_income, 80);
  const parsedClientJob = sanitizeString(parsed.clientJob || parsed.client_job, 120);
  const parsedRequestType = sanitizeString(parsed.requestType || parsed.request_type, 100);
  const parsedPropertyType = sanitizeString(parsed.propertyType || parsed.property_type, 100);
  const parsedPropertyTitle = sanitizeString(parsed.propertyTitle || parsed.property_title, 255);
  const parsedLocation = sanitizeLocation(parsed.location);
  const parsedParish = parsed.parish ? sanitizeLocation(parsed.parish) : null;
  const parsedBudgetMin = sanitizeMoney(parsed.budgetMin ?? parsed.budget_min ?? 0);
  const parsedBudgetMax = sanitizeMoney(parsed.budgetMax ?? parsed.budget_max ?? 0);
  const parsedBedrooms = sanitizeInt(parsed.bedrooms ?? 0, 0, 99);
  const parsedBathrooms = sanitizeInt(parsed.bathrooms ?? 0, 0, 99);
  const parsedDescription = parsed.description ? sanitizeString(parsed.description, 5000) : null;
  const parsedUrgency = parsed.urgency || 'normal';
  const parsedFromAds = Boolean(parsed.fromAds ?? parsed.from_ads);
  const parsedPropertyOwnerId = parsed.propertyOwnerId || parsed.property_owner_id || null;

  if (!parsedClientName || !parsedClientEmail || !parsedClientPhone || !parsedRequestType || !parsedPropertyType || !parsedLocation) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Resolve authenticated user from session (if present); anonymous remains allowed
    let clientUserId = null;
    let submittingAgentId = null;
    const sessionClerkId = getClerkUserId(req);
    if (sessionClerkId) {
      const { user } = await getDbUserByClerkId(sessionClerkId, { createIfMissing: true });
      const isAgentAccount = user?.account_type === 'agent' ||
        (!user?.account_type && user?.user_type === 'agent');
      if (isAgentAccount) {
        const { data: agent, error: agentError } = await db
          .from('agents')
          .select('id, verification_status, payment_status, access_expiry')
          .eq('user_id', user.id)
          .maybeSingle();

        if (agentError) {
          console.error('Failed to verify agent creating service request:', agentError);
          return res.status(500).json({ error: 'Unable to verify agent access' });
        }
        if (!agent || agent.verification_status !== 'approved') {
          return res.status(403).json({ error: 'A verified agent account is required to create requests.' });
        }

        const paidPlans = ['7-day', '30-day', '90-day'];
        if (
          paidPlans.includes(agent.payment_status) &&
          agent.access_expiry &&
          new Date(agent.access_expiry) <= new Date()
        ) {
          return res.status(403).json({ error: 'Your agent access has expired. Please renew to continue.' });
        }
        submittingAgentId = agent.id;
      }
      if (sanitizeEmail(user?.email) === parsedClientEmail) {
        clientUserId = user.id;
      } else if (user?.id) {
        console.warn('Service request email differs from signed-in account; leaving request claimable by email');
      }
    }

    let assignedAgentId = submittingAgentId;
    if (!assignedAgentId && parsedPropertyOwnerId) {
      const { data: ownerAgent } = await db
        .from('agents')
        .select('id')
        .eq('user_id', parsedPropertyOwnerId)
        .single();

      assignedAgentId = ownerAgent?.id || null;
    }

    // Create service request
    const enrichedDescription = [
      parsedDescription || `Interested in: ${parsedPropertyTitle || 'this property'}`,
      parsedClientIncome ? `Income: ${parsedClientIncome}` : null,
      parsedClientJob ? `Job: ${parsedClientJob}` : null,
    ].filter(Boolean).join('\n');

    const { data, error } = await db
      .from('service_requests')
      .insert([{
        client_user_id: clientUserId,
        client_name: parsedClientName,
        client_email: parsedClientEmail,
        client_phone: parsedClientPhone,
        request_type: parsedRequestType,
        property_type: parsedPropertyType,
        parish: parsedParish,
        location: parsedLocation,
        budget_min: parsedBudgetMin,
        budget_max: parsedBudgetMax,
        bedrooms: parsedBedrooms,
        bathrooms: parsedBathrooms,
        description: enrichedDescription,
        urgency: parsedUrgency,
        status: assignedAgentId ? 'assigned' : 'open',
        assigned_agent_id: assignedAgentId,
        ...(submittingAgentId ? { assigned_at: new Date().toISOString() } : {}),
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create service request' });
    }

    if (assignedAgentId && data?.id) {
      await db
        .from('agent_notifications')
        .insert([{
          agent_id: assignedAgentId,
          notification_type: 'new_request',
          message: `New Property Inquiry: ${parsedClientName}`,
          service_request_id: data.id,
          is_read: false,
        }]);
    }

    // If this request is tied to a specific property owner, send the lead to the owner directly.
    // Do not round-robin it to another agent.
    if (parsedPropertyOwnerId) {
      const { data: ownerRecord, error: ownerError } = await db
        .from('users')
        .select('id, email, full_name')
        .eq('id', parsedPropertyOwnerId)
        .maybeSingle();

      if (!ownerError && ownerRecord?.email) {
        try {
          await sendPropertyOwnerNotificationEmail({
            ownerEmail: ownerRecord.email,
            ownerName: ownerRecord.full_name || 'Property Owner',
            clientName: parsedClientName,
            clientEmail: parsedClientEmail,
            clientPhone: parsedClientPhone,
            clientIncome: parsedClientIncome,
            clientJob: parsedClientJob,
            propertyTitle: parsedPropertyTitle || parsedLocation,
            propertyType: parsedPropertyType,
            requestType: parsedRequestType,
            location: parsedLocation,
            description: enrichedDescription,
          });
        } catch (emailError) {
          console.error('Failed to email property owner:', emailError);
        }
      }
    }

    // Automatically assign to a paid agent using fair distribution
    // Skip auto-assignment for leads from ads pages or explicit property-owner inquiries
    if (!parsedFromAds && !assignedAgentId && !parsedPropertyOwnerId && data?.id) {
      try {
        await assignRequestRoundRobin(data.id);
      } catch {
      }
    }

    let dashboardInvitationEmailSent = false;
    try {
      await sendDashboardInvitationEmail({
        clientName: parsedClientName,
        clientEmail: parsedClientEmail,
        requestType: parsedRequestType,
      });
      dashboardInvitationEmailSent = true;
    } catch (emailError) {
      console.error('Failed to send free dashboard invitation email:', emailError);
    }

    return res.status(200).json({ 
      success: true,
      request: data,
      dashboardInvitationEmailSent,
      message: 'Service request submitted successfully'
    });

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
