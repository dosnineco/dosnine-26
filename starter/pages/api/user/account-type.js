import { getDbClient, requireDbUser } from '../../../lib/apiAuth';

const ACCOUNT_TYPES = new Set(['regular', 'advertiser', 'agent']);
const PROFILE_INTENTS = new Set(['homeowner', 'tenant']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res, { createIfMissing: true });
    if (!resolved) return;

    const accountType = String(req.body?.accountType || '').trim().toLowerCase();
    const profileIntent = req.body?.profileIntent
      ? String(req.body.profileIntent).trim().toLowerCase()
      : null;

    if (!ACCOUNT_TYPES.has(accountType)) {
      return res.status(400).json({ error: 'Choose a valid account type.' });
    }
    if (
      (accountType === 'regular' && !PROFILE_INTENTS.has(profileIntent)) ||
      (accountType !== 'regular' && profileIntent)
    ) {
      return res.status(400).json({ error: 'Choose a valid profile type for this account.' });
    }

    const db = getDbClient();
    const existingType = resolved.user?.account_type;
    if (existingType && existingType !== accountType) {
      return res.status(409).json({ error: 'Your account type has already been set.' });
    }
    if (
      existingType === 'regular' &&
      resolved.user?.profile_intent &&
      resolved.user.profile_intent !== profileIntent
    ) {
      return res.status(409).json({ error: 'Your regular account profile has already been set.' });
    }

    const updates = {
      account_type: accountType,
      profile_intent: accountType === 'regular' ? profileIntent : null,
    };
    if (accountType === 'agent') updates.user_type = 'agent';
    else if (resolved.user?.user_type === 'agent') updates.user_type = 'landlord';

    const { data, error } = await db
      .from('users')
      .update(updates)
      .eq('id', resolved.user.id)
      .select('account_type, profile_intent, role, identity_verified, id_verification_status, account_status')
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, user: data });
  } catch (error) {
    console.error('Account type update failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to save account type.' });
  }
}
