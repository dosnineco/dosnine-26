import { getDbClient, requireDbUser } from '@/lib/apiAuth';

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
    } = req.body;

    if (clerkId && clerkId !== resolved.clerkId) {
      return res.status(403).json({ error: 'Identity mismatch' });
    }

    const trustedUser = resolved.user;
    const userId = trustedUser.id;
    const resolvedEmail = email || trustedUser.email;

    console.log('Agent signup request:', { clerkId: resolved.clerkId, fullName, email: resolvedEmail });

    // Validate required fields
    if (!fullName || !resolvedEmail || !phone || !businessName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!dataConsent) {
      return res.status(400).json({ error: 'Data consent required' });
    }

    // Update user to set user_type as agent
    const { error: updateUserError } = await db
      .from('users')
      .update({
        clerk_id: resolved.clerkId,
        email: resolvedEmail,
        full_name: fullName,
        phone: phone,
        user_type: 'agent',
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


    return res.status(200).json({
      success: true,
      message: 'Application submitted! We will review within 24-48 hours.',
    });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: error.message || 'Signup failed' });
  }
}
