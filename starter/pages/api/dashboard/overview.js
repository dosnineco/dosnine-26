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

    const { data: adsByClerkRaw } = await db
      .from('advertisements')
      .select('id, title, company_name, is_active, impressions, clicks, expires_at, created_at, updated_at, created_by_clerk_id, email')
      .eq('created_by_clerk_id', resolved.clerkId)
      .order('created_at', { ascending: false });

    let ads = Array.isArray(adsByClerkRaw) ? adsByClerkRaw : [];

    if (userData?.email) {
      const { data: adsByEmailRaw } = await db
        .from('advertisements')
        .select('id, title, company_name, is_active, impressions, clicks, expires_at, created_at, updated_at, created_by_clerk_id, email')
        .eq('email', userData.email)
        .order('created_at', { ascending: false });

      if (Array.isArray(adsByEmailRaw) && adsByEmailRaw.length > 0) {
        const adMap = new Map();
        [...ads, ...adsByEmailRaw].forEach((ad) => adMap.set(ad.id, ad));
        ads = Array.from(adMap.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
    }

    const { data: submissionsByClerkRaw } = await db
      .from('sponsor_submissions')
      .select('id, status, submitted_at, verified_at, plan_id, plan_name, amount, duration_days, created_by_clerk_id, email')
      .eq('created_by_clerk_id', resolved.clerkId)
      .order('submitted_at', { ascending: false });

    let submissions = Array.isArray(submissionsByClerkRaw) ? submissionsByClerkRaw : [];
    if (userData?.email) {
      const { data: submissionsByEmailRaw } = await db
        .from('sponsor_submissions')
        .select('id, status, submitted_at, verified_at, plan_id, plan_name, amount, duration_days, created_by_clerk_id, email')
        .eq('email', userData.email)
        .order('submitted_at', { ascending: false });

      if (Array.isArray(submissionsByEmailRaw) && submissionsByEmailRaw.length > 0) {
        const submissionMap = new Map();
        [...submissions, ...submissionsByEmailRaw].forEach((entry) => submissionMap.set(entry.id, entry));
        submissions = Array.from(submissionMap.values()).sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
      }
    }
    const pendingStatuses = new Set(['pending', 'pending_payment', 'submitted', 'under_review', 'processing']);
    const pendingAdSubmission = submissions.find((entry) => {
      const status = String(entry?.status || '').toLowerCase();
      return pendingStatuses.has(status);
    }) || null;

    const approvedSubmissions = submissions.filter((entry) => String(entry?.status || '').toLowerCase() === 'approved').length;
    const totalViews = ads.reduce((sum, ad) => sum + Number(ad?.impressions || 0), 0);
    const totalClicks = ads.reduce((sum, ad) => sum + Number(ad?.clicks || 0), 0);
    const activeAds = ads.filter((ad) => ad?.is_active).length;

    const isApprovedAgent =
      agentData?.verification_status === 'approved' &&
      ['paid', 'free', '7-day', '30-day', '90-day'].includes(agentData?.payment_status);

    return res.status(200).json({
      success: true,
      user: {
        id: userData.id,
        user_type: userData.user_type || 'landlord',
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
      adStats: {
        totalAds: ads.length,
        activeAds,
        totalViews,
        totalClicks,
        verifiedAds: approvedSubmissions,
        pendingAds: pendingAdSubmission ? 1 : 0,
      },
      advertisements: ads,
      pendingAdVerificationAt: pendingAdSubmission?.submitted_at || null,
    });
  } catch (error) {
    console.error('Dashboard overview API error:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Failed to fetch dashboard data';
    return res.status(500).json({ error: message });
  }
}
