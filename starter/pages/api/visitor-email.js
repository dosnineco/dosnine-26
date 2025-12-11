import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, phone } = req.body;

  if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  try {
    // Insert into visitor_emails table
    const { data, error } = await supabase
      .from('visitor_emails')
      .insert({
        email,
        phone: phone || null,
        user_agent: req.headers['user-agent'] || null,
        ip_address: req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || null,
        referrer: req.headers.referer || null,
        created_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to save email', details: error.message });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Email saved successfully',
      data 
    });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}
