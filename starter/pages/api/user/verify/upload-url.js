import { getDbClient } from '@/lib/apiAuth';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionToken, side, mimeType, fileSize } = req.body || {};
  if (
    typeof sessionToken !== 'string' ||
    !sessionToken ||
    !['front', 'back'].includes(side) ||
    !ALLOWED_MIME_TYPES.has(mimeType) ||
    !Number.isInteger(fileSize) ||
    fileSize <= 0 ||
    fileSize > MAX_FILE_SIZE
  ) {
    return res.status(400).json({ error: 'Choose a JPG or PNG ID photo up to 5 MB.' });
  }

  try {
    const db = getDbClient();
    const { data: session, error: sessionError } = await db
      .from('verification_sessions')
      .select('id, user_clerk_id, verification_type, status, expires_at')
      .eq('token', sessionToken)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session || session.verification_type !== 'identity') {
      return res.status(404).json({ error: 'Verification session not found.' });
    }
    if (!['pending', 'mobile_opened'].includes(session.status)) {
      return res.status(409).json({ error: 'This verification session is no longer active.' });
    }
    if (new Date(session.expires_at) <= new Date()) {
      return res.status(410).json({ error: 'This verification session has expired.' });
    }

    const { data: user, error: userError } = await db
      .from('users')
      .select('id, account_status')
      .eq('clerk_id', session.user_clerk_id)
      .maybeSingle();
    if (userError) throw userError;
    if (!user) return res.status(404).json({ error: 'User profile not found.' });
    if (['deactivated', 'flagged'].includes(String(user.account_status || '').toLowerCase())) {
      return res.status(403).json({ error: 'This account cannot submit verification.' });
    }

    const path = `verification/${user.id}/sessions/${session.id}/${side}`;
    const { data, error } = await db.storage
      .from('agent-documents')
      .createSignedUploadUrl(path, { upsert: true });

    if (error) throw error;
    return res.status(200).json({
      success: true,
      path,
      uploadToken: data.token,
    });
  } catch (error) {
    console.error('Identity document upload URL creation failed:', error);
    return res.status(500).json({ error: 'Unable to prepare document upload.' });
  }
}
