import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { leadId, agentUserId } = req.body

    if (!leadId || !agentUserId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Get agent ID from user ID
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, has_paid')
      .eq('user_id', agentUserId)
      .single()

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    // Check if agent has paid subscription
    if (!agent.has_paid) {
      return res.status(403).json({ error: 'Payment required' })
    }

    // Get the lead
    const { data: lead, error: leadError } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead not found' })
    }

    // Check if already sold
    if (lead.is_sold) {
      return res.status(400).json({ error: 'Lead already purchased' })
    }

    // Mark as sold
    const { error: updateError } = await supabase
      .from('service_requests')
      .update({
        is_sold: true,
        sold_to_agent_id: agent.id,
        sold_at: new Date().toISOString(),
        assigned_agent_id: agent.id,
        assigned_at: new Date().toISOString(),
        status: 'assigned'
      })
      .eq('id', leadId)

    if (updateError) {
      throw updateError
    }

    // Create notification for the client
    await supabase
      .from('agent_notifications')
      .insert({
        agent_id: agent.id,
        type: 'lead_purchased',
        title: 'New Lead Purchased',
        message: `You purchased a verified lead: ${lead.client_name} looking for ${lead.property_type} in ${lead.location}`,
        data: { lead_id: leadId }
      })

    res.status(200).json({ 
      success: true, 
      message: 'Lead purchased successfully',
      lead: {
        ...lead,
        is_sold: true,
        sold_to_agent_id: agent.id
      }
    })

  } catch (error) {
    console.error('Lead purchase error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
