import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { sendBrevoEmail } from '@/lib/serviceRequestAllocation';
import {
  ExternalShareError,
  sendExternalBuyerRequestInvitation,
} from '@/lib/externalBuyerRequestSharing';
import { z } from 'zod';

const shareSchema = z.object({ email: z.string().trim().email().max(254) });
const removeSchema = z.object({ shareId: z.string().uuid() });

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[char]);

async function getOwnedPurchaseRequest(db, requestId, user) {
  const { data: request, error: requestError } = await db
    .from('service_requests')
    .select('id, request_type, client_name, client_email, property_type, location')
    .eq('id', requestId)
    .eq('client_user_id', user.id)
    .maybeSingle();
  if (requestError) throw requestError;
  if (!request || String(request.request_type).toLowerCase() !== 'buy') return null;
  return request;
}

async function hasShareConsent(db, request) {
  const { data: assessment, error: assessmentError } = await db
    .from('buyer_prequalifications')
    .select('id, consent_to_share, buyer_email')
    .eq('service_request_id', request.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (assessmentError) throw assessmentError;
  if (
    !assessment?.consent_to_share ||
    String(assessment.buyer_email || '').trim().toLowerCase() !==
      String(request.client_email || '').trim().toLowerCase()
  ) return false;
  return true;
}

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET', 'POST', 'DELETE'])) return;
  const resolved = await requireDbUser(req, res);
  if (!resolved) return;

  const parsedRequestId = z.string().uuid().safeParse(req.query.id);
  if (!parsedRequestId.success) return res.status(400).json({ error: 'Invalid request id' });

  try {
    const db = getDbClient();
    const request = await getOwnedPurchaseRequest(db, parsedRequestId.data, resolved.user);
    if (!request) {
      return res.status(404).json({
        error: 'Purchase request not found',
      });
    }

    if (req.method === 'GET') {
      const { data: shares, error: sharesError } = await db
        .from('buyer_request_agent_shares')
        .select('id, agent_user_id, agent_email, invite_expires_at, created_at')
        .eq('service_request_id', request.id)
        .eq('shared_by_user_id', resolved.user.id)
        .order('created_at', { ascending: false });
      if (sharesError) throw sharesError;
      const accountIds = [...new Set((shares || []).map((share) => share.agent_user_id).filter(Boolean))];
      const { data: accounts, error: accountsError } = accountIds.length
        ? await db.from('users').select('id, full_name').in('id', accountIds)
        : { data: [], error: null };
      if (accountsError) throw accountsError;
      const accountNames = new Map((accounts || []).map((account) => [account.id, account.full_name]));
      return res.status(200).json({
        success: true,
        shares: (shares || []).map((share) => ({
          ...share,
          agent_name: accountNames.get(share.agent_user_id) || null,
        })),
      });
    }

    if (req.method === 'POST') {
      if (!await hasShareConsent(db, request)) {
        return res.status(403).json({
          error: 'A linked buyer assessment with consent is required before sharing this request.',
        });
      }
      const parsedBody = shareSchema.safeParse(req.body || {});
      if (!parsedBody.success) return res.status(400).json({ error: 'Enter a valid agent email address' });
      const email = parsedBody.data.email.toLowerCase();
      const { data: account, error: accountError } = await db
        .from('users')
        .select('id, email, full_name, account_type, user_type')
        .eq('email', email)
        .maybeSingle();
      if (accountError) throw accountError;
      const hasAgentAccount = account &&
        (account.account_type === 'agent' || (!account.account_type && account.user_type === 'agent'));
      const { data: existingShare, error: existingShareError } = await db
        .from('buyer_request_agent_shares')
        .select('id')
        .eq('service_request_id', request.id)
        .eq('agent_email', email)
        .maybeSingle();
      if (existingShareError) throw existingShareError;

      if (hasAgentAccount) {
        const shareValues = {
          service_request_id: request.id,
          shared_by_user_id: resolved.user.id,
          agent_user_id: account.id,
          agent_email: email,
          invite_token_hash: null,
          invite_expires_at: null,
        };
        const { error } = existingShare
          ? await db.from('buyer_request_agent_shares').update(shareValues).eq('id', existingShare.id)
          : await db.from('buyer_request_agent_shares').insert(shareValues);
        if (error) throw error;

        let emailSent = false;
        let emailError = null;
        const recipient = String(account.email || email).trim();
        if (!recipient || recipient.endsWith('@dosnine.local')) {
          emailError = 'The request was shared, but the agent has no deliverable email address.';
        } else {
          const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dosnine.com').replace(/\/+$/, '');
          const dashboardUrl = `${siteUrl}/agent/dashboard`;
          try {
            await sendBrevoEmail({
              to: recipient,
              subject: 'A buyer shared a property request with you',
              htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><h2>A buyer shared a property request with you</h2><p>Hi ${escapeHtml(account.full_name || 'there')},</p><p>${escapeHtml(request.client_name || 'A buyer')} shared a purchase request with you for view-only review.</p><p><strong>Property:</strong> ${escapeHtml(request.property_type || 'Not specified')}<br /><strong>Location:</strong> ${escapeHtml(request.location || 'Not specified')}</p><p><a href="${escapeHtml(dashboardUrl)}">View requests shared with you</a></p><p>This request does not change your assigned leads.</p><p>Thank you,<br />Dosnine</p></div>`,
              textContent: [
                'A buyer shared a property request with you.',
                `Hi ${account.full_name || 'there'},`,
                `${request.client_name || 'A buyer'} shared a purchase request with you for view-only review.`,
                `Property: ${request.property_type || 'Not specified'}`,
                `Location: ${request.location || 'Not specified'}`,
                `View requests shared with you: ${dashboardUrl}`,
                'This request does not change your assigned leads.',
                'Thank you, Dosnine',
              ].join('\n\n'),
            });
            emailSent = true;
          } catch (emailSendError) {
            console.error('Sending shared buyer request email failed:', emailSendError);
            emailError = 'The request was shared, but the notification email could not be sent.';
          }
        }
        return res.status(200).json({
          success: true,
          mode: 'account',
          emailSent,
          ...(emailError ? { emailError } : {}),
        });
      }

      const shareId = existingShare?.id;
      const invitation = await sendExternalBuyerRequestInvitation({
        db,
        request,
        email,
        sharedByUserId: resolved.user.id,
        existingShareId: shareId,
      });
      return res.status(200).json({ success: true, mode: 'invite', expiresAt: invitation.expiresAt });
    }

    const parsedBody = removeSchema.safeParse(req.body || {});
    if (!parsedBody.success) return res.status(400).json({ error: 'Invalid share' });
    const { error } = await db
      .from('buyer_request_agent_shares')
      .delete()
      .eq('service_request_id', request.id)
      .eq('shared_by_user_id', resolved.user.id)
      .eq('id', parsedBody.data.shareId);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Buyer request agent sharing failed:', error);
    if (error instanceof ExternalShareError) {
      return res.status(503).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Unable to update request sharing' });
  }
}
