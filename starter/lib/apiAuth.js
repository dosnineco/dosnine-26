import { getAuth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export function getDbClient() {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing or not loaded. Restart server after updating env vars.');
}

export function getClerkUserId(req) {
  const auth = getAuth(req);
  return auth?.userId || null;
}

export function getClerkUserContext(req) {
  const auth = getAuth(req);
  const sessionClaims = auth?.sessionClaims || {};

  const email = typeof sessionClaims.email === 'string' ? sessionClaims.email : null;
  const firstName = typeof sessionClaims.first_name === 'string' ? sessionClaims.first_name : '';
  const lastName = typeof sessionClaims.last_name === 'string' ? sessionClaims.last_name : '';
  const fullName = `${firstName} ${lastName}`.trim() || null;

  return {
    clerkId: auth?.userId || null,
    email,
    fullName,
  };
}

export async function requireClerkUser(req, res) {
  const context = getClerkUserContext(req);
  if (!context.clerkId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  return context;
}

export async function getDbUserByClerkId(clerkId, { createIfMissing = false, fallbackEmail = null, fallbackFullName = null } = {}) {
  const db = getDbClient();

  const { data: existingUsers, error: userError } = await db
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .limit(1);

  const existingUser = Array.isArray(existingUsers) ? existingUsers[0] : null;

  if (existingUser?.id) {
    return { user: existingUser, error: null };
  }

  if (userError) {
    return { user: null, error: userError || null };
  }

  if (fallbackEmail) {
    const { data: emailUsers, error: emailLookupError } = await db
      .from('users')
      .select('*')
      .eq('email', fallbackEmail)
      .limit(1);

    if (emailLookupError) {
      return { user: null, error: emailLookupError };
    }

    const emailUser = Array.isArray(emailUsers) ? emailUsers[0] : null;

    if (emailUser?.id) {
      const { error: linkError } = await db
        .from('users')
        .update({
          clerk_id: clerkId,
          full_name: emailUser.full_name || fallbackFullName || 'Dosnine User',
        })
        .eq('id', emailUser.id);

      if (linkError) {
        return { user: null, error: linkError };
      }

      const { data: linkedUsers, error: linkedError } = await db
        .from('users')
        .select('*')
        .eq('id', emailUser.id)
        .limit(1);

      const linkedUser = Array.isArray(linkedUsers) ? linkedUsers[0] : null;
      if (linkedUser?.id) {
        return { user: linkedUser, error: null };
      }

      return { user: null, error: linkedError || null };
    }
  }

  if (!createIfMissing) {
    return { user: null, error: null };
  }

  const bootstrapUser = {
    clerk_id: clerkId,
    email: fallbackEmail || `${clerkId}@placeholder.dosnine.local`,
    full_name: fallbackFullName || 'Dosnine User',
    user_type: 'landlord',
  };

  const { error: insertError } = await db
    .from('users')
    .insert([bootstrapUser]);

  if (insertError) {
    const minimalBootstrapUser = {
      clerk_id: clerkId,
      email: fallbackEmail || `${clerkId}@placeholder.dosnine.local`,
      full_name: fallbackFullName || 'Dosnine User',
    };

    await db
      .from('users')
      .insert([minimalBootstrapUser]);
  }

  const { data: createdUsers, error: createdError } = await db
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .limit(1);

  const createdUser = Array.isArray(createdUsers) ? createdUsers[0] : null;

  if (createdUser?.id) {
    return { user: createdUser, error: null };
  }

  return { user: null, error: createdError || insertError || null };
}

export async function requireDbUser(req, res, { createIfMissing = false } = {}) {
  const auth = await requireClerkUser(req, res);
  if (!auth) return null;

  const { user, error } = await getDbUserByClerkId(auth.clerkId, {
    createIfMissing,
    fallbackEmail: auth.email,
    fallbackFullName: auth.fullName,
  });

  if (error) {
    console.error('requireDbUser error:', error);
    const message =
      error?.message ||
      error?.details ||
      error?.hint ||
      'Failed to resolve user profile';
    res.status(500).json({ error: message });
    return null;
  }

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }

  return { clerkId: auth.clerkId, user };
}

export async function requireAdminUser(req, res) {
  const resolved = await requireDbUser(req, res);
  if (!resolved) return null;

  if (resolved.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  return resolved;
}
