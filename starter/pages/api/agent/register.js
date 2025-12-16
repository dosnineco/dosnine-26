import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      clerkId,
      full_name,
      email,
      phone,
      company_name,
      license_number,
      years_experience,
      specialization,
      bio
    } = req.body;

    if (!clerkId || !full_name || !email || !phone || !license_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get or create user
    let userId;
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([{
          clerk_id: clerkId,
          full_name,
          email,
          role: 'user'
        }])
        .select()
        .single();

      if (userError) throw userError;
      userId = newUser.id;
    }

    // Check if agent already exists
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('id, verification_status')
      .eq('user_id', userId)
      .single();

    let agentId;

    if (existingAgent) {
      // Update existing agent (resubmission)
      const { data: updatedAgent, error: updateError } = await supabase
        .from('agents')
        .update({
          full_name,
          email,
          phone,
          company_name,
          license_number,
          years_experience: parseInt(years_experience),
          specialization,
          bio,
          verification_status: 'pending',
          submitted_at: new Date().toISOString()
        })
        .eq('id', existingAgent.id)
        .select()
        .single();

      if (updateError) throw updateError;
      agentId = updatedAgent.id;
    } else {
      // Create new agent
      const { data: newAgent, error: agentError } = await supabase
        .from('agents')
        .insert([{
          user_id: userId,
          full_name,
          email,
          phone,
          company_name,
          license_number,
          years_experience: parseInt(years_experience),
          specialization,
          bio,
          verification_status: 'pending',
          payment_status: 'unpaid'
        }])
        .select()
        .single();

      if (agentError) throw agentError;
      agentId = newAgent.id;
    }

    return res.status(200).json({ 
      success: true, 
      agentId,
      message: existingAgent ? 'Application resubmitted successfully' : 'Application submitted successfully'
    });

  } catch (error) {
    console.error('Agent registration error:', error);
    return res.status(500).json({ error: 'Failed to register agent' });
  }
}
