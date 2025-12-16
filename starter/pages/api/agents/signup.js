import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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

    console.log('Agent signup request:', { clerkId, fullName, email });

    // Validate required fields
    if (!fullName || !email || !phone || !businessName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!dataConsent) {
      return res.status(400).json({ error: 'Data consent required' });
    }

    // Get or create user (same as new-property)
    let userRecord = null;
    
    if (clerkId) {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkId)
        .single();
      userRecord = data;
    }

    if (!userRecord && email) {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
      userRecord = data;
    }

    // Create user if doesn't exist
    if (!userRecord) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{ 
          clerk_id: clerkId, 
          email, 
          full_name: fullName, 
          phone 
        }])
        .select('id')
        .single();

      if (createError) {
        console.error('User create error:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }
      userRecord = newUser;
    }

    const userId = userRecord.id;

    // Update user to set user_type as agent
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
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
      service_areas: serviceAreas || '',
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
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', userId)
      .single();

    let agentError;
    if (existingAgent) {
      // Update existing agent
      const { error } = await supabase
        .from('agents')
        .update(agentData)
        .eq('user_id', userId);
      agentError = error;
    } else {
      // Insert new agent
      const { error } = await supabase
        .from('agents')
        .insert([agentData]);
      agentError = error;
    }

    if (agentError) {
      console.error('Failed to insert/update agent:', agentError);
      return res.status(500).json({ error: 'Failed to create agent profile' });
    }

    console.log('Agent signup complete:', userId);

    return res.status(200).json({
      success: true,
      message: 'Application submitted! We will review within 24-48 hours.',
    });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: error.message || 'Signup failed' });
  }
}
