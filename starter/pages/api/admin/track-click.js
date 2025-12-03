import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { path, source, referrer, session_id, user_agent } = req.body;
    
    // Extract IP from headers
    const ip_address = req.headers['x-forwarded-for']?.split(',')[0] || 
                       req.socket.remoteAddress;

    const { data, error } = await supabase
      .from('page_clicks')
      .insert({
        path,
        source,
        referrer,
        session_id,
        user_agent,
        ip_address,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('Track click error:', err);
    return res.status(500).json({ error: 'Failed to track click', details: err.message });
  }
}
