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
    console.log('🔍 API: Checking admin access for clerkId:', clerkId);

    // SECURITY: Verify user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, role, email')
      .eq('clerk_id', clerkId)
      .eq('role', 'admin')
      .single();

    console.log('👤 Admin check result:', { adminUser, adminError });

    if (!adminUser) {
      console.log('❌ User is not admin');
      return res.status(403).json({ error: 'Access denied - Admin only' });
    }

    console.log('✅ Admin verified:', adminUser.email);

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
      console.log('🔍 Filtering by status:', status);
      query = query.eq('verification_status', status);
    }

    console.log('📊 Querying agents table...');
    const { data: agents, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch agents:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch agents',
        details: error.message,
        hint: error.hint
      });
    }

    console.log('✅ Found agents:', agents?.length || 0);

    if (!agents || agents.length === 0) {
      console.log('⚠️ No agents in database');
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
