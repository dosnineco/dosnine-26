import { getDbClient, requireDbUser } from '../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res, { createIfMissing: true });
    if (!resolved) return;

    const db = getDbClient();
    const userData = resolved.user || {};
    const isAdmin = userData.role === 'admin';
    const accountType = userData.account_type ||
      (userData.user_type === 'agent' ? 'agent' : null);

    if (!accountType) {
      return res.status(200).json({
        success: true,
        needsAccountTypeSelection: true,
        user: {
          id: userData.id,
          role: userData.role || 'user',
        },
      });
    }

    const identityVerified = Boolean(
      userData.identity_verified ||
      userData.id_verification_status === 'approved'
    );
    if (
      !isAdmin &&
      (!identityVerified || ['flagged', 'deactivated'].includes(userData.account_status))
    ) {
      return res.status(403).json({ error: 'Identity verification is required to view your dashboard.' });
    }

    if (accountType === 'advertiser') {
      const [
        { data: adsRaw, error: adsError },
        { data: submissionsRaw, error: submissionsError },
        { data: inquiriesRaw, error: inquiriesError },
      ] = await Promise.all([
        db
          .from('advertisements')
          .select('id, title, company_name, category, description, phone, email, website, image_url, image_urls, is_active, is_featured, impressions, clicks, expires_at, created_at, updated_at, created_by_clerk_id')
          .eq('created_by_clerk_id', resolved.clerkId)
          .order('created_at', { ascending: false }),
        db
          .from('sponsor_submissions')
          .select('id, company_name, status, payment_status, submitted_at, verified_at, scheduled_month, plan_id, plan_name, amount, duration_days, payment_receipt_submitted_at')
          .eq('created_by_clerk_id', resolved.clerkId)
          .order('submitted_at', { ascending: false }),
        db
          .from('advertisement_inquiries')
          .select('id, client_name, client_email, client_phone, message, status, created_at, advertisements(title, company_name)')
          .eq('advertiser_id', userData.id)
          .order('created_at', { ascending: false }),
      ]);

      if (adsError) throw adsError;
      if (submissionsError) throw submissionsError;
      if (inquiriesError) throw inquiriesError;

      const advertisements = adsRaw || [];
      const submissions = submissionsRaw || [];
      const adInquiries = inquiriesRaw || [];
      const verifiedCompanies = new Set(
        submissions
          .filter((submission) => String(submission.status || '').toLowerCase() === 'approved')
          .map((submission) =>
            `${String(submission.company_name || '').trim().toLowerCase()}`
          )
      );
      const verifiedAdvertisements = advertisements.filter((ad) =>
        ad.is_active && verifiedCompanies.has(String(ad.company_name || '').trim().toLowerCase())
      );

      return res.status(200).json({
        success: true,
        user: {
          id: userData.id,
          user_type: userData.user_type || 'landlord',
          account_type: accountType,
          profile_intent: userData.profile_intent || null,
          role: userData.role || 'user',
          identity_verified: Boolean(userData.identity_verified),
          id_verification_status: userData.id_verification_status || null,
          account_status: userData.account_status || null,
        },
        adStats: {
          totalAds: advertisements.length,
          activeAds: advertisements.filter((ad) => ad.is_active).length,
          totalViews: advertisements.reduce((sum, ad) => sum + Number(ad.impressions || 0), 0),
          totalClicks: advertisements.reduce((sum, ad) => sum + Number(ad.clicks || 0), 0),
          verifiedAds: verifiedAdvertisements.length,
          pendingAds: advertisements.filter((ad) => !ad.is_active).length +
            submissions.filter((submission) =>
              ['pending', 'pending_payment', 'submitted', 'under_review', 'processing']
                .includes(String(submission.status || '').toLowerCase())
            ).length,
        },
        advertisements,
        verifiedAdvertisements,
        sponsorSubmissions: submissions,
        adInquiries,
      });
    }

    try {
      await db.rpc('refresh_expired_advertisements');
    } catch (error) {
      console.warn('refresh_expired_advertisements RPC not available yet');
    }

    let agentData = null;
    const { data: agent } = await db
      .from('agents')
      .select('verification_status, payment_status, access_expiry, verification_submitted_at, created_at, rejection_reason')
      .eq('user_id', userData.id)
      .maybeSingle();

    agentData = agent || null;

    const { data: propertiesRaw, error: propertiesError } = await db
      .from('properties')
      .select('*')
      .eq('owner_id', userData.id)
      .order('created_at', { ascending: false });

    if (propertiesError) {
      throw propertiesError;
    }

    const properties = propertiesRaw || [];
    const activeListings = properties.filter((property) => property.status === 'available').length;

    let applicationsCount = 0;
    const propertyIds = properties.map((property) => property.id).filter(Boolean);

    if (propertyIds.length > 0) {
      const { count } = await db
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .in('property_id', propertyIds);

      applicationsCount = Number(count || 0);
    }

    let serviceRequests = [];
    const { data: requests, error: requestsError } = await db
      .from('service_requests')
      .select('*')
      .eq('client_user_id', userData.id)
      .order('created_at', { ascending: false });

    if (!requestsError && Array.isArray(requests)) {
      serviceRequests = requests;
    }

    let adInquiries = [];
    let ads = [];
    let submissions = [];

    if (accountType === 'agent') {
      const { data: adInquiriesRaw, error: adInquiriesError } = await db
        .from('advertisement_inquiries')
        .select('id, client_name, client_email, client_phone, message, status, created_at, advertisements(title, company_name)')
        .eq('advertiser_id', userData.id)
        .order('created_at', { ascending: false });

      if (adInquiriesError) throw adInquiriesError;
      adInquiries = Array.isArray(adInquiriesRaw) ? adInquiriesRaw : [];

      const { data: adsRaw, error: adsError } = await db
        .from('advertisements')
        .select('id, title, company_name, category, is_active, is_featured, impressions, clicks, expires_at, created_at, updated_at, created_by_clerk_id, email')
        .eq('created_by_clerk_id', resolved.clerkId)
        .order('created_at', { ascending: false });
      if (adsError) throw adsError;
      ads = Array.isArray(adsRaw) ? adsRaw : [];

      const { data: submissionsRaw, error: submissionsError } = await db
        .from('sponsor_submissions')
        .select('id, company_name, status, submitted_at, verified_at, plan_id, plan_name, amount, duration_days, created_by_clerk_id, email')
        .eq('created_by_clerk_id', resolved.clerkId)
        .order('submitted_at', { ascending: false });
      if (submissionsError) throw submissionsError;
      submissions = Array.isArray(submissionsRaw) ? submissionsRaw : [];
    }
    const pendingStatuses = new Set(['pending', 'pending_payment', 'submitted', 'under_review', 'processing']);
    const pendingAdSubmission = submissions.find((entry) => {
      const status = String(entry?.status || '').toLowerCase();
      return pendingStatuses.has(status);
    }) || null;

    const submissionsByCompanyAndEmail = new Map(
      submissions.map((submission) => [
        `${String(submission.company_name || '').trim().toLowerCase()}|${String(submission.email || '').trim().toLowerCase()}`,
        submission,
      ])
    );

    ads = ads.map((ad) => {
      const key = `${String(ad.company_name || '').trim().toLowerCase()}|${String(ad.email || '').trim().toLowerCase()}`;
      const submission = submissionsByCompanyAndEmail.get(key);
      return {
        ...ad,
        plan_name: submission?.plan_name || null,
        plan_amount: submission?.amount || null,
        plan_duration_days: submission?.duration_days || null,
        verified_at: submission?.verified_at || null,
      };
    });

    const approvedSubmissionKeys = new Set(
      submissions
        .filter((entry) => String(entry?.status || '').toLowerCase() === 'approved')
        .map((entry) => `${String(entry?.company_name || '').trim().toLowerCase()}|${String(entry?.email || '').trim().toLowerCase()}`)
    );

    const verifiedAdvertisements = ads
      .filter((ad) => ad?.is_active)
      .filter((ad) => {
        const key = `${String(ad?.company_name || '').trim().toLowerCase()}|${String(ad?.email || '').trim().toLowerCase()}`;
        return approvedSubmissionKeys.has(key);
      });

    const totalViews = ads.reduce((sum, ad) => sum + Number(ad?.impressions || 0), 0);
    const totalClicks = ads.reduce((sum, ad) => sum + Number(ad?.clicks || 0), 0);
    const activeAds = ads.filter((ad) => ad?.is_active).length;
    const pendingAds = ads.filter((ad) => !ad?.is_active).length + (pendingAdSubmission ? 1 : 0);
    const verifiedAds = verifiedAdvertisements.length;

    const isApprovedAgent =
      agentData?.verification_status === 'approved' &&
      ['paid', 'free', '7-day', '30-day', '90-day'].includes(agentData?.payment_status);

    return res.status(200).json({
      success: true,
      user: {
        id: userData.id,
        user_type: userData.user_type || 'landlord',
        account_type: accountType,
        profile_intent: userData.profile_intent || null,
        role: userData.role || 'user',
        identity_verified: Boolean(userData.identity_verified),
        id_verification_status: userData.id_verification_status || null,
        account_status: userData.account_status || null,
      },
      agent: agentData,
      stats: {
        properties: properties.length,
        activeListings,
        applications: applicationsCount,
        maxProperties: isApprovedAgent ? null : 2,
      },
      recentProperties: properties,
      serviceRequests,
      adInquiries,
      adStats: {
        totalAds: ads.length,
        activeAds,
        totalViews,
        totalClicks,
        verifiedAds,
        pendingAds,
      },
      advertisements: ads,
      verifiedAdvertisements,
      pendingAdVerificationAt: pendingAdSubmission?.submitted_at || null,
    });
  } catch (error) {
    console.error('Dashboard overview API error:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Failed to fetch dashboard data';
    return res.status(500).json({ error: message });
  }
}
