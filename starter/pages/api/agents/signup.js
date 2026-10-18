import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { sendBrevoEmail } from '@/lib/serviceRequestAllocation';
import { PARISHES } from '@/lib/normalizeParish';
import { SPECIALIZATIONS } from '@/lib/agentOptions';

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
    const db = getDbClient();
    const {
      sessionToken,
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
      agreeToTerms,
    } = req.body;

    let resolved;
    let verificationSession = null;
    if (sessionToken) {
      if (typeof sessionToken !== 'string') {
        return res.status(400).json({ error: 'Invalid verification session.' });
      }

      const { data: session, error: sessionError } = await db
        .from('verification_sessions')
        .select('id, user_clerk_id, context_id, verification_type, metadata, status, expires_at')
        .eq('token', sessionToken)
        .maybeSingle();
      if (sessionError) throw sessionError;
      if (
        !session ||
        session.verification_type !== 'identity' ||
        session.metadata?.role !== 'agent' ||
        (session.context_id && session.context_id !== session.user_clerk_id)
      ) {
        return res.status(404).json({ error: 'Agent verification session not found.' });
      }
      if (!['pending', 'mobile_opened'].includes(session.status)) {
        return res.status(409).json({ error: 'This verification session is no longer active.' });
      }
      if (new Date(session.expires_at) <= new Date()) {
        return res.status(410).json({ error: 'This verification session has expired.' });
      }

      const { data: user, error: userError } = await db
        .from('users')
        .select('*')
        .eq('clerk_id', session.user_clerk_id)
        .maybeSingle();
      if (userError) throw userError;
      if (!user) return res.status(404).json({ error: 'User profile not found.' });
      if (['deactivated', 'flagged'].includes(String(user.account_status || '').toLowerCase())) {
        return res.status(403).json({ error: 'This account cannot submit an agent application.' });
      }

      resolved = { clerkId: session.user_clerk_id, user };
      verificationSession = session;
    } else {
      resolved = await requireDbUser(req, res, { createIfMissing: true });
      if (!resolved) return;
    }

    if (clerkId && clerkId !== resolved.clerkId) {
      return res.status(403).json({ error: 'Identity mismatch' });
    }

    const trustedUser = resolved.user;
    const userId = trustedUser.id;
    const resolvedEmail = trustedUser.email || email;

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
    if (verificationSession && !agreeToTerms) {
      return res.status(400).json({ error: 'Agent terms acceptance is required.' });
    }
    if (
      String(yearsExperience ?? '').trim() === '' ||
      !Number.isInteger(Number(yearsExperience)) ||
      Number(yearsExperience) < 0 ||
      Number(yearsExperience) > 80 ||
      !Number.isInteger(Number(dealsClosedCount ?? 0)) ||
      Number(dealsClosedCount ?? 0) < 0 ||
      Number(dealsClosedCount ?? 0) > 999 ||
      !Array.isArray(specializations) ||
      specializations.length === 0 ||
      specializations.some((value) => !SPECIALIZATIONS.includes(value)) ||
      !Array.isArray(serviceAreas) ||
      serviceAreas.length === 0 ||
      serviceAreas.some((value) => !PARISHES.includes(value))
    ) {
      return res.status(400).json({ error: 'Complete your experience, specialization, and service area details.' });
    }

    const identityVerified = Boolean(
      trustedUser.identity_verified || trustedUser.id_verification_status === 'approved'
    );
    if (!identityVerified) {
      const sessionPrefix = verificationSession
        ? `verification/${userId}/sessions/${verificationSession.id}/`
        : null;
      const validIdDocumentPath = (path, side) =>
        typeof path === 'string' &&
        (sessionPrefix
          ? path === `${sessionPrefix}${side}`
          : path.startsWith(`verification/${userId}/`) &&
            new RegExp(`^verification/${userId}/jamaican-id-${side}-\\d+\\.(jpg|jpeg|png)$`).test(path));
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

      const verifyUploadedImage = async (path) => {
        const directory = path.slice(0, path.lastIndexOf('/'));
        const filename = path.slice(path.lastIndexOf('/') + 1);
        const { data: files, error: listError } = await db.storage
          .from('agent-documents')
          .list(directory, { search: filename });
        if (listError) throw listError;
        const file = files?.find((entry) => entry.name === filename);
        const size = Number(file?.metadata?.size);
        const mimeType = file?.metadata?.mimetype;
        return Boolean(
          file &&
          Number.isFinite(size) &&
          size > 0 &&
          size <= 5 * 1024 * 1024 &&
          ['image/jpeg', 'image/png'].includes(mimeType)
        );
      };
      if (!(await verifyUploadedImage(verificationFrontUrl)) || !(await verifyUploadedImage(verificationBackUrl))) {
        return res.status(400).json({ error: 'Both Jamaican ID images must be uploaded as JPG or PNG files up to 5 MB.' });
      }
    }

    let validatedLicenseFileUrl = licenseFileUrl;
    let validatedRegistrationFileUrl = registrationFileUrl || null;
    if (verificationSession) {
      const sessionPrefix = `verification/${userId}/sessions/${verificationSession.id}/`;
      if (
        licenseFileUrl !== `${sessionPrefix}license` ||
        (registrationFileUrl && registrationFileUrl !== `${sessionPrefix}registration`)
      ) {
        return res.status(400).json({ error: 'Upload the agent license and any business registration documents.' });
      }
      const verifyAgentDocument = async (path) => {
        const { data: files, error: listError } = await db.storage
          .from('agent-documents')
          .list(sessionPrefix.slice(0, -1), { search: path.split('/').pop() });
        if (listError) throw listError;
        const file = files?.find((entry) => entry.name === path.split('/').pop());
        const size = Number(file?.metadata?.size);
        const mimeType = file?.metadata?.mimetype;
        return Boolean(
          file &&
          Number.isFinite(size) &&
          size > 0 &&
          size <= 5 * 1024 * 1024 &&
          ['image/jpeg', 'image/png'].includes(mimeType)
        );
      };
      if (!(await verifyAgentDocument(licenseFileUrl))) {
        return res.status(400).json({ error: 'Upload a valid JPG or PNG agent license image up to 5 MB.' });
      }
      if (registrationFileUrl && !(await verifyAgentDocument(registrationFileUrl))) {
        return res.status(400).json({ error: 'Upload a valid JPG or PNG business registration image up to 5 MB.' });
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
      years_experience: Number(yearsExperience),
      license_number: licenseNumber || null,
      specializations: Array.isArray(specializations) ? specializations : [specializations].filter(Boolean),
      service_areas: Array.isArray(serviceAreas) ? serviceAreas.join(', ') : (serviceAreas || ''),
      about_me: aboutMe || '',
      deals_closed_count: parseInt(dealsClosedCount) || 0,
      license_file_url: validatedLicenseFileUrl,
      registration_file_url: validatedRegistrationFileUrl,
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
