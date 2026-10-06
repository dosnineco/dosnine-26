import { getDbClient, requireAdminUser } from '../../../lib/apiAuth';
import { sendBrevoEmail } from '../../../lib/serviceRequestAllocation';

export default async function handler(req, res) {
  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const db = getDbClient();

    if (req.method === 'GET') {
      const { data, error } = await db
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        users: data || [],
      });
    }

    if (req.method === 'PATCH') {
      const {
        id,
        full_name,
        email,
        phone,
        role,
        account_type,
        profile_intent,
        is_admin,
        account_status,
        id_verification_status,
        premium_service_request,
        premium_service_request_expires,
      } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: 'Missing user id' });
      }

      if (
        account_type !== undefined &&
        !['regular', 'advertiser', 'agent'].includes(account_type)
      ) {
        return res.status(400).json({ error: 'Invalid account type' });
      }
      if (
        account_type === 'regular' &&
        !['homeowner', 'tenant'].includes(profile_intent)
      ) {
        return res.status(400).json({ error: 'Invalid regular account profile' });
      }
      if (
        account_type &&
        account_type !== 'regular' &&
        profile_intent != null
      ) {
        return res.status(400).json({ error: 'Only regular accounts can have a profile intent' });
      }
      if (is_admin !== undefined && typeof is_admin !== 'boolean') {
        return res.status(400).json({ error: 'Admin access must be true or false' });
      }

      const updatePayload = {
        ...(full_name ? { full_name } : {}),
        ...(email ? { email } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(is_admin !== undefined ? { role: is_admin ? 'admin' : 'user' } : {}),
        ...(is_admin === undefined && role ? { role } : {}),
        ...(account_type !== undefined
          ? {
              account_type,
              profile_intent: account_type === 'regular' ? profile_intent : null,
              user_type: account_type === 'agent' ? 'agent' : 'landlord',
            }
          : {}),
        ...(account_status ? { account_status } : {}),
        ...(id_verification_status ? {
          id_verification_status,
          identity_verified: id_verification_status === 'approved',
        } : {}),
        ...(premium_service_request !== undefined ? { premium_service_request: Boolean(premium_service_request) } : {}),
        ...(premium_service_request_expires !== undefined
          ? { premium_service_request_expires: premium_service_request_expires || null }
          : {}),
      };

      if (Object.keys(updatePayload).length === 0) {
        return res.status(400).json({ error: 'No update fields provided' });
      }

      const { data, error } = await db
        .from('users')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      let rejectionEmailSent = false;
      if (id_verification_status === 'rejected' && data?.email) {
        try {
          await sendBrevoEmail({
            to: data.email,
            subject: 'Your Dosnine ID verification was rejected',
            htmlContent: `<p>Hello${data.full_name ? ` ${data.full_name}` : ''},</p><p>Your ID verification submission was rejected. Please review your documents and submit them again if needed.</p><p>Regards,<br />Dosnine</p>`,
            textContent: `Hello${data.full_name ? ` ${data.full_name}` : ''},\n\nYour ID verification submission was rejected. Please review your documents and submit them again if needed.\n\nRegards,\nDosnine`,
          });
          rejectionEmailSent = true;
        } catch (emailError) {
          console.error('Failed to send ID verification rejection email:', emailError);
        }
      }

      return res.status(200).json({
        success: true,
        user: data,
        rejectionEmailSent,
      });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: 'Missing user id' });
      }

      if (id === resolved.user.id) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
      }

      const { error } = await db
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in admin users API:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Request failed';
    return res.status(500).json({ error: message });
  }
}
