import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { sendBrevoEmail } from '@/lib/serviceRequestAllocation';

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res, { createIfMissing: true });
    if (!resolved) return;

    const db = getDbClient();
    const {
      clerkId,
      fullName,
      email,
      phone,
      businessName,
      yearsExperience,
      specializations,
      licenseNumber,
      serviceAreas,
      aboutMe,
      dealsClosedCount,
      dataConsent,
      licenseFileUrl,
      registrationFileUrl,
      jamaicanIdNumber,
      verificationFrontUrl,
      verificationBackUrl,
      identityConsent,
    } = req.body;

    if (clerkId && clerkId !== resolved.clerkId) {
      return res.status(403).json({ error: 'Identity mismatch' });
    }

    const trustedUser = resolved.user;
    const userId = trustedUser.id;
    const resolvedEmail = email || trustedUser.email;

    if (trustedUser.account_type && trustedUser.account_type !== 'agent') {
      return res.status(409).json({ error: 'This account is not set up as a real estate agent.' });
    }

    console.log('Agent signup request:', { clerkId: resolved.clerkId, fullName, email: resolvedEmail });

    // Validate required fields
    if (!fullName || !resolvedEmail || !phone || !businessName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!dataConsent) {
      return res.status(400).json({ error: 'Data consent required' });
    }

    const identityVerified = Boolean(
      trustedUser.identity_verified || trustedUser.id_verification_status === 'approved'
    );
    if (!identityVerified) {
      const validIdDocumentPath = (path, side) =>
        typeof path === 'string' &&
        path.startsWith(`verification/${userId}/`) &&
        new RegExp(`^verification/${userId}/jamaican-id-${side}-\\d+\\.(jpg|jpeg|png)$`).test(path);
      if (
        typeof jamaicanIdNumber !== 'string' ||
        !jamaicanIdNumber.trim() ||
        jamaicanIdNumber.length > 100 ||
        !identityConsent ||
        !validIdDocumentPath(verificationFrontUrl, 'front') ||
        !validIdDocumentPath(verificationBackUrl, 'back')
      ) {
        return res.status(400).json({
          error: 'Submit your Jamaican ID number, both ID images, and verification consent.',
        });
      }

      const { data: uploadedIdFiles, error: listError } = await db.storage
        .from('agent-documents')
        .list(`verification/${userId}`, { search: 'jamaican-id-' });
      if (listError) {
        console.error('Failed to verify uploaded agent identity documents:', listError);
        return res.status(500).json({ error: 'Unable to verify uploaded identity documents' });
      }

      const uploadedNames = new Set((uploadedIdFiles || []).map((file) => file.name));
      if (
        !uploadedNames.has(verificationFrontUrl.split('/').pop()) ||
        !uploadedNames.has(verificationBackUrl.split('/').pop())
      ) {
        return res.status(400).json({ error: 'Both Jamaican ID images must be uploaded before submitting.' });
      }
    }

    const { error: updateUserError } = await db
      .from('users')
      .update({
        clerk_id: resolved.clerkId,
        email: resolvedEmail,
        full_name: fullName,
        phone: phone,
        user_type: 'agent',
        account_type: 'agent',
        ...(!identityVerified ? {
          identity_verified: false,
          id_verification_status: 'pending',
          jamaican_id_number: jamaicanIdNumber.trim(),
          verification_role: 'agent',
          verification_front_url: verificationFrontUrl,
          verification_back_url: verificationBackUrl,
        } : {}),
      })
      .eq('id', userId);

    if (updateUserError) {
      console.error('Failed to update user:', updateUserError);
      return res.status(500).json({ error: 'Failed to update user profile' });
    }

    // Insert or update agent record in agents table
    const agentData = {
      user_id: userId,
      business_name: businessName,
      years_experience: parseInt(yearsExperience) || 1,
      license_number: licenseNumber || null,
      specializations: Array.isArray(specializations) ? specializations : [specializations].filter(Boolean),
      service_areas: Array.isArray(serviceAreas) ? serviceAreas.join(', ') : (serviceAreas || ''),
      about_me: aboutMe || '',
      deals_closed_count: parseInt(dealsClosedCount) || 0,
      license_file_url: licenseFileUrl,
      registration_file_url: registrationFileUrl,
      verification_status: 'pending',
      verification_submitted_at: new Date().toISOString(),
      service_agreement_signed: true,
      service_agreement_date: new Date().toISOString(),
      data_sharing_consent: dataConsent,
    };

    // Try to insert, or update if already exists
    const { data: existingAgent } = await db
      .from('agents')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let agentError;
    if (existingAgent) {
      // Update existing agent
      const { error } = await db
        .from('agents')
        .update(agentData)
        .eq('user_id', userId);
      agentError = error;
    } else {
      // Insert new agent
      const { error } = await db
        .from('agents')
        .insert([agentData]);
      agentError = error;
    }

    if (agentError) {
      console.error('Failed to insert/update agent:', agentError);
      return res.status(500).json({ error: 'Failed to create agent profile' });
    }

    const identityEmailText = identityVerified
      ? 'Your identity is already verified.'
      : 'We have received your identity verification documents.';
    let emailSent = false;
    try {
      const safeName = escapeHtml(fullName);
      await sendBrevoEmail({
        to: resolvedEmail,
        subject: 'We received your Dosnine agent application',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2>Agent application received</h2>
            <p>Hi ${safeName},</p>
            <p>Thank you for applying to become a Dosnine real estate agent. We have received your application and credentials. ${escapeHtml(identityEmailText)}</p>
            <p>Our team will review your application and contact you with an update, typically within 24-48 hours.</p>
            <p>Thank you,<br />The Dosnine Team</p>
          </div>
        `,
        textContent: `Hi ${fullName},\n\nThank you for applying to become a Dosnine real estate agent. We have received your application and credentials. ${identityEmailText} Our team will review your application and contact you with an update, typically within 24-48 hours.\n\nThank you,\nThe Dosnine Team`,
      });
      emailSent = true;
    } catch (emailError) {
      console.error('Agent application confirmation email failed:', emailError);
    }

    let adminEmailSent = false;
    try {
      const safeName = escapeHtml(fullName);
      const safeBusinessName = escapeHtml(businessName);
      await sendBrevoEmail({
        to: process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'admin@dosnine.com',
        subject: 'New agent application received',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2>New agent application</h2>
            <p><strong>Applicant:</strong> ${safeName}</p>
            <p><strong>Email:</strong> ${escapeHtml(resolvedEmail)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
            <p><strong>Business:</strong> ${safeBusinessName}</p>
            <p>Agent credentials were submitted with this application. ${escapeHtml(identityEmailText)}</p>
            <p><a href="${escapeHtml(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://dosnine.com'}/admin/users`)}">Review applications in the admin dashboard</a></p>
            <p><strong>Submitted:</strong> ${new Date().toISOString()}</p>
          </div>
        `,
        textContent: `New agent application\n\nApplicant: ${fullName}\nEmail: ${resolvedEmail}\nPhone: ${phone}\nBusiness: ${businessName}\n\nAgent credentials were submitted with this application. ${identityEmailText}\nReview applications in the admin dashboard.`,
      });
      adminEmailSent = true;
    } catch (emailError) {
      console.error('Agent application admin notification failed:', emailError);
    }

    return res.status(200).json({
      success: true,
      message: 'Application submitted! We will review within 24-48 hours.',
      emailSent,
      adminEmailSent,
    });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: error.message || 'Signup failed' });
  }
}
