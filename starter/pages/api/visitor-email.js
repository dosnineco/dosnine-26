import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, phone, intent, page, source, user_agent, referrer } = req.body;

  if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  if (intent && !['buy', 'sell', 'rent'].includes(intent)) {
    return res.status(400).json({ error: 'Invalid intent. Must be: buy, sell, or rent' });
  }

  try {
    // Insert into visitor_emails table using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('visitor_emails')
      .insert({
        email,
        phone: phone || null,
        intent: intent || null,
        page: page || null,
        source: source || null,
        user_agent: user_agent || req.headers['user-agent'] || null,
        ip_address: req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || null,
        referrer: referrer || req.headers.referer || null,
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
