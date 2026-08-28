import { getDbClient, requireDbUser } from '../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res, {
      createIfMissing: true,
    });

    if (!resolved) return;

    const db = getDbClient();
    const clerkId = resolved.clerkId;

    /*
     * ============================================================
     * FIND USER
     * ============================================================
     *
     * Only retrieve fields required to validate access.
     */
    const { data: user, error: userError } = await db
      .from('users')
      .select(`
        id,
        clerk_id,
        role,
        user_type,
        account_type,
        account_status,
        identity_verified,
        id_verification_status
      `)
      .eq('clerk_id', clerkId)
      .maybeSingle();

    if (userError) {
      console.error('Failed to find user:', userError);

      return res.status(500).json({
        error: 'Failed to validate account',
      });
    }

    /*
     * User must exist in public.users.
     */
    if (!user) {
      return res.status(403).json({
        error: 'Account not found.',
        code: 'ACCOUNT_NOT_FOUND',
      });
    }

    /*
     * ============================================================
     * ACCOUNT STATUS
     * ============================================================
     */

    const accountStatus = String(
      user.account_status || 'active'
    ).trim().toLowerCase();

    const verificationStatus = String(
      user.id_verification_status || 'unverified'
    ).trim().toLowerCase();

    /*
     * ============================================================
     * ACCOUNT RESTRICTION CHECK
     * ============================================================
     *
     * account_status is NOT NULL and defaults to "active".
     *
     * Any of these statuses blocks private access.
     */
    const isRestricted =
      accountStatus === 'flagged' ||
      accountStatus === 'suspended' ||
      accountStatus === 'blocked';

    if (isRestricted) {
      return res.status(403).json({
        valid: false,
        error: 'Your account is currently restricted.',
        code: 'ACCOUNT_RESTRICTED',
        account_status: accountStatus,
      });
    }

    /*
     * ============================================================
     * IDENTITY VERIFICATION CHECK
     * ============================================================
     */

    const isAdmin =
      user.role === 'admin' ||
      user.user_type === 'admin' ||
      user.account_type === 'admin';

    const isVerified =
      user.identity_verified === true ||
      verificationStatus === 'approved';

    /*
     * Admin accounts can bypass identity verification.
     * They cannot bypass account restrictions above.
     */
    if (!isAdmin && !isVerified) {
      return res.status(403).json({
        valid: false,
        error: 'Identity verification is required before accessing your account.',
        code: 'IDENTITY_VERIFICATION_REQUIRED',
        verification_status: verificationStatus,
      });
    }

    /*
     * ============================================================
     * VALID
     * ============================================================
     *
     * Return only authorization information.
     */
    return res.status(200).json({
      valid: true,
      user: {
        id: user.id,
        clerk_id: user.clerk_id,
        role: user.role,
        user_type: user.user_type,
        account_type: user.account_type,
        account_status: user.account_status,
        identity_verified: user.identity_verified,
        id_verification_status: user.id_verification_status,
      },
    });

  } catch (error) {
    console.error('Server error:', error);

    return res.status(500).json({
      error: 'Server error',
    });
  }
}