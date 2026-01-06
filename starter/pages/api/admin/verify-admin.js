import { supabase } from '@/lib/supabase';

// SECURITY: Check if user is admin with proper validation
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clerkId, email } = req.query;

  // SECURITY FIX: Require at least one identifier
  if (!clerkId && !email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Check user role and validate data integrity
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

    // SECURITY FIX: Verify user has valid data (not NULL)
    if (error || !data) {
      return res.status(403).json({ error: 'Access denied - Admin only' });
    }

    // SECURITY FIX: Verify admin user has valid email and name
    if (!data.email || !data.full_name) {
      console.error('❌ SECURITY: Admin user has NULL email or name:', data.id);
      return res.status(403).json({ error: 'Access denied - Admin account incomplete' });
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
