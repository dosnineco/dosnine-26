import { supabase } from '@/lib/supabase';

// Security: Check if user is admin
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clerkId, email } = req.query;

  if (!clerkId && !email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Check user role
    let query = supabase
      .from('users')
      .select('id, role, email, full_name')
      .eq('role', 'admin');

    if (clerkId) {
      query = query.eq('clerk_id', clerkId);
    } else if (email) {
      query = query.eq('email', email);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return res.status(403).json({ error: 'Access denied - Admin only' });
    }

    return res.status(200).json({ 
      isAdmin: true,
      userId: data.id,
      email: data.email,
      name: data.full_name 
    });

  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }
}
