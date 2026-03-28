import { getDbClient } from '@/lib/apiAuth';
import * as SibApiV3Sdk from '@getbrevo/brevo';

const sendBrevoEmail = async ({ to, subject, htmlContent, textContent }) => {
  if (!to) return;
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY not configured');
  }

  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, apiKey);

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.sender = {
    name: 'Dosnine',
    email: 'dosnineco@gmail.com',
  };
  sendSmtpEmail.to = [{ email: to }];
  if (textContent) {
    sendSmtpEmail.textContent = textContent;
  }

  await apiInstance.sendTransacEmail(sendSmtpEmail);
};

export async function assignRequestRoundRobin(requestId) {
  const db = getDbClient();

  const { data: request, error: requestError } = await db
    .from('service_requests')
    .select('id, client_name, client_email, client_phone, request_type, property_type, location, budget_min, budget_max, assigned_agent_id, status')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    return { success: false, assigned: false, message: 'Request not found' };
  }

  if (request.assigned_agent_id) {
    return {
      success: false,
      assigned: true,
      message: 'Request already assigned',
      agentId: request.assigned_agent_id,
    };
  }

  const { data: paidAgents, error: agentsError } = await db
    .from('agents')
    .select('id, user_id, last_request_assigned_at')
    .eq('verification_status', 'approved')
    .eq('payment_status', 'paid')
    .order('last_request_assigned_at', { ascending: true, nullsFirst: true });

  if (agentsError || !paidAgents || paidAgents.length === 0) {
    return {
      success: false,
      assigned: false,
      message: 'No paid agents available',
    };
  }

  const selectedAgent = paidAgents[0];
  const nowIso = new Date().toISOString();

  const { data: updatedRows, error: assignError } = await db
    .from('service_requests')
    .update({
      assigned_agent_id: selectedAgent.id,
      status: 'assigned',
      assigned_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', requestId)
    .is('assigned_agent_id', null)
    .select('id, assigned_agent_id')
    .limit(1);

  if (assignError) {
    return { success: false, assigned: false, message: 'Failed to assign request' };
  }

  if (!updatedRows || updatedRows.length === 0) {
    return {
      success: false,
      assigned: true,
      message: 'Request already assigned',
    };
  }

  await db
    .from('agents')
    .update({ last_request_assigned_at: nowIso })
    .eq('id', selectedAgent.id);

  const { data: agentUser } = await db
    .from('users')
    .select('full_name, email')
    .eq('id', selectedAgent.user_id)
    .single();

  await db
    .from('notifications')
    .insert({
      user_id: selectedAgent.user_id,
      notification_type: 'email',
      subject: 'New Client Request Assigned',
      message: 'You have received a new client request. Check your agent dashboard to view details.',
      related_entity_type: 'service_request',
      related_entity_id: requestId,
      status: 'pending',
    });

  // Email agent and client (non-blocking failures)
  const agentEmailPromise = (async () => {
    if (!agentUser?.email) return;

    const agentHtml = `
      <p>Hi ${agentUser.full_name || 'Agent'},</p>
      <p>A new lead has been assigned to you:</p>
      <ul>
        <li><strong>Client:</strong> ${request.client_name} (${request.client_email})</li>
        <li><strong>Phone:</strong> ${request.client_phone || 'N/A'}</li>
        <li><strong>Type:</strong> ${request.request_type}</li>
        <li><strong>Property:</strong> ${request.property_type}</li>
        <li><strong>Location:</strong> ${request.location}</li>
        <li><strong>Budget:</strong> JMD ${request.budget_min || 'N/A'} - ${request.budget_max || 'N/A'}</li>
      </ul>
      <p>Please contact the client as soon as possible.</p>
    `;

    await sendBrevoEmail({
      to: agentUser.email,
      subject: 'New service request assigned to you',
      htmlContent: agentHtml,
      textContent: `Hi ${agentUser.full_name || 'Agent'},\n\nA new lead has been assigned to you:\n- Client: ${request.client_name} (${request.client_email})\n- Phone: ${request.client_phone || 'N/A'}\n- Type: ${request.request_type}\n- Property: ${request.property_type}\n- Location: ${request.location}\n- Budget: JMD ${request.budget_min || 'N/A'} - ${request.budget_max || 'N/A'}\n\nPlease contact the client as soon as possible.`,
    });
  })();

  const clientEmailPromise = (async () => {
    if (!request.client_email) return;

    const clientHtml = `
      <p>Hi ${request.client_name},</p>
      <p>Your request has been matched with an agent:</p>
      <ul>
        <li><strong>Agent:</strong> ${agentUser?.full_name || 'Assigned Agent'}</li>
        <li><strong>Agent Email:</strong> ${agentUser?.email || 'N/A'}</li>
      </ul>
      <p>They will contact you soon. If you have questions, reply to this email.</p>
    `;

    await sendBrevoEmail({
      to: request.client_email,
      subject: 'Your request has been assigned to an agent',
      htmlContent: clientHtml,
      textContent: `Hi ${request.client_name},\n\nYour request has been matched with an agent: ${agentUser?.full_name || 'Assigned Agent'} (${agentUser?.email || 'N/A'}).\nThey will contact you soon.`,
    });
  })();

  Promise.allSettled([agentEmailPromise, clientEmailPromise]).catch((err) => {
    console.warn('Email promises failed:', err);
  });

  return {
    success: true,
    assigned: true,
    message: 'Request assigned successfully',
    agentId: selectedAgent.id,
  };
}
