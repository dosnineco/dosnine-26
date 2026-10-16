import { getDbClient, requireAgentAccountUser } from '@/lib/apiAuth';
import { streamBuyerDocument } from '@/lib/buyerPrequalification';
import { enforceMethods } from '@/lib/apiSecurity';
import { z } from 'zod';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;
  const resolved = await requireAgentAccountUser(req, res);
  if (!resolved) return;

  const parsedId = z.string().uuid().safeParse(req.query.documentId);
  if (!parsedId.success) return res.status(400).json({ error: 'Invalid document id' });

  try {
    const db = getDbClient();
    const { data: agent, error: agentError } = await db
      .from('agents')
      .select('id')
      .eq('user_id', resolved.user.id)
      .maybeSingle();
    if (agentError) throw agentError;

    const { data: document, error: documentError } = await db
      .from('buyer_documents')
      .select('file_path, file_name, mime_type, prequalification_id')
      .eq('id', parsedId.data)
      .maybeSingle();
    if (documentError) throw documentError;
    if (!document) return res.status(404).json({ error: 'Document not found' });

    const { data: assessment, error: assessmentError } = await db
      .from('buyer_prequalifications')
      .select('id, service_request_id, buyer_email')
      .eq('id', document.prequalification_id)
      .maybeSingle();
    if (assessmentError) throw assessmentError;
    if (!assessment?.service_request_id) {
      return res.status(404).json({ error: 'Document is not linked to an available request' });
    }

    const { data: request, error: requestError } = await db
      .from('service_requests')
      .select('id, client_email, assigned_agent_id')
      .eq('id', assessment.service_request_id)
      .eq('request_type', 'buy')
      .maybeSingle();
    if (requestError) throw requestError;
    const { data: latestAssessment, error: latestAssessmentError } = await db
      .from('buyer_prequalifications')
      .select('id, consent_to_share')
      .eq('service_request_id', assessment.service_request_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestAssessmentError) throw latestAssessmentError;
    if (
      !request ||
      latestAssessment?.id !== assessment.id ||
      !latestAssessment?.consent_to_share ||
      String(assessment.buyer_email || '').trim().toLowerCase() !==
        String(request.client_email || '').trim().toLowerCase()
    ) {
      return res.status(404).json({ error: 'Document is not linked to an available request' });
    }

    const isAssignedAgent = Boolean(agent && request.assigned_agent_id === agent.id);
    if (!isAssignedAgent) {
      const { data: share, error: shareError } = await db
        .from('buyer_request_agent_shares')
        .select('id')
        .eq('service_request_id', assessment.service_request_id)
        .eq('agent_user_id', resolved.user.id)
        .maybeSingle();
      if (shareError) throw shareError;
      if (!share) return res.status(403).json({ error: 'This document is not available to your account' });
    }

    return await streamBuyerDocument(db, document, res);
  } catch (error) {
    console.error('Agent buyer document access failed:', error);
    return res.status(500).json({ error: 'Unable to open buyer document' });
  }
}
