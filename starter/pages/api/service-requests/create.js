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

const SERVICE_FEE_USD = 4;
const SERVICE_FEE_LINK = 'https://www.paypal.com/ncp/payment/6FWCSVTZDVG6Q';

const formatMoneyJmd = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 'Not provided';
  return `J$${numeric.toLocaleString()}`;
};

const titleCase = (value) => {
  const text = String(value || '').trim();
  if (!text) return 'Not provided';
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const shouldSendServiceFeeEmail = (requestType) => {
  const normalized = String(requestType || '').toLowerCase();
  return normalized === 'rent' || normalized === 'buy';
};

const sendServiceFeeConfirmationEmail = async ({
  clientName,
  clientEmail,
  clientPhone,
  requestType,
  propertyType,
  parish,
  location,
  budgetMin,
  budgetMax,
  bedrooms,
  bathrooms,
  urgency,
  description,
}) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('BREVO_API_KEY not configured; skipping service fee confirmation email');
    return;
  }

  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, apiKey);

  const requestTypeLabel = titleCase(requestType);
  const propertyTypeLabel = titleCase(propertyType);
  const urgencyLabel = titleCase(urgency || 'normal');
  const safeDescription = description || 'None provided';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin: 0 0 12px;">Your Dosnine Service Request Was Received</h2>
      <p>Hi ${clientName},</p>
      <p>
        Thanks for submitting your ${requestTypeLabel.toLowerCase()} request on Dosnine.
        Please complete the <strong>service fee payment of $${SERVICE_FEE_USD}.00 USD</strong> to activate processing.
      </p>
      <p>
        <a href="${SERVICE_FEE_LINK}" style="display: inline-block; background: #0070ba; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-weight: 600;">
          Pay Service Fee
        </a>
      </p>
      <p>If the button does not open, use this link:</p>
      <p><a href="${SERVICE_FEE_LINK}">${SERVICE_FEE_LINK}</a></p>

      <h3 style="margin-top: 24px;">Submitted Request Details</h3>
      <ul style="padding-left: 18px; margin: 8px 0;">
        <li><strong>Name:</strong> ${clientName}</li>
        <li><strong>Email:</strong> ${clientEmail}</li>
        <li><strong>Phone:</strong> ${clientPhone}</li>
        <li><strong>Request Type:</strong> ${requestTypeLabel}</li>
        <li><strong>Property Type:</strong> ${propertyTypeLabel}</li>
        <li><strong>Parish:</strong> ${parish || 'Not provided'}</li>
        <li><strong>Location:</strong> ${location}</li>
        <li><strong>Budget Min:</strong> ${formatMoneyJmd(budgetMin)}</li>
        <li><strong>Budget Max:</strong> ${formatMoneyJmd(budgetMax)}</li>
        <li><strong>Bedrooms:</strong> ${bedrooms || 'Not provided'}</li>
        <li><strong>Bathrooms:</strong> ${bathrooms || 'Not provided'}</li>
        <li><strong>Urgency:</strong> ${urgencyLabel}</li>
        <li><strong>Description:</strong> ${safeDescription}</li>
      </ul>

      <p style="margin-top: 20px;">After payment, our team will proceed with your request and follow up.</p>
      <p>Dosnine Team</p>
    </div>
  `;

  const textContent = [
    'Your Dosnine service request was received.',
    '',
    `Hi ${clientName},`,
    '',
    `Thanks for submitting your ${requestTypeLabel.toLowerCase()} request on Dosnine.`,
    `Please complete the service fee payment of $${SERVICE_FEE_USD}.00 USD to activate processing:`,
    SERVICE_FEE_LINK,
    '',
    'Submitted request details:',
    `- Name: ${clientName}`,
    `- Email: ${clientEmail}`,
    `- Phone: ${clientPhone}`,
    `- Request Type: ${requestTypeLabel}`,
    `- Property Type: ${propertyTypeLabel}`,
    `- Parish: ${parish || 'Not provided'}`,
    `- Location: ${location}`,
    `- Budget Min: ${formatMoneyJmd(budgetMin)}`,
    `- Budget Max: ${formatMoneyJmd(budgetMax)}`,
    `- Bedrooms: ${bedrooms || 'Not provided'}`,
    `- Bathrooms: ${bathrooms || 'Not provided'}`,
    `- Urgency: ${urgencyLabel}`,
    `- Description: ${safeDescription}`,
    '',
    'After payment, our team will proceed with your request and follow up.',
    'Dosnine Team',
  ].join('\n');

  const emailPayload = new SibApiV3Sdk.SendSmtpEmail();
  emailPayload.subject = `Dosnine ${requestTypeLabel} Request Confirmation - Pay Service Fee`;
  emailPayload.htmlContent = htmlContent;
  emailPayload.textContent = textContent;
  emailPayload.sender = {
    name: 'Dosnine',
    email: 'dosnineco@gmail.com',
  };
  emailPayload.to = [{ email: clientEmail, name: clientName }];

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

  const schema = z.object({
    clientName: z.string().trim().min(1).max(120).optional(),
    client_name: z.string().trim().min(1).max(120).optional(),
    clientEmail: z.string().trim().email().max(254).optional(),
    client_email: z.string().trim().email().max(254).optional(),
    clientPhone: z.string().trim().min(7).max(40).optional(),
    client_phone: z.string().trim().min(7).max(40).optional(),
    requestType: z.string().trim().min(1).max(100).optional(),
    request_type: z.string().trim().min(1).max(100).optional(),
    propertyType: z.string().trim().min(1).max(100).optional(),
    property_type: z.string().trim().min(1).max(100).optional(),
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
    propertyOwnerId: z.string().uuid().nullable().optional(),
    property_owner_id: z.string().uuid().nullable().optional(),
    website: z.string().optional(),
    company: z.string().optional(),
    url: z.string().optional(),
  });

  let parsed;
  try {
    parsed = schema.parse(req.body || {});
  } catch {
    return res.status(400).json({ error: 'Invalid request payload' });
  }

  if (isBotLikely(parsed)) {
    return res.status(200).json({ success: true, message: 'Service request submitted successfully' });
  }

  const parsedClientName = sanitizeString(parsed.clientName || parsed.client_name, 120);
  const parsedClientEmail = sanitizeEmail(parsed.clientEmail || parsed.client_email);
  const parsedClientPhone = sanitizePhoneInput(parsed.clientPhone || parsed.client_phone);
  const parsedRequestType = sanitizeString(parsed.requestType || parsed.request_type, 100);
  const parsedPropertyType = sanitizeString(parsed.propertyType || parsed.property_type, 100);
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
    const sessionClerkId = getClerkUserId(req);
    if (sessionClerkId) {
      const { user } = await getDbUserByClerkId(sessionClerkId, { createIfMissing: true });
      clientUserId = user?.id || null;
    }

    let assignedAgentId = null;
    if (parsedPropertyOwnerId) {
      const { data: ownerAgent } = await db
        .from('agents')
        .select('id')
        .eq('user_id', parsedPropertyOwnerId)
        .single();

      assignedAgentId = ownerAgent?.id || null;
    }

    // Create service request
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
        description: parsedDescription,
        urgency: parsedUrgency,
        status: assignedAgentId ? 'assigned' : 'open',
        assigned_agent_id: assignedAgentId,
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

    // Automatically assign to a paid agent using fair distribution
    // Skip auto-assignment for leads from ads pages
    if (!parsedFromAds && !assignedAgentId && data?.id) {
      try {
        await assignRequestRoundRobin(data.id);
      } catch {
      }
    }

    if (shouldSendServiceFeeEmail(parsedRequestType)) {
      try {
        await sendServiceFeeConfirmationEmail({
          clientName: parsedClientName,
          clientEmail: parsedClientEmail,
          clientPhone: parsedClientPhone,
          requestType: parsedRequestType,
          propertyType: parsedPropertyType,
          parish: parsedParish,
          location: parsedLocation,
          budgetMin: parsedBudgetMin,
          budgetMax: parsedBudgetMax,
          bedrooms: parsedBedrooms,
          bathrooms: parsedBathrooms,
          urgency: parsedUrgency,
          description: parsedDescription,
        });
      } catch (emailError) {
        console.error('Failed to send service fee confirmation email:', emailError);
      }
    }

    return res.status(200).json({ 
      success: true,
      request: data,
      message: 'Service request submitted successfully'
    });

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
