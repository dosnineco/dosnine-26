import { getDbClient, requireDbUser } from '../../../lib/apiAuth'
import { z } from 'zod'
import { enforceMethods } from '@/lib/apiSecurity'
import { enforceRateLimitDistributed } from '@/lib/rateLimit'

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return

  try {
    const resolved = await requireDbUser(req, res)
    if (!resolved) return

    const rate = await enforceRateLimitDistributed(req, res, {
      keyPrefix: 'leads-purchase',
      maxRequests: 20,
      windowMs: 60_000,
      identifier: String(resolved.user.id),
    })

    if (!rate.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' })
    }

    const db = getDbClient()
    const { leadId } = z
      .object({
        leadId: z.string().uuid(),
      })
      .parse(req.body || {})

    const { data: agent, error: agentError } = await db
      .from('agents')
      .select('id, has_paid')
      .eq('user_id', resolved.user.id)
      .single()

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    if (!agent.has_paid) {
      return res.status(403).json({ error: 'Payment required' })
    }

    const { data: lead, error: leadError } = await db
      .from('service_requests')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead not found' })
    }

    if (lead.is_sold) {
      return res.status(400).json({ error: 'Lead already purchased' })
    }

    const nowIso = new Date().toISOString()
    const { data: updatedRows, error: updateError } = await db
      .from('service_requests')
      .update({
        is_sold: true,
        sold_to_agent_id: agent.id,
        sold_at: nowIso,
        assigned_agent_id: agent.id,
        assigned_at: nowIso,
        status: 'assigned'
      })
      .eq('id', leadId)
      .eq('is_sold', false)
      .select('id')

    if (updateError) {
      throw updateError
    }

    if (!updatedRows || updatedRows.length === 0) {
      return res.status(400).json({ error: 'Lead already purchased' })
    }

    await db
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
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request payload' })
    }

    console.error('Lead purchase error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
