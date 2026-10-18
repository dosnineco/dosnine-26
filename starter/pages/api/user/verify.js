import { getDbClient, requireDbUser } from '@/lib/apiAuth';

export const config = {
  api: {
    bodyParser: false,
  },
};

function getMultipartValue(fields, key) {
  const value = fields?.[key];
  if (Array.isArray(value)) return value[0];
  return value || '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const formidable = await import('formidable');
    const form = formidable.formidable({
      multiples: false,
      maxFileSize: 5 * 1024 * 1024,
      keepExtensions: true,
    });

    const files = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const db = getDbClient();
    const sessionToken = String(getMultipartValue(files.fields, 'sessionToken') || '').trim();
    let resolved;
    let session;

    if (sessionToken) {
      const { data, error } = await db
        .from('verification_sessions')
        .select('id, user_clerk_id, context_id, verification_type, metadata, status, expires_at')
        .eq('token', sessionToken)
        .maybeSingle();

      if (error) throw error;
      if (!data || data.verification_type !== 'identity') {
        return res.status(404).json({ error: 'Verification session not found.' });
      }
      if (!['pending', 'mobile_opened'].includes(data.status)) {
        return res.status(409).json({ error: 'This verification session is no longer active.' });
      }
      if (new Date(data.expires_at) <= new Date()) {
        return res.status(410).json({ error: 'This verification session has expired.' });
      }
      if (data.context_id && data.context_id !== data.user_clerk_id) {
        return res.status(403).json({ error: 'This verification session is invalid.' });
      }

      const { data: user, error: userError } = await db
        .from('users')
        .select('*')
        .eq('clerk_id', data.user_clerk_id)
        .maybeSingle();
      if (userError) throw userError;
      if (!user) return res.status(404).json({ error: 'User profile not found.' });
      if (['deactivated', 'flagged'].includes(String(user.account_status || '').toLowerCase())) {
        return res.status(403).json({ error: 'This account cannot submit verification.' });
      }

      resolved = { clerkId: data.user_clerk_id, user };
      session = data;
    } else {
      resolved = await requireDbUser(req, res, { createIfMissing: true });
      if (!resolved) return;
    }

    const requestedRole = String(getMultipartValue(files.fields, 'role') || '').toLowerCase();
    const role = session
      ? String(session.metadata?.role || requestedRole || 'homeowner').toLowerCase()
      : (requestedRole || 'homeowner');
    if (session && requestedRole && requestedRole !== role) {
      return res.status(400).json({ error: 'The account type does not match this verification session.' });
    }
    const fullName = String(getMultipartValue(files.fields, 'fullName') || session?.metadata?.fullName || '').trim();
    const phone = String(getMultipartValue(files.fields, 'phone') || session?.metadata?.phone || '').trim();
    const idNumber = String(getMultipartValue(files.fields, 'idNumber') || '').trim();
    const consent = String(getMultipartValue(files.fields, 'consent') || 'false') === 'true';
    const accountType = role === 'agent'
      ? 'agent'
      : role === 'advertiser'
        ? 'advertiser'
        : 'regular';
    const profileIntent = ['homeowner', 'tenant'].includes(role) ? role : null;

    if (!['homeowner', 'tenant', 'advertiser', 'agent'].includes(role)) {
      return res.status(400).json({ error: 'Choose a valid account type.' });
    }
    if (resolved.user.account_type && resolved.user.account_type !== accountType) {
      return res.status(409).json({ error: 'This verification does not match your saved account type.' });
    }

    if (!fullName || !phone || !idNumber || !consent) {
      return res.status(400).json({ error: 'Please complete all required identity details.' });
    }

    const frontFile = Array.isArray(files.files?.frontFile) ? files.files.frontFile[0] : files.files?.frontFile;
    const backFile = Array.isArray(files.files?.backFile) ? files.files.backFile[0] : files.files?.backFile;
    if (!frontFile || !backFile) {
      return res.status(400).json({ error: 'Please upload both sides of your Jamaican ID.' });
    }
    const allowedTypes = new Set(['image/jpeg', 'image/png']);
    if (!allowedTypes.has(frontFile.mimetype) || !allowedTypes.has(backFile.mimetype)) {
      return res.status(400).json({ error: 'ID photos must be JPG or PNG images.' });
    }
    const extension = (file) => file.mimetype === 'image/png' ? 'png' : 'jpg';
    const timestamp = Date.now();
    const frontName = `verification/${resolved.user.id}/jamaican-id-front-${timestamp}.${extension(frontFile)}`;
    const backName = `verification/${resolved.user.id}/jamaican-id-back-${timestamp}.${extension(backFile)}`;

    const { data: frontUpload, error: frontError } = await db.storage
      .from('agent-documents')
      .upload(frontName, await import('fs/promises').then((m) => m.readFile(frontFile.filepath)), {
        upsert: true,
        contentType: frontFile.mimetype || 'image/png',
      });

    if (frontError) throw frontError;

    const { data: backUpload, error: backError } = await db.storage
      .from('agent-documents')
      .upload(backName, await import('fs/promises').then((m) => m.readFile(backFile.filepath)), {
        upsert: true,
        contentType: backFile.mimetype || 'image/png',
      });

    if (backError) throw backError;

    const updateFields = {
      full_name: fullName,
      phone,
      account_type: accountType,
      profile_intent: profileIntent,
      identity_verified: false,
      id_verification_status: 'pending',
      jamaican_id_number: idNumber,
      verification_role: role,
      verification_front_url: frontUpload?.path || frontName,
      verification_back_url: backUpload?.path || backName,
    };

    const { error: updateError } = await db
      .from('users')
      .update(updateFields)
      .eq('id', resolved.user.id);
    if (updateError) throw updateError;

    if (session) {
      const { data: completedSession, error: completionError } = await db
        .from('verification_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', session.id)
        .in('status', ['pending', 'mobile_opened'])
        .select('id')
        .maybeSingle();

      if (completionError) throw completionError;
      if (!completedSession) {
        return res.status(409).json({ error: 'This verification session has already been used.' });
      }
    }

    return res.status(200).json({ success: true, message: 'Verification submitted for review.' });
  } catch (error) {
    console.error('identity verification error:', error);
    return res.status(500).json({ error: error.message || 'Verification failed' });
  }
}
