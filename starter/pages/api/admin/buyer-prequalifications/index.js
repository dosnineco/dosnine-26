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

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[char]);

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
        });
      }

      const status = typeof req.query.status === 'string' ? req.query.status : 'all';
      const level = typeof req.query.level === 'string' ? req.query.level : 'all';
      if (
        (status !== 'all' && !['registered', 'under_review', 'verified', 'confirmed', 'rejected', 'expired'].includes(status)) ||
        (level !== 'all' && !/^[1-4]$/.test(level))
      ) {
        return res.status(400).json({ error: 'Invalid filters' });
      }

      let query = db
        .from('buyer_prequalifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(250);
      if (status !== 'all') query = query.eq('status', status);
      if (level !== 'all') query = query.eq('qualification_level', Number(level));

      const { data: prequalifications, error } = await query;
      if (error) throw error;

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
        prequalifications: (prequalifications || []).map((item) => ({
          ...item,
          documents: documentsByPrequalification[item.id] || [],
        })),
      });
    }

    const body = req.body || {};
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
          const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[char]);
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
        .select('buyer_name, buyer_email, status')
        .eq('id', values.prequalificationId)
        .maybeSingle();
      if (currentError) throw currentError;
      if (!current) return res.status(404).json({ error: 'Prequalification not found' });

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
        const recipient = String(current.buyer_email || '').trim();
        if (!recipient || recipient.endsWith('@dosnine.local')) {
          emailSent = false;
          emailError = 'Verification was saved, but the buyer has no deliverable email address.';
        } else {
          const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dosnine.com').replace(/\/+$/, '');
          const dashboardUrl = `${siteUrl}/my-requests`;
          const statusLabel = values.status === 'confirmed'
            ? 'financing confirmed'
            : 'financially verified';
          const budgetRange = values.verifiedBudgetMin != null && values.verifiedBudgetMax != null
            ? `J$${Number(values.verifiedBudgetMin).toLocaleString()} - J$${Number(values.verifiedBudgetMax).toLocaleString()}`
            : '';
          try {
            await sendBrevoEmail({
              to: recipient,
              subject: 'Your Dosnine buyer assessment has been approved',
              htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><h2>Your buyer assessment has been approved</h2><p>Hi ${escapeHtml(current.buyer_name || 'there')},</p><p>Your Dosnine buyer assessment is now <strong>${escapeHtml(statusLabel)}</strong>.</p>${budgetRange ? `<p>Your verified budget range: <strong>${escapeHtml(budgetRange)}</strong></p>` : ''}<p><a href="${escapeHtml(dashboardUrl)}">View your requests</a></p><p>Thank you,<br />Dosnine</p></div>`,
              textContent: [
                'Your Dosnine buyer assessment has been approved.',
                `Hi ${current.buyer_name || 'there'},`,
                `Your assessment is now ${statusLabel}.`,
                budgetRange ? `Verified budget range: ${budgetRange}` : '',
                `View your requests: ${dashboardUrl}`,
                'Thank you, Dosnine',
              ].filter(Boolean).join('\n\n'),
            });
            emailSent = true;
          } catch (sendError) {
            console.error('Sending buyer verification approval email failed:', sendError);
            emailSent = false;
            emailError = 'Verification was saved, but the approval email could not be sent.';
          }
        }
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
