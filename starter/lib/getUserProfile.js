import { supabase } from './supabase';

export async function getUserProfileByClerkId(clerkId, email) {
  if (!clerkId && !email) return null;

  let userId = null;
  let userData = null;

  // Try clerk_id first
  if (clerkId) {
    const { data, error } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('clerk_id', clerkId)
      .single();
    if (!error && data) {
      userData = data;
      userId = data.id;
    }
  }

  // Fallback to email if needed
  if (!userData && email) {
    const { data, error } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('email', email)
      .single();
    if (!error && data) {
      userData = data;
      userId = data.id;
    }
  }

  if (!userData) return null;

  // If user is an agent, get verification status from agents table
  if (userData.user_type === 'agent' && userId) {
    const { data: agentData } = await supabase
      .from('agents')
      .select('verification_status')
      .eq('user_id', userId)
      .single();

    return {
      ...userData,
      agent_verification_status: agentData?.verification_status || null,
    };
  }

  return userData;
}

