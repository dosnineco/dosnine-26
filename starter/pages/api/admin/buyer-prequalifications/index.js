import { getDbClient, requireAdminUser } from '@/lib/apiAuth';
import { createBuyerAccessToken, createSignedDownloadUrl, recomputeQualificationLevel } from '@/lib/buyerPrequalification';
import { enforceMethods } from '@/lib/apiSecurity';
import { sendBrevoEmail } from '@/lib/serviceRequestAllocation';
import { z } from 'zod';

const documentActionSchema = z.object({
  action: z.literal('sign-download'),
  documentId: z.string().uuid(),
});

const reviewDocumentSchema = z.object({
  action: z.literal('verify-document'),
  documentId: z.string().uuid(),
  approved: z.boolean(),
  notes: z.string().trim().max(1000).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

const verificationSchema = z.object({
  action: z.literal('set-verification'),
  prequalificationId: z.string().uuid(),
  status: z.enum(['registered', 'under_review', 'verified', 'confirmed', 'rejected', 'expired']),
  level: z.number().int().min(1).max(4),
  verifiedBudgetMin: z.number().finite().nonnegative().nullable().optional(),
  verifiedBudgetMax: z.number().finite().nonnegative().nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

const approvalEmailSchema = z.object({
  action: z.literal('send-approval-email'),
  prequalificationId: z.string().uuid(),
});

const upsertPrequalificationSchema = z.object({
  action: z.literal('upsert-prequalification'),
  id: z.string().uuid().optional(),
  buyer_name: z.string().trim().min(1).max(200).optional(),
  buyer_email: z.string().trim().max(200).optional().or(z.literal('')),
  buyer_phone: z.string().trim().max(50).optional().or(z.literal('')),
  purchase_method: z.string().trim().max(100).optional(),
  target_property_price: z.number().finite().nonnegative().nullable().optional(),
  monthly_income: z.number().finite().nonnegative().nullable().optional(),
  deposit_available: z.number().finite().nonnegative().nullable().optional(),
  financing_progress: z.string().trim().max(200).optional().or(z.literal('')),
  lender_name: z.string().trim().max(200).optional().or(z.literal('')),
  consent_to_share: z.boolean().optional(),
  status: z.enum(['registered', 'under_review', 'verified', 'confirmed', 'rejected', 'expired']).optional(),
  qualification_level: z.number().int().min(1).max(4).optional(),
  verification_notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

const deletePrequalificationSchema = z.object({
  action: z.literal('delete-prequalification'),
  prequalificationId: z.string().uuid(),
});

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[char]);

async function sendApprovalEmail({ buyerName, buyerEmail, status, budgetMin, budgetMax }) {
  const recipient = String(buyerEmail || '').trim();
  if (!recipient || recipient.endsWith('@dosnine.local')) {
    return { emailSent: false, emailError: 'The buyer has no deliverable email address.' };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dosnine.com').replace(/\/+$/, '');
  const dashboardUrl = `${siteUrl}/my-requests`;
  const statusLabel = status === 'confirmed' ? 'financing confirmed' : 'financially verified';
  const budgetRange = budgetMin != null && budgetMax != null
    ? `J$${Number(budgetMin).toLocaleString()} - J$${Number(budgetMax).toLocaleString()}`
    : '';
  try {
    await sendBrevoEmail({
      to: recipient,
      subject: status === 'confirmed'
        ? 'Your Dosnine financing has been confirmed'
        : 'Your Dosnine buyer assessment has been approved',
      htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><h2>${status === 'confirmed' ? 'Financing confirmed' : 'Buyer assessment approved'}</h2><p>Hi ${escapeHtml(buyerName || 'there')},</p><p>Your Dosnine buyer assessment is now <strong>${escapeHtml(statusLabel)}</strong>.</p>${budgetRange ? `<p>Your verified budget range: <strong>${escapeHtml(budgetRange)}</strong></p>` : ''}<p><a href="${escapeHtml(dashboardUrl)}">View your requests</a></p><p>Thank you,<br />Dosnine</p></div>`,
      textContent: [
        status === 'confirmed' ? 'Your Dosnine financing has been confirmed.' : 'Your Dosnine buyer assessment has been approved.',
        `Hi ${buyerName || 'there'},`,
        `Your assessment is now ${statusLabel}.`,
        budgetRange ? `Verified budget range: ${budgetRange}` : '',
        `View your requests: ${dashboardUrl}`,
        'Thank you, Dosnine',
      ].filter(Boolean).join('\n\n'),
    });
    return { emailSent: true };
  } catch (error) {
    console.error('Sending buyer verification approval email failed:', error);
    return { emailSent: false, emailError: 'The approval email could not be sent.' };
  }
}

export default async function handler(req, res) {
  const allowedMethods = ['GET', 'POST'];
  if (!enforceMethods(req, res, allowedMethods)) return;

  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;
    const db = getDbClient();

    if (req.method === 'GET') {
      if (req.query.summary === 'true') {
        const [{ data: reviews, error: reviewsError }, { data: pendingDocuments, error: documentsError }] =
          await Promise.all([
            db
              .from('buyer_prequalifications')
              .select('id')
              .in('status', ['registered', 'under_review']),
            db
              .from('buyer_documents')
              .select('prequalification_id')
              .eq('status', 'pending'),
          ]);
        if (reviewsError) throw reviewsError;
        if (documentsError) throw documentsError;

        const reviewIds = new Set((reviews || []).map((item) => item.id));
        (pendingDocuments || []).forEach((document) => {
          reviewIds.add(document.prequalification_id);
        });

        return res.status(200).json({
          success: true,
          pendingReviewCount: reviewIds.size,
          pendingDocumentCount: (pendingDocuments || []).length,
        });
      }

      const status = typeof req.query.status === 'string' ? req.query.status : 'all';
      const level = typeof req.query.level === 'string' ? req.query.level : 'all';
      const review = typeof req.query.review === 'string' ? req.query.review : 'all';
      if (
        (status !== 'all' && !['registered', 'under_review', 'verified', 'confirmed', 'rejected', 'expired'].includes(status)) ||
        (level !== 'all' && !/^[1-4]$/.test(level)) ||
        !['all', 'pending_documents'].includes(review)
      ) {
        return res.status(400).json({ error: 'Invalid filters' });
      }

      const { data: pendingDocuments, error: pendingDocumentsError, count: pendingDocumentCount } = await db
        .from('buyer_documents')
        .select('prequalification_id', { count: 'exact' })
        .eq('status', 'pending');
      if (pendingDocumentsError) throw pendingDocumentsError;
      const pendingPrequalificationIds = [...new Set((pendingDocuments || [])
        .map((document) => document.prequalification_id)
        .filter(Boolean))];
      if (review === 'pending_documents' && pendingPrequalificationIds.length === 0) {
        return res.status(200).json({ success: true, prequalifications: [], pendingDocumentCount: 0 });
      }

      let query = db
        .from('buyer_prequalifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(250);
      if (status !== 'all') query = query.eq('status', status);
      if (level !== 'all') query = query.eq('qualification_level', Number(level));
      if (review === 'pending_documents') query = query.in('id', pendingPrequalificationIds);

      const { data: prequalifications, error } = await query;
      if (error) throw error;

      const requestIds = [...new Set((prequalifications || [])
        .map((item) => item.service_request_id)
        .filter(Boolean))];
      let requestsById = {};
      if (requestIds.length) {
        const { data: requests, error: requestsError } = await db
          .from('service_requests')
          .select('id, request_type, property_type')
          .in('id', requestIds);
        if (requestsError) throw requestsError;
        requestsById = (requests || []).reduce((map, request) => {
          map[request.id] = request;
          return map;
        }, {});
      }

      const ids = (prequalifications || []).map((item) => item.id);
      let documentsByPrequalification = {};
      if (ids.length) {
        const { data: documents, error: documentsError } = await db
          .from('buyer_documents')
          .select('*')
          .in('prequalification_id', ids)
          .order('uploaded_at', { ascending: false });
        if (documentsError) throw documentsError;
        documentsByPrequalification = (documents || []).reduce((groups, document) => {
          (groups[document.prequalification_id] ||= []).push(document);
          return groups;
        }, {});
      }

      return res.status(200).json({
        success: true,
        pendingDocumentCount: pendingDocumentCount || 0,
        prequalifications: (prequalifications || []).map((item) => ({
          ...item,
          linked_request: requestsById[item.service_request_id] || null,
          documents: documentsByPrequalification[item.id] || [],
        })),
      });
    }

    const body = req.body || {};

    if (body.action === 'upsert-prequalification') {
      const parsed = upsertPrequalificationSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid prequalification payload' });
      }
      const values = parsed.data;

      const payload = {
        buyer_name: values.buyer_name?.trim() || '',
        buyer_email: values.buyer_email?.trim() || null,
        buyer_phone: values.buyer_phone?.trim() || null,
        purchase_method: values.purchase_method?.trim() || 'mortgage',
        target_property_price: values.target_property_price ?? null,
        monthly_income: values.monthly_income ?? null,
        deposit_available: values.deposit_available ?? null,
        financing_progress: values.financing_progress?.trim() || null,
        lender_name: values.lender_name?.trim() || null,
        consent_to_share: values.consent_to_share ?? false,
        status: values.status || 'registered',
        qualification_level: values.qualification_level ?? 1,
        verification_notes: values.verification_notes?.trim() || null,
      };

      if (values.id) {
        const { data: updated, error } = await db
          .from('buyer_prequalifications')
          .update(payload)
          .eq('id', values.id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        if (!updated) return res.status(404).json({ error: 'Prequalification not found' });
        return res.status(200).json({ success: true, prequalification: updated });
      }

      const { data: inserted, error } = await db
        .from('buyer_prequalifications')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;
      return res.status(201).json({ success: true, prequalification: inserted });
    }

    if (body.action === 'delete-prequalification') {
      const parsed = deletePrequalificationSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid delete request' });
      }

      const { error: documentDeleteError } = await db
        .from('buyer_documents')
        .delete()
        .eq('prequalification_id', parsed.data.prequalificationId);
      if (documentDeleteError) throw documentDeleteError;

      const { error } = await db
        .from('buyer_prequalifications')
        .delete()
        .eq('id', parsed.data.prequalificationId);
      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    if (body.action === 'sign-download') {
      const parsed = documentActionSchema.safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid document request' });
      const { data: document, error } = await db
        .from('buyer_documents')
        .select('file_path, file_name')
        .eq('id', parsed.data.documentId)
        .maybeSingle();
      if (error) throw error;
      if (!document) return res.status(404).json({ error: 'Document not found' });

      const url = await createSignedDownloadUrl(document.file_path, 300);
      return res.status(200).json({ success: true, url });
    }

    if (body.action === 'send-approval-email') {
      const parsed = approvalEmailSchema.safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid approval email request' });
      const { data: buyer, error } = await db
        .from('buyer_prequalifications')
        .select('buyer_name, buyer_email, status, qualification_level, verified_budget_min, verified_budget_max')
        .eq('id', parsed.data.prequalificationId)
        .maybeSingle();
      if (error) throw error;
      if (!buyer) return res.status(404).json({ error: 'Prequalification not found' });
      if (!['verified', 'confirmed'].includes(buyer.status) ||
        buyer.qualification_level < 3) {
        return res.status(400).json({ error: 'Only Level 3 or Level 4 approvals can be emailed' });
      }

      const result = await sendApprovalEmail({
        buyerName: buyer.buyer_name,
        buyerEmail: buyer.buyer_email,
        status: buyer.status,
        budgetMin: buyer.verified_budget_min,
        budgetMax: buyer.verified_budget_max,
      });
      return res.status(200).json({ success: true, ...result });
    }

    if (body.action === 'verify-document') {
      const parsed = reviewDocumentSchema.safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid document review' });
      if (!parsed.data.approved && !parsed.data.notes?.trim()) {
        return res.status(400).json({ error: 'A rejection reason is required' });
      }
      const { data: document, error: lookupError } = await db
        .from('buyer_documents')
        .select('id, prequalification_id, file_name')
        .eq('id', parsed.data.documentId)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!document) return res.status(404).json({ error: 'Document not found' });

      const { error } = await db
        .from('buyer_documents')
        .update({
          status: parsed.data.approved ? 'reviewed' : 'rejected',
          review_notes: parsed.data.notes || null,
          reviewed_by: resolved.user.id,
          reviewed_at: new Date().toISOString(),
          expires_at: parsed.data.expiresAt || null,
        })
        .eq('id', document.id);
      if (error) throw error;

      let emailSent = null;
      let rejectionEmailError = null;
      if (!parsed.data.approved) {
        const { data: buyer, error: buyerError } = await db
          .from('buyer_prequalifications')
          .select('buyer_name, buyer_email')
          .eq('id', document.prequalification_id)
          .maybeSingle();
        if (buyerError) throw buyerError;
        if (!buyer?.buyer_email) {
          emailSent = false;
          rejectionEmailError = 'Document rejected, but the buyer does not have an email address on file';
        } else {
          const accessToken = createBuyerAccessToken(document.prequalification_id);
          const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dosnine.com').replace(/\/+$/, '');
          const resubmissionUrl = new URL('/buyer-prequalification', `${baseUrl}/`);
          resubmissionUrl.searchParams.set('prequalificationId', document.prequalification_id);
          resubmissionUrl.searchParams.set('accessToken', accessToken);
          const note = parsed.data.notes.trim();

          try {
            await sendBrevoEmail({
              to: buyer.buyer_email,
              subject: 'Please update a document for your buyer assessment',
              htmlContent: `<p>Hi ${escapeHtml(buyer.buyer_name || 'there')},</p><p>We could not accept your ${escapeHtml(document.file_name || 'uploaded document')}.</p><p><strong>Reason:</strong> ${escapeHtml(note)}</p><p><a href="${escapeHtml(resubmissionUrl.toString())}">Sign in securely to replace the document</a></p>`,
              textContent: `Hi ${buyer.buyer_name || 'there'},\n\nWe could not accept your ${document.file_name || 'uploaded document'}.\n\nReason: ${note}\n\nReplace the document securely: ${resubmissionUrl.toString()}`,
            });
            emailSent = true;
          } catch (emailError) {
            console.error('Sending buyer document rejection email failed:', emailError);
            emailSent = false;
            rejectionEmailError = 'Document rejected, but the resubmission email could not be sent';
          }
        }
      }

      const levelInfo = await recomputeQualificationLevel(document.prequalification_id);
      return res.status(200).json({
        success: true,
        levelInfo,
        emailSent,
        ...(rejectionEmailError ? { error: rejectionEmailError } : {}),
      });
    }

    if (body.action === 'set-verification') {
      const parsed = verificationSchema.safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid verification details' });
      const values = parsed.data;
      if (
        (values.verifiedBudgetMin != null && values.verifiedBudgetMax != null &&
          values.verifiedBudgetMin > values.verifiedBudgetMax) ||
        (['verified', 'confirmed'].includes(values.status) &&
          (values.verifiedBudgetMin == null || values.verifiedBudgetMax == null)) ||
        (values.status === 'verified' && values.level !== 3) ||
        (values.status === 'confirmed' && values.level !== 4) ||
        (values.status === 'registered' && values.level !== 1) ||
        (values.status === 'under_review' && values.level !== 2) ||
        (['rejected', 'expired'].includes(values.status) && values.level !== 1)
      ) {
        return res.status(400).json({ error: 'Verification status, level, or budget range is inconsistent' });
      }

      const { data: current, error: currentError } = await db
        .from('buyer_prequalifications')
        .select('buyer_name, buyer_email, status, qualification_level')
        .eq('id', values.prequalificationId)
        .maybeSingle();
      if (currentError) throw currentError;
      if (!current) return res.status(404).json({ error: 'Prequalification not found' });
      if (values.status === 'verified' && current.status === 'confirmed') {
        return res.status(400).json({ error: 'Level 4 financing confirmation cannot be downgraded to Level 3.' });
      }

      if (values.status === 'verified' || values.status === 'confirmed') {
        const { data: documents, error: documentsError } = await db
          .from('buyer_documents')
          .select('document_type, status, expires_at')
          .eq('prequalification_id', values.prequalificationId);
        if (documentsError) throw documentsError;
        const now = Date.now();
        const activeReviewedDocuments = (documents || []).filter((document) =>
          document.status === 'reviewed' &&
          (!document.expires_at || new Date(document.expires_at).getTime() > now)
        );
        const hasPendingDocuments = (documents || []).some((document) => document.status === 'pending');
        const hasLenderEvidence = activeReviewedDocuments.some((document) =>
          ['mortgage_approval', 'nht_documentation'].includes(document.document_type)
        );
        if (values.status === 'verified' && (!activeReviewedDocuments.length || hasPendingDocuments)) {
          return res.status(400).json({
            error: 'Review all pending documents and verify at least one active document before marking Level 3 verified.',
          });
        }
        if (values.status === 'confirmed' &&
          (!['verified', 'confirmed'].includes(current.status) || !hasLenderEvidence)) {
          return res.status(400).json({
            error: 'Level 4 requires Level 3 verification and an active reviewed mortgage approval or NHT document.',
          });
        }
      }

      const { data: updated, error } = await db
        .from('buyer_prequalifications')
        .update({
          status: values.status,
          qualification_level: values.level,
          verified_budget_min: values.verifiedBudgetMin ?? null,
          verified_budget_max: values.verifiedBudgetMax ?? null,
          verification_notes: values.notes || null,
          verified_by: resolved.user.id,
          verified_at: new Date().toISOString(),
          verification_expires_at: values.expiresAt || null,
        })
        .eq('id', values.prequalificationId)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!updated) return res.status(404).json({ error: 'Prequalification not found' });

      let emailSent = null;
      let emailError = null;
      const isApproved = ['verified', 'confirmed'].includes(values.status);
      const wasAlreadyApproved = ['verified', 'confirmed'].includes(current.status);
      if (isApproved && values.status !== current.status && (!wasAlreadyApproved || values.status === 'confirmed')) {
        const result = await sendApprovalEmail({
          buyerName: current.buyer_name,
          buyerEmail: current.buyer_email,
          status: values.status,
          budgetMin: values.verifiedBudgetMin,
          budgetMax: values.verifiedBudgetMax,
        });
        emailSent = result.emailSent;
        if (result.emailError) emailError = `Verification was saved, but ${result.emailError.toLowerCase()}`;
      }
      return res.status(200).json({
        success: true,
        emailSent,
        ...(emailError ? { emailError } : {}),
      });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Admin buyer prequalification request failed:', error);
    return res.status(500).json({
      error: error?.message || 'Unable to process buyer prequalification request',
    });
  }
}
