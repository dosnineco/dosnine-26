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
    const resolved = await requireDbUser(req, res, { createIfMissing: true });
    if (!resolved) return;

    const db = getDbClient();
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

    const role = String(getMultipartValue(files.fields, 'role') || 'homeowner').toLowerCase();
    const fullName = String(getMultipartValue(files.fields, 'fullName') || '').trim();
    const phone = String(getMultipartValue(files.fields, 'phone') || '').trim();
    const idNumber = String(getMultipartValue(files.fields, 'idNumber') || '').trim();
    const consent = String(getMultipartValue(files.fields, 'consent') || 'false') === 'true';

    if (!fullName || !phone || !idNumber || !consent) {
      return res.status(400).json({ error: 'Please complete all required identity details.' });
    }

    const frontFile = Array.isArray(files.files?.frontFile) ? files.files.frontFile[0] : files.files?.frontFile;
    const backFile = Array.isArray(files.files?.backFile) ? files.files.backFile[0] : files.files?.backFile;
    const agentIdFile = Array.isArray(files.files?.agentIdFile) ? files.files.agentIdFile[0] : files.files?.agentIdFile;

    if (!frontFile || !backFile) {
      return res.status(400).json({ error: 'Please upload both sides of your Jamaican ID.' });
    }
    if (role === 'agent' && !agentIdFile) {
      return res.status(400).json({ error: 'Please upload your agent license or agent ID.' });
    }

    const frontName = `verification/${resolved.user.id}/jamaican-id-front-${Date.now()}.png`;
    const backName = `verification/${resolved.user.id}/jamaican-id-back-${Date.now()}.png`;

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

    let agentIdUpload = null;
    if (agentIdFile) {
      const agentIdName = `verification/${resolved.user.id}/agent-id-${Date.now()}.png`;
      const { data, error: agentIdError } = await db.storage
        .from('agent-documents')
        .upload(agentIdName, await import('fs/promises').then((m) => m.readFile(agentIdFile.filepath)), {
          upsert: true,
          contentType: agentIdFile.mimetype || 'image/png',
        });
      if (agentIdError) throw agentIdError;
      agentIdUpload = { path: data?.path || agentIdName };
    }

    const updateFields = {
      full_name: fullName,
      phone,
      identity_verified: false,
      id_verification_status: 'pending',
      jamaican_id_number: idNumber,
      verification_role: role,
      verification_front_url: frontUpload?.path || frontName,
      verification_back_url: backUpload?.path || backName,
      ...(agentIdUpload ? { verification_agent_id_url: agentIdUpload.path } : {}),
    };

    // Retry without any column missing from the DB schema cache (e.g. before migrations run)
    for (let attempt = 0; attempt < Object.keys(updateFields).length; attempt++) {
      const { error: updateError } = await db.from('users').update(updateFields).eq('id', resolved.user.id);
      if (!updateError) break;

      const missingColumn = updateError.code === 'PGRST204'
        ? updateError.message?.match(/'([^']+)' column/)?.[1]
        : null;

      if (!missingColumn || !(missingColumn in updateFields)) throw updateError;

      console.warn(`identity verification: skipping missing column '${missingColumn}' (run pending migrations)`);
      delete updateFields[missingColumn];
    }

    return res.status(200).json({ success: true, message: 'Verification submitted for review.' });
  } catch (error) {
    console.error('identity verification error:', error);
    return res.status(500).json({ error: error.message || 'Verification failed' });
  }
}
