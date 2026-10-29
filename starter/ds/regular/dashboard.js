import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import axios from 'axios';
import { formatPropertyMoney } from '../../lib/formatMoney';
import {
  Clock,
  XCircle,
  Briefcase,
  DollarSign,
  ClipboardList,
  ShieldCheck,
  Bed,
  Bath,
  MapPin,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Tag,
  Home,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdvertiserDashboard from '../advertiser/dashboard';
import { clampBuyerLevel } from '../../lib/buyerReadiness';

const BRAND = '#6E026F';

const REQUEST_TYPE_STYLES = {
  buy: 'bg-[#6E026F]/10 text-[#6E026F]',
  rent: 'bg-gray-100 text-gray-700',
  sell: 'bg-gray-200 text-gray-800',
  lease: 'bg-gray-100 text-gray-700',
  valuation: 'bg-gray-100 text-gray-700',
};

const REQUEST_TYPE_ICONS = {
  buy: Tag,
  rent: Home,
  sell: DollarSign,
  lease: FileText,
  valuation: Briefcase,
};

const REQUEST_STATUS_STYLES = {
  open: 'text-[#6E026F]',
  assigned: 'text-gray-700',
  in_progress: 'text-gray-700',
  completed: 'text-gray-700',
  withdrawn: 'text-gray-500',
  cancelled: 'text-gray-500',
};

const STATUS_DOT = {
  open: 'bg-[#6E026F]',
  assigned: 'bg-gray-500',
  in_progress: 'bg-gray-500',
  completed: 'bg-gray-500',
  withdrawn: 'bg-gray-400',
  cancelled: 'bg-gray-400',
};

function formatBudgetRange(min, max) {
  const hasMin = Number(min) > 0;
  const hasMax = Number(max) > 0;
  if (hasMin && hasMax) {
    return `J$${Number(min).toLocaleString()} – J$${Number(max).toLocaleString()}`;
  }
  if (hasMax) return `up to J$${Number(max).toLocaleString()}`;
  if (hasMin) return `from J$${Number(min).toLocaleString()}`;
  return 'Not specified';
}

export default function RegularDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const statusCheckUserRef = useRef(null);
  const openBuyerVerification = async (requestId) => {
    try {
      await router.push({
        pathname: '/buyer-prequalification',
        query: { serviceRequestId: requestId },
      });
    } catch (error) {
      console.error('Unable to open buyer financial check:', error);
      toast.error('Unable to open buyer financial check. Please try again.');
    }
  };
  const [stats, setStats] = useState({ properties: 0, applications: 0, activeListings: 0 });
  const [recentProperties, setRecentProperties] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [adInquiries, setAdInquiries] = useState([]);
  const [advertisements, setAdvertisements] = useState([]);
  const [verifiedAdvertisements, setVerifiedAdvertisements] = useState([]);
  const [adStats, setAdStats] = useState({
    totalAds: 0,
    activeAds: 0,
    totalViews: 0,
    totalClicks: 0,
    verifiedAds: 0,
    pendingAds: 0,
  });
  const [pendingAdVerificationAt, setPendingAdVerificationAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [agentData, setAgentData] = useState(null);
  const [showAgentPrompt, setShowAgentPrompt] = useState(false);
  const [queueCount, setQueueCount] = useState(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [paidAgentCount, setPaidAgentCount] = useState(null);
  const [paidAgentLoading, setPaidAgentLoading] = useState(true);
  const [shouldLoadData, setShouldLoadData] = useState(false);
  const [userType, setUserType] = useState('landlord');
  const [accountType, setAccountType] = useState(null);
  const [profileIntent, setProfileIntent] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const [homeownerUpgradeDismissed, setHomeownerUpgradeDismissed] = useState(false);
  const [sponsorSubmissions, setSponsorSubmissions] = useState([]);
  const [editingAdId, setEditingAdId] = useState(null);
  const [editingAdValues, setEditingAdValues] = useState({ title: '', description: '', phone: '', website: '' });
  const [adOperationLoading, setAdOperationLoading] = useState(false);
  const [adMessage, setAdMessage] = useState(null);

  const isApprovedAgent = (agent) => {
    const status = String(agent?.verification_status || '').trim().toLowerCase();
    return status === 'approved';
  };

  const formatDate = (value) => {
    if (!value) return 'Not provided';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not provided' : date.toLocaleDateString();
  };

  const isRegularOwner = () => userType !== 'agent';
  const isTenantProfile = profileIntent === 'tenant';
  const isHomeownerProfile = profileIntent === 'homeowner';

  useEffect(() => {
    if (!user?.id) return;
    setHomeownerUpgradeDismissed(
      window.localStorage.getItem(`homeowner-upgrade-dismissed-${user.id}`) === 'true'
    );
  }, [user?.id]);

  useEffect(() => {
    if (retryAfterSeconds <= 0) return undefined;

    const timer = setTimeout(() => {
      setRetryAfterSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [retryAfterSeconds]);

  const handleDashboardRequestError = (error, fallbackMessage) => {
    if (error.response?.status === 429) {
      const retryAfter = Number(error.response.headers?.['retry-after']);
      setRetryAfterSeconds(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 30);
      setDashboardError('The dashboard is temporarily busy. Please wait before trying again.');
      return;
    }

    setDashboardError(error.response?.data?.error || fallbackMessage);
  };

  const handleAdFieldChange = (field, value) => {
    setEditingAdValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const startEditingAd = (ad) => {
    setEditingAdId(ad.id);
    setEditingAdValues({
      title: ad.title || ad.company_name || '',
      description: ad.description || '',
      phone: ad.phone || '',
      website: ad.website || '',
    });
    setAdMessage(null);
  };

  const cancelEditAd = () => {
    setEditingAdId(null);
    setEditingAdValues({ title: '', description: '', phone: '', website: '' });
    setAdMessage(null);
  };

  // SECURITY: Check user status and redirect BEFORE loading any data
  useEffect(() => {
    if (!isLoaded) return;
    if (!user?.id) {
      statusCheckUserRef.current = null;
      router.replace('/dashboard');
      return;
    }
    const statusCheckKey = `${user.id}:${router.query.adminView || ''}`;
    if (statusCheckUserRef.current === statusCheckKey) return;
    statusCheckUserRef.current = statusCheckKey;
    checkUserStatus();
  }, [user, isLoaded, router, router.query.adminView]);

  // Only fetch queue count if user should see dashboard (not redirecting)
  useEffect(() => {
    if (!shouldLoadData || accountType !== 'regular') return;

    const fetchQueueCount = async () => {
      try {
        const { count, error } = await supabase
          .from('service_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open');

        if (error) throw error;
        setQueueCount(count);
      } catch (error) {
        console.error('Error fetching queue count:', error);
        setQueueCount(null);
      } finally {
        setQueueLoading(false);
      }
    };

    fetchQueueCount();
  }, [shouldLoadData, accountType]);

  // Only fetch paid agents count if user should see dashboard (not redirecting)
  useEffect(() => {
    if (!shouldLoadData || accountType !== 'regular') return;

    const fetchPaidAgentCount = async () => {
      try {
        const { count, error } = await supabase
          .from('agents')
          .select('*', { count: 'exact', head: true })
          .eq('payment_status', 'paid');

        if (error) throw error;
        setPaidAgentCount(count);
      } catch (error) {
        console.error('Error fetching paid agents count:', error);
        setPaidAgentCount(null);
      } finally {
        setPaidAgentLoading(false);
      }
    };

    fetchPaidAgentCount();
  }, [shouldLoadData, accountType]);

  useEffect(() => {
    if (!shouldLoadData || redirecting) return;

    const refresh = () => {
      fetchDashboardData();
    };

    const interval = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [shouldLoadData, redirecting]);

  async function checkUserStatus() {
    try {
      setRedirecting(true);
      const { data: overview } = await axios.get('/api/dashboard/overview', { withCredentials: true });
      const userData = overview || {};
      const account = userData.user || {};
      const selectedType = account.account_type || (account.user_type === 'agent' ? 'agent' : null);
      const adminView = router.query.adminView;
      const requestedAdminView = ['regular', 'advertiser'].includes(adminView) ? adminView : null;
      const admin = account.role === 'admin';

      if (!admin && (userData.needsAccountTypeSelection || !selectedType)) {
        router.replace('/verify');
        return;
      }

      if (admin && requestedAdminView) {
        setAccountType(requestedAdminView);
        setProfileIntent(account.profile_intent || null);
        setIsAdmin(true);
        setUserType(account.user_type || 'landlord');
        setRedirecting(false);
        setShouldLoadData(true);
        await fetchDashboardData(null, requestedAdminView);
        return;
      }

      const identityVerified = Boolean(
        account.identity_verified ||
        account.id_verification_status === 'approved'
      );
      if (
        !admin &&
        ((!identityVerified && selectedType !== 'regular') ||
          ['flagged', 'deactivated'].includes(account.account_status))
      ) {
        const verificationRole = selectedType === 'regular'
          ? account.profile_intent || 'homeowner'
          : selectedType;
        router.replace(`/verify?role=${verificationRole}`);
        return;
      }

      if (admin) {
        router.replace('/admin');
        return;
      }

      setAccountType(selectedType);
      setProfileIntent(account.profile_intent || null);
      setIsAdmin(admin);
      setUserType(account.user_type || 'landlord');
      if (selectedType === 'agent') {
        router.replace('/agent/dashboard');
        return;
      }
      setRedirecting(false);
      setShouldLoadData(true);
      await fetchDashboardData(userData);
    } catch (error) {
      setRedirecting(false);
      if (error.response?.status === 403) {
        router.replace('/verify');
        return;
      }
      handleDashboardRequestError(error, 'Unable to verify your dashboard access. Please try again.');
    }
  }

  async function fetchDashboardData(overviewData = null, adminView = null) {
    const requestedView = adminView ||
      (isAdmin && ['regular', 'advertiser'].includes(router.query.adminView)
        ? router.query.adminView
        : null);
    if (overviewData || !accountType) setLoading(true);
    try {
      const overview = overviewData || (await axios.get('/api/dashboard/overview', {
        withCredentials: true,
        params: requestedView ? { view: requestedView } : undefined,
      })).data;
      const payload = overview || {};
      setDashboardError('');
      setRetryAfterSeconds(0);
      const agent = Array.isArray(payload?.agent)
        ? (payload.agent[0] || null)
        : (payload?.agent || null);

      setAgentData(agent);
      setUserType(payload?.user?.user_type || 'landlord');
      setAccountType(payload?.user?.account_type || (payload?.user?.user_type === 'agent' ? 'agent' : null));
      setProfileIntent(payload?.user?.profile_intent || null);
      setIsAdmin(payload?.user?.role === 'admin');
      setShowAgentPrompt(!agent);

      if (payload?.stats) {
        setStats({
          properties: Number(payload.stats.properties || 0),
          applications: Number(payload.stats.applications || 0),
          activeListings: Number(payload.stats.activeListings || 0),
        });
      } else {
        setStats({ properties: 0, applications: 0, activeListings: 0 });
      }

      setRecentProperties(Array.isArray(payload?.recentProperties) ? payload.recentProperties : []);
      setServiceRequests(Array.isArray(payload?.serviceRequests) ? payload.serviceRequests : []);
      setAdInquiries(Array.isArray(payload?.adInquiries) ? payload.adInquiries : []);
      setAdvertisements(Array.isArray(payload?.advertisements) ? payload.advertisements : []);
      setVerifiedAdvertisements(Array.isArray(payload?.verifiedAdvertisements) ? payload.verifiedAdvertisements : []);
      setSponsorSubmissions(Array.isArray(payload?.sponsorSubmissions) ? payload.sponsorSubmissions : []);
      setAdStats(payload?.adStats || {
        totalAds: 0,
        activeAds: 0,
        totalViews: 0,
        totalClicks: 0,
        verifiedAds: 0,
        pendingAds: 0,
      });
      setPendingAdVerificationAt(payload?.pendingAdVerificationAt || null);
    } catch (err) {
      handleDashboardRequestError(err, 'Unable to load dashboard data. Please try again.');
      setStats({ properties: 0, applications: 0, activeListings: 0 });
      setRecentProperties([]);
      setServiceRequests([]);
      setAdInquiries([]);
      setAdvertisements([]);
      setVerifiedAdvertisements([]);
      setSponsorSubmissions([]);
      setAdStats({
        totalAds: 0,
        activeAds: 0,
        totalViews: 0,
        totalClicks: 0,
        verifiedAds: 0,
        pendingAds: 0,
      });
      setPendingAdVerificationAt(null);
    } finally {
      setLoading(false);
    }
  }

  const saveAdEdits = async (adId) => {
    setAdOperationLoading(true);
    setAdMessage(null);

    try {
      const response = await fetch('/api/advertisements/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: adId,
          title: editingAdValues.title,
          description: editingAdValues.description,
          phone: editingAdValues.phone,
          website: editingAdValues.website,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to update ad');
      }

      setAdMessage('Ad updated successfully');
      cancelEditAd();
      fetchDashboardData();
    } catch (error) {
      setAdMessage(error.message || 'Failed to update ad');
    } finally {
      setAdOperationLoading(false);
    }
  };

  const deleteAd = async (adId) => {
    const confirmed = window.confirm('Delete this ad? This action cannot be undone and ads are non-refundable.');
    if (!confirmed) return;

    setAdOperationLoading(true);
    setAdMessage(null);

    try {
      const response = await fetch('/api/advertisements/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: adId }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to delete ad');
      }

      setAdMessage('Ad deleted successfully');
      if (editingAdId === adId) cancelEditAd();
      fetchDashboardData();
    } catch (error) {
      setAdMessage(error.message || 'Failed to delete ad');
    } finally {
      setAdOperationLoading(false);
    }
  };

  if (dashboardError) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard unavailable</h1>
        <p className="mt-3 text-gray-600">{dashboardError}</p>
        {retryAfterSeconds > 0 && (
          <p className="mt-2 text-sm text-gray-500">
            You can try again in {retryAfterSeconds} second{retryAfterSeconds === 1 ? '' : 's'}.
          </p>
        )}
        <button
          type="button"
          disabled={redirecting || retryAfterSeconds > 0}
          onClick={() => {
            setDashboardError('');
            statusCheckUserRef.current = null;
            checkUserStatus();
          }}
          className="mt-6 rounded-xl bg-accent px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {redirecting ? 'Trying again…' : retryAfterSeconds > 0 ? 'Please wait' : 'Try again'}
        </button>
      </main>
    );
  }

  if (accountType === 'advertiser') {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Loading your advertiser dashboard…</p>
        </div>
      );
    }
    return (
      <>
        <AdvertiserDashboard
          overview={{
            user: { role: isAdmin ? 'admin' : 'user' },
            adStats,
            advertisements,
            sponsorSubmissions,
            adInquiries,
          }}
          isAdmin={isAdmin}
          onRefresh={fetchDashboardData}
        />
      </>
    );
  }

  // Prevent rendering if still checking auth status or redirecting
  if (!isLoaded || redirecting || !shouldLoadData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard — Rentals Jamaica</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Hi, {user?.username || 'User'}!</h1>
          </div>
        </div>

        {accountType === 'regular' && !isHomeownerProfile && !homeownerUpgradeDismissed && (
          <section className="relative mb-8 flex flex-col gap-4 rounded-2xl bg-blue-50 p-5 pr-14 sm:flex-row sm:items-center sm:justify-between sm:p-6 sm:pr-14">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-blue-700" aria-hidden="true" />
              <div>
                <h2 className="font-semibold text-blue-950">Want to list or manage a property?</h2>
                <p className="mt-1 text-sm leading-6 text-blue-900">
                  Upgrade to a Homeowner account. You’ll need to verify your identity with a government ID.
                </p>
              </div>
            </div>
            <Link
              href="/verify?role=homeowner"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Upgrade to Homeowner
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => {
                if (user?.id) {
                  window.localStorage.setItem(`homeowner-upgrade-dismissed-${user.id}`, 'true');
                }
                setHomeownerUpgradeDismissed(true);
              }}
              aria-label="Dismiss homeowner upgrade message"
              className="absolute right-3 top-3 rounded-lg p-2 text-blue-800 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-700 sm:right-4 sm:top-4"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </section>
        )}

        {/* ==================== QUICK ACTIONS ==================== */}
        <div className="mb-8">
          <div
            className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
              isHomeownerProfile ? 'xl:grid-cols-4' : 'xl:grid-cols-2'
            }`}
          >
            {/* Card 1 — Submit a request */}
            <Link
              href="/request"
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6E026F]/20 hover:shadow-lg hover:shadow-gray-200/80"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#6E026F]/8 blur-3xl transition-colors duration-300 group-hover:bg-[#6E026F]/15" />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6E026F]/10 text-[#6E026F] transition-colors duration-200 group-hover:bg-[#6E026F] group-hover:text-white">
                    <FileText size={22} />
                  </div>
                  <ArrowUpRight
                    size={18}
                    className="text-gray-300 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#6E026F]"
                  />
                </div>
                <div className="mt-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6E026F]">
                    Request
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-900">
                    {isTenantProfile
                      ? 'Find a Property'
                      : 'Submit a Property Request'}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-gray-600">
                    {isTenantProfile
                      ? 'Tell us what you need in a home and track the search from your dashboard.'
                      : 'Tell us what property you are looking for.'}
                  </p>
                </div>
              </div>
            </Link>

            {/* Card 2 — My Requests */}
            {accountType === 'regular' && (
              <Link
                href="/my-requests"
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6E026F]/20 hover:shadow-lg hover:shadow-gray-200/80"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gray-100 blur-3xl transition-colors duration-300 group-hover:bg-gray-200" />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-700 transition-colors duration-200 group-hover:bg-[#6E026F] group-hover:text-white">
                      <ClipboardList size={22} />
                    </div>
                    <span className="inline-flex items-center rounded-full bg-[#6E026F]/10 px-2.5 py-1 text-[11px] font-semibold text-[#6E026F]">
                      {loading
                        ? '…'
                        : `${serviceRequests.length} ${
                            serviceRequests.length === 1
                              ? 'request'
                              : 'requests'
                          }`}
                    </span>
                  </div>
                  <div className="mt-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-600">
                      Requests
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-gray-900">
                      My Requests
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-gray-600">
                      {isTenantProfile
                        ? 'Track your property search and update what you are looking for.'
                        : 'Track requests, update details, and complete buyer readiness for purchase requests.'}
                    </p>
                  </div>
                </div>
              </Link>
            )}

            {/* Card 3 — Manage Properties */}
            {isHomeownerProfile && (
              <Link
                href="/properties/my-listings"
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/80"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gray-100 blur-3xl transition-colors duration-300 group-hover:bg-gray-200" />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-700 transition-colors duration-200 group-hover:bg-[#6E026F] group-hover:text-white">
                      <Home size={22} />
                    </div>
                    <ArrowUpRight
                      size={18}
                      className="text-gray-300 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#6E026F]"
                    />
                  </div>
                  <div className="mt-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-600">
                      Listings
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-gray-900">
                      Manage Properties
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-gray-600">
                      View, update, and organize your listings from one place.
                    </p>
                  </div>
                </div>
              </Link>
            )}

            {/* Card 4 — Post a Property */}
            {isHomeownerProfile && (
              <Link
                href="/properties/new"
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6E026F]/20 hover:shadow-lg hover:shadow-gray-200/80"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#6E026F]/8 blur-3xl transition-colors duration-300 group-hover:bg-[#6E026F]/15" />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6E026F]/10 text-[#6E026F] transition-colors duration-200 group-hover:bg-[#6E026F] group-hover:text-white">
                      <Plus size={22} />
                    </div>
                    <ArrowUpRight
                      size={18}
                      className="text-gray-300 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#6E026F]"
                    />
                  </div>
                  <div className="mt-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6E026F]">
                      New listing
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-gray-900">
                      Post a Property
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-gray-600">
                      Add a new listing and attract the right buyers or tenants.
                    </p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Agent Status Banner */}
        {accountType === 'agent' && agentData && (
          <div className="mb-8">
            {agentData.verification_status === 'pending' && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
                <div className="flex items-start gap-3">
                  <Clock className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-1">
                      Agent Verification Pending
                    </h3>
                    <p className="text-yellow-700 mb-3">
                      We&apos;re reviewing your application. You&apos;ll receive an email within 24 hours.
                    </p>
                    <p className="text-sm text-yellow-600">
                      Submitted: {formatDate(agentData.verification_submitted_at || agentData.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {agentData.verification_status === 'rejected' && (
              <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg">
                <div className="flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-900 mb-1">
                      Agent Application Rejected
                    </h3>
                    <p className="text-red-700 mb-3">
                      {agentData.rejection_reason || 'Unfortunately, your application was not approved.'}
                    </p>
                    <Link
                      href="/agent/signup"
                      className="btn-accent inline-block"
                    >
                      Resubmit Application
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {agentData.verification_status === 'approved' && !['paid', '7-day', '30-day', '90-day'].includes(agentData.payment_status) && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-6 h-6 text-yellow-700 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-1">
                      Payment Required to Activate Agent Dashboard
                    </h3>
                    <p className="text-yellow-800 mb-3">
                      Your agent profile is approved. Complete the payment to unlock the Agent Dashboard and start receiving leads.
                    </p>
                    <Link
                      href="/agent/payment"
                      className="inline-block px-4 py-2 rounded-lg font-semibold border border-yellow-300 bg-yellow-100 text-yellow-900 hover:bg-yellow-200"
                    >
                      Complete Payment
                    </Link>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {accountType === 'agent' && pendingAdVerificationAt && (
          <div className="mb-8 rounded-lg border-l-4 border-[#6E026F] bg-[#6E026F]/5 p-6">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-6 w-6 flex-shrink-0 text-[#6E026F]" />
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-semibold text-[#6E026F]">
                  Advertisement Verification Pending
                </h3>
                <p className="mb-2 text-gray-700">
                  Your ad payment is under review. Verification usually completes within 24 hours.
                </p>
                <p className="text-sm text-gray-600">
                  Submitted: {formatDate(pendingAdVerificationAt)}
                </p>
              </div>
            </div>
          </div>
        )}

        {accountType === 'agent' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Ad Portfolio</h2>
              <p className="text-sm text-gray-600">View your ad stats and manage your ad listings in one place.</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              No refund for ads once submitted.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Total Ads</p>
              <p className="text-3xl font-semibold text-gray-900">{adStats.totalAds || 0}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Active Ads</p>
              <p className="text-3xl font-semibold text-gray-900">{adStats.activeAds || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Clicks: {Number(adStats.totalClicks || 0).toLocaleString()} · Views: {Number(adStats.totalViews || 0).toLocaleString()}</p>
            </div>
          </div>

          {adMessage && (
            <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-700">
              {adMessage}
            </div>
          )}

          {verifiedAdvertisements.length > 0 && (
            <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-5">
              <h3 className="text-lg font-semibold text-green-900 mb-3">Verified Ads</h3>
              <div className="space-y-3">
                {verifiedAdvertisements.map((ad) => (
                  <div key={ad.id} className="rounded-lg bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{ad.title || ad.company_name || 'Verified ad'}</p>
                      <p className="text-sm text-gray-600">{ad.company_name}</p>
                    </div>
                    <div className="text-sm text-gray-600 sm:text-right">
                      <p>Expires: {formatDate(ad.expires_at)}</p>
                      <p className="text-green-700 font-medium">Live and verified</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {advertisements.length === 0 && verifiedAdvertisements.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-600">
              You don&apos;t have any ads yet. Create one now to start promoting your business.
            </div>
          ) : (
            <div className="space-y-4">
              {advertisements.map((ad) => (
                <div key={ad.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{ad.title || ad.company_name || 'Untitled ad'}</h3>
                      <p className="text-sm text-gray-500">{ad.company_name}</p>
                      <p className="text-sm text-gray-500 mt-2">Status: {ad.is_active ? 'Active' : 'Inactive / Pending'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditingAd(ad)}
                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAd(ad.id)}
                        disabled={adOperationLoading}
                        className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Delete
                      </button>
                      <Link
                        href={`/ads/${ad.id}`}
                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                      >
                        View
                      </Link>
                    </div>
                  </div>

                  {editingAdId === ad.id && (
                    <div className="mt-4 space-y-4 bg-white rounded-xl p-4 border border-gray-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Title</label>
                        <input
                          value={editingAdValues.title}
                          onChange={(e) => handleAdFieldChange('title', e.target.value)}
                          className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-accent focus:ring-accent/40"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                          value={editingAdValues.description}
                          onChange={(e) => handleAdFieldChange('description', e.target.value)}
                          className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-accent focus:ring-accent/40"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone</label>
                          <input
                            value={editingAdValues.phone}
                            onChange={(e) => handleAdFieldChange('phone', e.target.value)}
                            className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-accent focus:ring-accent/40"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Website</label>
                          <input
                            value={editingAdValues.website}
                            onChange={(e) => handleAdFieldChange('website', e.target.value)}
                            className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-accent focus:ring-accent/40"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => saveAdEdits(ad.id)}
                          disabled={adOperationLoading}
                          className="rounded-xl bg-accent px-4 py-2 text-white hover:bg-accent/90 disabled:opacity-50"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditAd}
                          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {redirecting && (
          <div className="bg-white rounded-lg p-6 mb-8">
            <p className="text-gray-600">Checking your account and redirecting…</p>
          </div>
        )}

        {!redirecting && (adStats.totalAds > 0 || adStats.totalViews > 0 || adStats.totalClicks > 0) && (
          <div className="bg-white rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Ad Performance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total Views</p>
                <p className="text-3xl font-bold text-[#6E026F]">{Number(adStats.totalViews || 0).toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total Clicks</p>
                <p className="text-3xl font-bold text-gray-700">{Number(adStats.totalClicks || 0).toLocaleString()}</p>
              </div>
            </div>

            {advertisements.filter((ad) => ad.is_active).length > 0 ? (
              <div className="space-y-3">
                {advertisements.filter((ad) => ad.is_active).slice(0, 5).map((ad) => (
                  <div key={ad.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{ad.title || ad.company_name || 'Advertisement'}</p>
                      <p className="text-xs text-gray-500">Expires: {formatDate(ad.expires_at)}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-[#6E026F]">{Number(ad.impressions || 0).toLocaleString()} views</p>
                      <p className="font-semibold text-gray-700">{Number(ad.clicks || 0).toLocaleString()} clicks</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No active ads yet. Your ad metrics will appear here once the campaign is live.</p>
            )}
          </div>
        )}

        {!redirecting && adInquiries.length > 0 && (
          <div className="bg-white rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Advertisement Leads</h2>
            <div className="space-y-3">
              {adInquiries.slice(0, 10).map((inquiry) => (
                <div key={inquiry.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900">{inquiry.advertisements?.title || inquiry.advertisements?.company_name || 'Advertisement enquiry'}</p>
                    <span className="text-xs font-medium capitalize text-accent">{inquiry.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-800">{inquiry.message}</p>
                  <p className="mt-3 text-sm text-gray-600">{inquiry.client_name} | {inquiry.client_email}{inquiry.client_phone ? ` | ${inquiry.client_phone}` : ''}</p>
                  <p className="mt-1 text-xs text-gray-500">{formatDate(inquiry.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== SERVICE REQUESTS ==================== */}
        {!redirecting && serviceRequests.length > 0 && (
          <section className="mb-8">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your property requests</h2>
                <p className="mt-1 text-sm text-gray-600">Track your buying, rental, and other property requests.</p>
              </div>
              <Link
                href="/my-requests"
                className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                View all requests
              </Link>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {serviceRequests.map((request) => {
                const isBuyRequest = String(request.request_type || '').toLowerCase() === 'buy';
                const prequalification = request.buyer_prequalification || null;
                const level = clampBuyerLevel(prequalification?.qualification_level);
                const documents = Array.isArray(prequalification?.documents)
                  ? prequalification.documents
                  : [];
                const pendingDocuments = documents.filter((d) => d.status === 'pending').length;
                const reviewedDocuments = documents.filter((d) => d.status === 'reviewed').length;
                const verifiedBudgetMax = Number(prequalification?.verified_budget_max || 0);
                const verificationExpiresAt = prequalification?.verification_expires_at
                  ? new Date(prequalification.verification_expires_at).getTime()
                  : NaN;
                const verificationExpired = Number.isFinite(verificationExpiresAt) &&
                  verificationExpiresAt <= Date.now();
                const hasVerifiedBudget = verifiedBudgetMax > 0 && level >= 3 && !verificationExpired;
                const agent = Array.isArray(request.agent) ? request.agent[0] : request.agent;
                const agentUser = Array.isArray(agent?.users) ? agent.users[0] : agent?.users;
                const requestType = String(request.request_type || '').toLowerCase();
                const TypeIcon = REQUEST_TYPE_ICONS[requestType] || FileText;
                const status = String(request.status || 'open').toLowerCase();
                const requestUrgency = String(request.urgency || 'normal').toLowerCase();
                const canBoostRequest = ['low', 'normal'].includes(requestUrgency) &&
                  !['completed', 'cancelled', 'deleted', 'withdrawn'].includes(status);
                const statusDot = STATUS_DOT[status] || 'bg-gray-400';
                const statusColor = REQUEST_STATUS_STYLES[status] || 'text-gray-600';

                const verificationStatus = !prequalification
                  ? 'not-started'
                  : verificationExpired
                    ? 'expired'
                    : level >= 3
                      ? 'verified'
                      : pendingDocuments > 0
                        ? 'under-review'
                        : 'in-progress';

                const verificationColors = {
                  'not-started': {
                    wrap: 'border-gray-200 bg-gray-50',
                    icon: 'bg-gray-100 text-gray-700',
                    title: 'Buyer verification needed',
                    sub: 'Add documents to raise your chances.',
                  },
                  'in-progress': {
                    wrap: 'border-[#6E026F]/15 bg-[#6E026F]/5',
                    icon: 'bg-[#6E026F]/10 text-[#6E026F]',
                    title: 'Verification in progress',
                    sub:
                      reviewedDocuments > 0
                        ? `${reviewedDocuments} reviewed · ${pendingDocuments} pending`
                        : 'Add more documents to reach Level 3.',
                  },
                  'under-review': {
                    wrap: 'border-[#6E026F]/15 bg-[#6E026F]/5',
                    icon: 'bg-[#6E026F]/10 text-[#6E026F]',
                    title: 'Documents under review',
                    sub: `${pendingDocuments} file${pendingDocuments === 1 ? '' : 's'} being reviewed`,
                  },
                  verified: {
                    wrap: 'border-gray-200 bg-gray-50',
                    icon: 'bg-gray-100 text-gray-700',
                    title: 'Verified buyer',
                    sub: hasVerifiedBudget
                      ? `Budget verified up to J$${verifiedBudgetMax.toLocaleString()}`
                      : 'Sellers see you first.',
                  },
                  expired: {
                    wrap: 'border-red-200 bg-red-50',
                    icon: 'bg-red-100 text-red-600',
                    title: 'Verification expired',
                    sub: 'Renew to stay visible to sellers.',
                  },
                };

                const vc = verificationColors[verificationStatus];

                const ctaLabel =
                  verificationStatus === 'verified'
                    ? 'Manage documents'
                    : verificationStatus === 'expired'
                      ? 'Renew verification'
                      : verificationStatus === 'under-review'
                        ? 'View submission'
                        : verificationStatus === 'in-progress'
                          ? 'Continue verification'
                          : 'Start verification';

                const ctaClass =
                  verificationStatus === 'verified'
                    ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    : verificationStatus === 'expired'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-[#6E026F] text-white hover:bg-[#6E026F]/90';

                const fillLevel = Math.max(0, Math.min(4, level));

                return (
                  <article
                    key={request.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/60 px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            REQUEST_TYPE_STYLES[requestType] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <TypeIcon size={11} />
                          {request.request_type || 'request'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(request.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold capitalize ${statusColor}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                        {status.replaceAll('_', ' ')}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col gap-4 p-5">
                      <div>
                        <h3 className="text-base font-semibold capitalize text-gray-900">
                          {request.property_type}
                          {request.location && (
                            <span className="font-normal text-gray-500">
                              {' · '}
                              {request.location}
                            </span>
                          )}
                        </h3>
                        {request.description ? (
                          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-gray-600">
                            {request.description}
                          </p>
                        ) : !request.budget_min && !request.budget_max ? (
                          <p className="mt-1.5 text-sm italic text-gray-400">
                            No extra details provided.
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(Number(request.budget_min) > 0 || Number(request.budget_max) > 0) && (
                          <MetaChip
                            icon={DollarSign}
                            label="Budget"
                            value={formatBudgetRange(request.budget_min, request.budget_max)}
                          />
                        )}
                        {request.bedrooms ? (
                          <MetaChip icon={Bed} label="Beds" value={request.bedrooms} />
                        ) : null}
                        {request.bathrooms ? (
                          <MetaChip icon={Bath} label="Baths" value={request.bathrooms} />
                        ) : null}
                        {request.location ? (
                          <MetaChip icon={MapPin} label="Area" value={request.location} />
                        ) : null}
                      </div>

                      {isBuyRequest && (
                        <div className={`rounded-xl border px-3 py-3 ${vc.wrap}`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${vc.icon}`}>
                              <ShieldCheck size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-gray-900">
                                {vc.title}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-gray-600">
                                {vc.sub}
                              </p>
                            </div>
                            {hasVerifiedBudget && (
                              <CheckCircle2
                                size={16}
                                className="flex-shrink-0 text-[#6E026F]"
                              />
                            )}
                          </div>
                          <div className="mt-2.5 flex items-center gap-1">
                            {[1, 2, 3, 4].map((step) => {
                              const filled = step <= fillLevel;
                              const color =
                                verificationStatus === 'verified'
                                  ? 'bg-[#6E026F]'
                                  : verificationStatus === 'under-review' ||
                                      verificationStatus === 'in-progress'
                                    ? 'bg-[#6E026F]'
                                    : 'bg-red-400';
                              return (
                                <div
                                  key={step}
                                  className={`h-1 flex-1 rounded-full transition-colors ${
                                    filled ? color : 'bg-gray-200'
                                  }`}
                                />
                              );
                            })}
                            <span className="ml-1 text-[10px] font-bold tabular-nums text-gray-500">
                              {fillLevel}/4
                            </span>
                          </div>
                        </div>
                      )}

                      {agent && request.status !== 'open' && (
                        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-gray-500">
                              <Home size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                Assigned agent
                              </p>
                              <p className="truncate text-xs font-semibold text-gray-900">
                                {agentUser?.full_name || agent.business_name || 'Your agent'}
                              </p>
                            </div>
                          </div>
                          {agentUser?.email && (
                            <a
                              href={`mailto:${agentUser.email}`}
                              className="mt-2 block truncate rounded-md bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#6E026F] transition hover:bg-gray-50"
                            >
                              {agentUser.email}
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-3">
                      {canBoostRequest && (
                        <div className="flex w-full flex-col gap-2 rounded-xl bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold text-amber-950">
                              Standard priority · Boost to High or Urgent
                            </p>
                            <p className="mt-0.5 text-[11px] leading-5 text-amber-900">
                              Boosted requests appear ahead of standard requests in agent queues, which can help you connect sooner while listings are available.
                            </p>
                          </div>
                          <Link
                            href={{ pathname: '/my-requests', query: { boostRequest: request.id } }}
                            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#6E026F] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#6E026F]/90"
                          >
                            Increase priority
                            <ArrowRight size={13} />
                          </Link>
                        </div>
                      )}
                      {!canBoostRequest && ['high', 'urgent'].includes(requestUrgency) && (
                        <span className="inline-flex items-center rounded-full bg-[#6E026F]/10 px-3 py-1.5 text-xs font-semibold capitalize text-[#6E026F]">
                          {requestUrgency} priority
                        </span>
                      )}
                      {isBuyRequest && (
                        <button
                          type="button"
                          onClick={() => openBuyerVerification(request.id)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${ctaClass}`}
                        >
                          {verificationStatus === 'verified' ? (
                            <CheckCircle2 size={13} />
                          ) : verificationStatus === 'under-review' ? (
                            <Clock size={13} />
                          ) : verificationStatus === 'expired' ? (
                            <AlertCircle size={13} />
                          ) : (
                            <Upload size={13} />
                          )}
                          {ctaLabel}
                          <ArrowRight size={13} />
                        </button>
                      )}

                      {request.status === 'open' && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm('Are you sure you want to withdraw this request?')) return;
                            try {
                              const response = await fetch('/api/service-requests/withdraw', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'same-origin',
                                body: JSON.stringify({ clerkId: user.id, requestId: request.id }),
                              });
                              if (!response.ok) throw new Error('Unable to withdraw this request');
                              fetchDashboardData();
                            } catch (error) {
                              toast.error(error.message || 'Unable to withdraw this request');
                            }
                          }}
                          className="ml-auto rounded-lg px-3 py-2 text-xs font-medium text-gray-400 transition hover:bg-gray-100 hover:text-red-600"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent Properties */}
        {!redirecting && !loading && recentProperties.length > 0 && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Recent Properties</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Title</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Price</th>
                    <th className="text-left py-3 px-4">Posted</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProperties.map((prop) => (
                    <tr key={prop.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{prop.title}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          prop.status === 'available' ? 'bg-green-100 text-green-700' :
                          prop.status === 'coming_soon' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {prop.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{formatPropertyMoney(prop.price, prop.currency)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(prop.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <Link href={`/property/${prop.slug}`} className="block text-[#6E026F] hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ============================================================
 * Small component: meta chip
 * ============================================================ */
function MetaChip({ icon: Icon, label, value }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-gray-500">
        <Icon size={12} />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
          {label}
        </span>
        <span className="text-xs font-semibold text-gray-800">
          {value}
        </span>
      </div>
    </div>
  );
}