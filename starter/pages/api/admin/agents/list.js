import { supabase } from '@/lib/supabase';

// Get all agents for admin review
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clerkId, status } = req.query;

  if (!clerkId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // SECURITY: Verify user is admin and has valid data
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, role, email, full_name')
      .eq('clerk_id', clerkId)
      .eq('role', 'admin')
      .single();

    if (!adminUser) {
      return res.status(403).json({ error: 'Access denied - Admin only' });
    }

    // SECURITY FIX: Verify admin has valid email and name
    if (!adminUser.email || !adminUser.full_name) {
      console.error('❌ SECURITY: Admin user has NULL data:', adminUser.id);
      return res.status(403).json({ error: 'Access denied - Admin account incomplete' });
    }

    // Build query for agents
    let query = supabase
      .from('agents')
      .select(`
        *,
        user:users!agents_user_id_fkey (
          id,
          email,
          full_name,
          phone,
          clerk_id
        )
      `)
      .order('verification_submitted_at', { ascending: false });

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('verification_status', status);
    }

    const { data: agents, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch agents:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch agents',
        details: error.message,
        hint: error.hint
      });
    }

    if (!agents || agents.length === 0) {
      return res.status(200).json({ agents: [] });
    }

    // Convert storage paths to public URLs
    const agentsWithUrls = agents.map(agent => {
      let licenseUrl = null;
      let registrationUrl = null;

      if (agent.license_file_url) {
        // If it's already a full URL, use it
        if (agent.license_file_url.startsWith('http')) {
          licenseUrl = agent.license_file_url;
        } else {
          // Generate public URL from storage path
          const { data } = supabase.storage
            .from('agent-documents')
            .getPublicUrl(agent.license_file_url);
          licenseUrl = data?.publicUrl || agent.license_file_url;
        }
      }

      if (agent.registration_file_url) {
        if (agent.registration_file_url.startsWith('http')) {
          registrationUrl = agent.registration_file_url;
        } else {
          const { data } = supabase.storage
            .from('agent-documents')
            .getPublicUrl(agent.registration_file_url);
          registrationUrl = data?.publicUrl || agent.registration_file_url;
        }
      }

      return {
        ...agent,
        license_file_url: licenseUrl,
        registration_file_url: registrationUrl,
      };
    });

    return res.status(200).json({ agents: agentsWithUrls });

  } catch (error) {
    console.error('List agents error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
