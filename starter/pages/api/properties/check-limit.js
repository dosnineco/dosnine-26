import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clerkId } = req.query;

    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID required' });
    }

    // Get user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, property_count')
      .eq('clerk_id', clerkId)
      .single();

    // If user doesn't exist yet, they can post their first property
    if (userError || !userData) {
      return res.status(200).json({ 
        canPost: true,
        isAgent: false,
        propertyCount: 0,
        maxProperties: 2,
        isNewUser: true
      });
    }

    // Check if user is an agent
    const { data: agentData } = await supabase
      .from('agents')
      .select('verification_status, payment_status')
      .eq('user_id', userData.id)
      .single();

    // If agent, check verification and payment
    if (agentData) {
      if (agentData.verification_status !== 'approved') {
        return res.status(403).json({ 
          error: 'Agent not verified',
          canPost: false,
          reason: 'verification_required'
        });
      }
      
      if (agentData.payment_status !== 'paid') {
        return res.status(403).json({ 
          error: 'Payment required',
          canPost: false,
          reason: 'payment_required'
        });
      }

      // Verified and paid agents can post unlimited properties
      return res.status(200).json({ 
        canPost: true,
        isAgent: true,
        unlimited: true
      });
    }

    // Regular users - check property limit (max 2)
    if (userData.property_count >= 2) {
      return res.status(403).json({ 
        error: 'Property limit reached',
        canPost: false,
        reason: 'limit_reached',
        propertyCount: userData.property_count,
        maxProperties: 2
      });
    }

    return res.status(200).json({ 
      canPost: true,
      isAgent: false,
      propertyCount: userData.property_count,
      maxProperties: 2
    });

  } catch (error) {
    console.error('Check property limit error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
