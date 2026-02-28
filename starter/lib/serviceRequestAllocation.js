import { getDbClient } from '@/lib/apiAuth';

export async function assignRequestRoundRobin(requestId) {
  const db = getDbClient();

  const { data: request, error: requestError } = await db
    .from('service_requests')
    .select('id, assigned_agent_id, status')
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
    .update({
      last_request_assigned_at: nowIso,
    })
    .eq('id', selectedAgent.id);

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

  return {
    success: true,
    assigned: true,
    message: 'Request assigned successfully',
    agentId: selectedAgent.id,
  };
}