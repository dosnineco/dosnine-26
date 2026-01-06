import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clerkId } = req.query;

  if (!clerkId) {
    return res.status(400).json({ error: 'Clerk ID required' });
  }

  try {
    // Fetch user with agent data (if exists)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        agent:agents(*)
      `)
      .eq('clerk_id', clerkId)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        // User doesn't exist yet - create them
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            clerk_id: clerkId,
            role: 'user',
            last_sign_in_at: new Date().toISOString()
          })
          .select(`
            *,
            agent:agents(*)
          `)
          .single();

        if (createError) {
          console.error('Error creating user:', createError);
          return res.status(500).json({ error: 'Failed to create user' });
        }

        return res.status(200).json(newUser);
      }

      console.error('Error fetching user:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    // Update last_sign_in_at timestamp and fetch updated data
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq('clerk_id', clerkId)
      .select(`
        *,
        agent:agents(*)
      `)
      .single();

    // Use updated user data if available, otherwise fall back to original
    const userData = updatedUser || user;

    // Handle agent data structure (could be null, object, or array)
    let agentData = null;
    if (userData.agent) {
      if (Array.isArray(userData.agent)) {
        agentData = userData.agent[0] || null;
      } else {
        agentData = userData.agent;
      }
    }

    // Return user with normalized agent data
    return res.status(200).json({
      ...userData,
      agent: agentData
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
