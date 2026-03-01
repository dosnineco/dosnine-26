import { getDbClient, requireAdminUser } from '../../../lib/apiAuth';

export default async function handler(req, res) {
  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const db = getDbClient();

    if (req.method === 'GET') {
      const [{ data: ads, error: adsError }, { data: submissions, error: submissionsError }] = await Promise.all([
        db.from('advertisements').select('*').order('created_at', { ascending: false }),
        db.from('sponsor_submissions').select('*').order('submitted_at', { ascending: false }),
      ]);

      if (adsError) throw adsError;
      if (submissionsError) throw submissionsError;

      return res.status(200).json({
        success: true,
        ads: ads || [],
        submissions: submissions || [],
      });
    }

    if (req.method === 'PATCH') {
      const { id, status } = req.body || {};
      if (!id || !status) {
        return res.status(400).json({ error: 'Missing id or status' });
      }

      const allowedStatuses = ['pending', 'pending_payment', 'approved', 'rejected'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const { data: submission, error: submissionError } = await db
        .from('sponsor_submissions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (submissionError) throw submissionError;
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      const updates = {
        status,
        ...(status === 'approved' ? { verified_at: new Date().toISOString() } : {}),
      };

      const { error } = await db
        .from('sponsor_submissions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      if (status === 'approved') {
        const durationDays = Number(submission?.duration_days) > 0
          ? Number(submission.duration_days)
          : (submission?.plan_id === '30-day' ? 30 : 7);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        const { data: matchingAds, error: adsError } = await db
          .from('advertisements')
          .select('id')
          .eq('company_name', submission.company_name)
          .eq('email', submission.email)
          .order('created_at', { ascending: false })
          .limit(1);

        if (adsError) throw adsError;

        const activePayload = {
          is_active: true,
          is_featured: Boolean(submission?.is_featured),
          expires_at: expiresAt.toISOString(),
          ...(Array.isArray(submission?.image_urls) && submission.image_urls.length > 0
            ? { image_urls: submission.image_urls.slice(0, 3), image_url: submission.image_urls[0] }
            : (submission?.image_url ? { image_url: submission.image_url } : {})),
        };

        if (matchingAds?.[0]?.id) {
          const { error: activateError } = await db
            .from('advertisements')
            .update(activePayload)
            .eq('id', matchingAds[0].id);

          if (activateError) throw activateError;
        }
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin advertisements API error:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Request failed';
    return res.status(500).json({ error: message });
  }
}
