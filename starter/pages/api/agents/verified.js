import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get verified agents
    try {
      const { data: agents, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_type', 'agent')
        .eq('agent_verification_status', 'approved')
        .eq('agent_verified', true)
        .order('agent_years_experience', { ascending: false });

      if (error) {
        console.error('Error fetching agents:', error);
        return res.status(500).json({ error: 'Failed to fetch agents' });
      }

      return res.status(200).json({
        success: true,
        agents: agents || [],
      });
    } catch (error) {
      console.error('Verified agents error:', error);
      return res.status(500).json({ error: 'Failed to fetch agents' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
