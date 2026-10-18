import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import RequestNotificationPopup from '../../components/RequestNotificationPopup';
import AgentFeedbackPopup from '../../components/AgentFeedbackPopup';
import AgentSharedBuyerRequests from '../../components/AgentSharedBuyerRequests';
import { useRoleProtection } from '../../lib/useRoleProtection';
import { isVerifiedAgent } from '../../lib/rbac';
import {
  Home, Users, Mail, Phone, MapPin, DollarSign, Award,
  Bed, Bath, Calendar, Filter, CheckCircle, XCircle,
  AlertCircle, Clock, Plus, RotateCcw, Trash2, BellDot, MessageCircle,
  Phone as PhoneIcon, CreditCard, Info, MessageSquare, Search, ShieldCheck,
  ExternalLink, FileText,
} from 'lucide-react';

export default function AgentDashboardPage() {
  const router = useRouter();
  const SectionHint = ({ message }) => (
    <span
      className="relative inline-flex items-center group ml-2 align-middle outline-none"
      tabIndex={0}
      aria-label="Section explainer"
    >
      <Info className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition" aria-hidden="true" />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {message}
      </span>
    </span>
  );
  // Protect route - only verified agents can access
  const {
    loading: authLoading,
    hasAccess,
    userData: initialUserData,
  } = useRoleProtection({
    checkAccess: (userData) => {
      if (router.query.adminView === 'agent' && userData?.role === 'admin') return true;
      const isAgentAccount = userData?.account_type === 'agent' ||
        (!userData?.account_type && userData?.user_type === 'agent');
      if (!isAgentAccount) return false;
      const verified = userData?.identity_verified === true || userData?.id_verification_status === 'approved';
      return verified && isVerifiedAgent(userData);
    },
    redirectTo: '/agent/signup',
    message: 'A verified Agent account is required. Apply or check your agent account on the Become an Agent page.'
  });
  const isAdminDashboardView = router.query.adminView === 'agent' && initialUserData?.role === 'admin';
  const isAgentAccount = isAdminDashboardView || initialUserData?.account_type === 'agent' ||
    (!initialUserData?.account_type && initialUserData?.user_type === 'agent');

  const { user } = useUser();
  const { getToken, isLoaded: authLoaded, userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [agentData, setAgentData] = useState(initialUserData?.agent || null);
  const isOwner = initialUserData?.user_type === 'owner';
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
  const [createRequestLoading, setCreateRequestLoading] = useState(false);
  const [newRequest, setNewRequest] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    requestType: 'buy',
    propertyType: 'house',
    location: '',
    budgetMin: '',
    budgetMax: '',
    bedrooms: '',
    bathrooms: '',
    description: '',
    urgency: 'normal',
  });
  const [queueCount, setQueueCount] = useState(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [paidAgentCount, setPaidAgentCount] = useState(null);
  const [paidAgentLoading, setPaidAgentLoading] = useState(true);
  const [advertisements, setAdvertisements] = useState([]);
  const [adInquiries, setAdInquiries] = useState([]);

  const isAccessExpired = () => {
    if (!agentData) return false;
    const paidPlans = ['7-day', '30-day', '90-day'];
    if (!paidPlans.includes(agentData.payment_status)) return false;
    if (!agentData.access_expiry) return false;
    return new Date(agentData.access_expiry) <= new Date();
  };

  const isFreePlan = () => agentData?.payment_status === 'free';
  const shouldShowUpgrade = () => isFreePlan() || isAccessExpired();

  useEffect(() => {
    if (initialUserData) {
      setAgentData(initialUserData.agent);
      setUserRole(initialUserData.role);
      setLoading(false);
    }
  }, [initialUserData, router]);

  useEffect(() => {
    if (!isAgentAccount || !authLoaded || !userId) return;

    const fetchStats = async () => {
      try {
        const token = await getToken();
        const response = await axios.get('/api/agent/stats', {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          withCredentials: true,
          params: isAdminDashboardView ? { adminView: 'agent' } : undefined,
        });
        setQueueCount(response.data.queueCount ?? null);
        setPaidAgentCount(response.data.paidAgentCount ?? null);
      } catch (error) {
        console.error('Error fetching agent stats:', error);
        setQueueCount(null);
        setPaidAgentCount(null);
      } finally {
        setQueueLoading(false);
        setPaidAgentLoading(false);
      }
    };

    fetchStats();
  }, [authLoaded, userId, getToken, isAgentAccount, isAdminDashboardView]);

  useEffect(() => {
    if (!isAgentAccount || !authLoaded || !userId) return;

    const fetchAdvertisements = async () => {
      try {
        const token = await getToken();
        const response = await axios.get('/api/dashboard/overview', {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          withCredentials: true,
        });

        const payload = response.data || {};
        setAdvertisements(Array.isArray(payload.advertisements) ? payload.advertisements : []);
        setAdInquiries(Array.isArray(payload.adInquiries) ? payload.adInquiries : []);
      } catch (error) {
        console.error('Error fetching advertisements:', error);
        setAdvertisements([]);
        setAdInquiries([]);
      }
    };

    fetchAdvertisements();
  }, [authLoaded, userId, getToken, isAgentAccount]);

  const fetchRequests = useCallback(async () => {
    if (!authLoaded) return;
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const response = await axios.get('/api/agent/requests', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        withCredentials: true,
        params: {
          status: 'all',
          ...(isAdminDashboardView ? { adminView: 'agent' } : {}),
        },
      });
      setRequests(response.data.requests || []);
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please sign in again.');
        router.push('/dashboard');
      } else if (error.response?.status === 403) {
        toast.error('Agent verification required');
        router.push('/agent/signup');
      } else if (error.response?.status === 404) {
        setRequests([]);
        toast.info('Service requests coming soon!');
      } else {
        toast.error('Failed to load requests');
      }
    } finally {
      setLoading(false);
    }
  }, [authLoaded, getToken, router, userId, isAdminDashboardView]);

  useEffect(() => {
    if (isAgentAccount && (agentData || isAdminDashboardView) && authLoaded && userId) {
      fetchRequests();
    }
  }, [isAgentAccount, agentData, isAdminDashboardView, authLoaded, userId, fetchRequests]);

  async function handleRequestAction(requestId, action, commentData = null) {
    if (!user?.id || !authLoaded) return;

    const actionLabels = {
      complete: 'Mark as Complete',
      release: 'Release to Next Agent',
      remove: 'Remove from Dashboard',
      contacted: 'Mark as Contacted',
      comment: 'Save Comment',
    };

    if (!['comment'].includes(action) && !confirm(`Are you sure you want to ${actionLabels[action]}?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const token = await getToken();
      const response = await axios.post('/api/agent/update-request', {
        requestId,
        action,
        comment: commentData,
      }, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        withCredentials: true,
      });

      toast.success(response.data.message);
      await fetchRequests();
      setSelectedRequest(null);
      setShowCommentModal(false);
      setCommentText('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update request');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCommentSubmit(requestId) {
    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    await handleRequestAction(requestId, 'comment', commentText);
  }

  async function handleCreateRequest(event) {
    event.preventDefault();
    setCreateRequestLoading(true);
    try {
      const token = await getToken();
      await axios.post('/api/service-requests/create', newRequest, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        withCredentials: true,
      });
      toast.success('Request created and assigned to you');
      setShowCreateRequestModal(false);
      setNewRequest({
        clientName: '', clientEmail: '', clientPhone: '', requestType: 'buy',
        propertyType: 'house', location: '', budgetMin: '', budgetMax: '',
        bedrooms: '', bathrooms: '', description: '', urgency: 'normal',
      });
      await fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create request');
    } finally {
      setCreateRequestLoading(false);
    }
  }

  const stats = {
    open: requests.filter((r) => r.status === 'open').length,
    assigned: requests.filter((r) => r.status === 'assigned' || r.status === 'in_progress').length,
    completed: requests.filter((r) => r.status === 'completed').length,
    total: requests.length,
  };

  const filteredRequests = requests.filter((r) => {
    let statusMatch = filterStatus === 'all';
    if (!statusMatch) {
      if (filterStatus === 'assigned') {
        statusMatch = r.status === 'assigned' || r.status === 'in_progress';
      } else {
        statusMatch = r.status === filterStatus;
      }
    }
    const urgencyMatch = filterUrgency === 'all' || r.urgency === filterUrgency;
    return statusMatch && urgencyMatch;
  });

  const getRelativeTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const diffInMs = now - new Date(date);
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-600">Verifying agent account access…</p>
      </div>
    );
  }
  if (!hasAccess) return null;

  return (
    <>
      <Head>
        <title>Agent Dashboard - Client Requests</title>
      </Head>

      <RequestNotificationPopup />

      <div className="min-h-screen bg-[#f5f7fb]">
        <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 py-8">
          <header className="mb-7 flex flex-col gap-5 rounded-2xl bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#2373F4]">Agent workspace</p>
              <h1 className="text-3xl font-bold tracking-tight text-gray-950">Your client requests</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                Keep every client conversation moving. Review your assigned requests, record contact, and close or release work as needed.
              </p>
            </div>
            {!isOwner && !isAdminDashboardView && (
              <button
                type="button"
                onClick={() => setShowCreateRequestModal(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2373F4] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Create request
              </button>
            )}
          </header>

          {/* Quick Actions Section */}
          <div className="mb-8">
            <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${initialUserData?.role === 'admin' ? 'xl:grid-cols-6' : 'xl:grid-cols-5'}`}>
              <Link
                href="/properties/my-listings"
                className="group flex h-full items-center gap-3 rounded-xl bg-white p-4 transition hover:bg-gray-100"
              >
                <Home className="h-5 w-5 text-[#2373F4] transition group-hover:scale-110" />
                <h3 className="text-sm font-semibold text-gray-900">Manage Properties</h3>
              </Link>

              <Link
                href="/properties/new"
                className="group flex h-full items-center gap-3 rounded-xl bg-white p-4 transition hover:bg-gray-100"
              >
                <Plus className="h-5 w-5 text-[#2373F4] transition group-hover:scale-110" />
                <h3 className="text-sm font-semibold text-gray-900">New Property</h3>
              </Link>

              {!isOwner && (
                <Link
                  href="/properties/bulk-create"
                  className="group flex h-full items-center gap-3 rounded-xl bg-white p-4 transition hover:bg-gray-100"
                >
                  <Plus className="h-5 w-5 text-[#2373F4] transition group-hover:scale-110" />
                  <h3 className="text-sm font-semibold text-gray-900">Bulk Create</h3>
                </Link>
              )}

              {isOwner && (
                <Link
                  href="/agent/payment"
                  className="group flex h-full items-center gap-3 rounded-xl bg-white p-4 transition hover:bg-gray-100"
                >
                  <DollarSign className="h-5 w-5 text-[#2373F4] transition group-hover:scale-110" />
                  <h3 className="text-sm font-semibold text-gray-900">Rent Your House</h3>
                </Link>
              )}

              {!isOwner && (
                <Link
                  href="/agent/parish-requests"
                  className="group relative flex h-full items-center gap-3 rounded-xl bg-white p-4 transition hover:bg-gray-100"
                >
                  <span className="absolute -right-1 -top-1 z-10 rounded-full bg-[#2373F4] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    NEW
                  </span>
                  <Search className="h-6 w-6 text-[#2373F4] transition group-hover:scale-110" />
                  <h3 className="font-semibold text-gray-900">Parish Search</h3>
                </Link>
              )}
            </div>
          </div>

          {isOwner && (
            <div className="bg-white border-l-4 border-[#2373F4] rounded-xl p-5 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="text-gray-900 flex-shrink-0 mt-0.5" size={24} />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Rent Your House!</h3>
                    <p className="text-gray-700 text-sm">
                      Dosnine finds and helps place a tenants in that vacant property.
                    </p>
                  </div>
                </div>
                <Link
                  href="/agent/payment"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2373F4] text-white font-semibold rounded-lg hover:opacity-90 transition text-sm whitespace-nowrap"
                >
                  Rent Your House
                </Link>
              </div>
            </div>
          )}

          {advertisements.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Your Advertisements</h2>
                </div>
                <Link href="/advertise" className="inline-flex items-center justify-center rounded-lg bg-[#2373F4] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                  Create Ad
                </Link>
              </div>

              <div className="space-y-3">
                {advertisements.map((ad) => (
                  <div key={ad.id} className={`${ad.is_active ? 'bg-white' : 'bg-gray-50'} rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
                    <div>
                      <p className="font-semibold text-gray-900">{ad.title || ad.company_name || 'Advertisement'}</p>
                      <p className="text-sm text-gray-700">
                        {ad.is_active ? 'Live and approved' : 'Pending or inactive'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Expires: {ad.expires_at ? new Date(ad.expires_at).toLocaleDateString() : 'No expiry date'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                      <div className="text-xs sm:text-sm text-right">
                        <p className="font-semibold text-gray-700">{Number(ad.impressions || 0).toLocaleString()} views</p>
                        <p className="font-semibold text-gray-700">{Number(ad.clicks || 0).toLocaleString()} clicks</p>
                      </div>
                      {ad.is_active ? (
                        <Link href={`/ads/${ad.id}`} className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100">
                          View Ad
                        </Link>
                      ) : (
                        <span className="text-xs font-medium text-gray-500">Not live</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adInquiries.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-900">Leads From ADS</p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">{adInquiries.length}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {adInquiries.slice(0, 10).map((inquiry) => (
                  <div key={inquiry.id} className="rounded-lg bg-gray-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 truncate font-semibold text-gray-900">{inquiry.advertisements?.title || inquiry.advertisements?.company_name || 'Advertisement enquiry'}</p>
                      <span className="rounded-full bg-[#2373F4]/10 px-2 py-1 text-xs font-semibold capitalize text-[#2373F4]">{inquiry.status}</span>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-5 text-gray-700">{inquiry.message}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-200 pt-3 text-xs text-gray-600">
                      <span className="font-semibold text-gray-900">{inquiry.client_name}</span>
                      <a
                        href={`mailto:${inquiry.client_email}`}
                        className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 font-semibold text-gray-700 transition hover:text-[#2373F4]"
                      >
                        <Mail className="h-3.5 w-3.5" /> Email
                      </a>
                      {inquiry.client_phone && (
                        <a
                          href={`tel:${inquiry.client_phone}`}
                          className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 font-semibold text-gray-700 transition hover:text-[#2373F4]"
                        >
                          <Phone className="h-3.5 w-3.5" /> Call
                        </a>
                      )}
                      <span className="ml-auto text-gray-500">{new Date(inquiry.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isOwner && isFreePlan() && (
            <div className="rounded-xl border-l-4 border-[#2373F4] bg-white p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-[#2373F4] flex-shrink-0 mt-0.5" size={24} />
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">Free Plan - Limited Access</h3>
                  <p className="text-gray-700 text-sm mb-3">
                    Upgrade your plan to access higher-value properties and buyer inquiries.
                  </p>
                  <Link
                    href="/agent/payment"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#2373F4] text-white font-semibold rounded-lg hover:opacity-90 transition text-sm"
                  >
                    <CreditCard className="w-5 h-5" />
                    Upgrade
                  </Link>
                </div>
              </div>
            </div>
          )}

          {!isOwner && isAccessExpired() && (
            <div className="bg-white border-l-4 border-[#2373F4] rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-[#2373F4] flex-shrink-0 mt-0.5" size={24} />
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">Access Expired</h3>
                  <p className="text-gray-700 text-sm mb-3">
                    Your {agentData.payment_status} access has expired. Upgrade your plan to continue receiving new client requests.
                  </p>
                  <Link
                    href="/agent/payment"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#2373F4] text-white font-semibold rounded-lg hover:opacity-90 transition text-sm"
                  >
                    <CreditCard className="w-5 h-5" />
                    Upgrade Access Plan
                  </Link>
                </div>
              </div>
            </div>
          )}

          {!isOwner && (
            <>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900">Request Stats</h2>
                <SectionHint message="Snapshot of your pipeline across all client requests: totals, in-progress, and completed." />
              </div>
              <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                <div className="flex items-center justify-between rounded-2xl bg-white p-5">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Requests</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900">{stats.total}</p>
                  </div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                    <Users className="h-6 w-6 text-gray-700" aria-hidden="true" />
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white p-5">
                  <div>
                    <p className="text-sm font-medium text-gray-500">In Progress</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-[#2373F4]">{stats.assigned}</p>
                  </div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                    <Clock className="h-6 w-6 text-[#2373F4]" aria-hidden="true" />
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white p-5">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Completed</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900">{stats.completed}</p>
                  </div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                    <CheckCircle className="h-6 w-6 text-gray-700" aria-hidden="true" />
                  </span>
                </div>
              </div>

              <div className="mb-8 rounded-2xl bg-gray-100 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</span>
                    {['all', 'assigned', 'completed'].map((status) => {
                      const count = status === 'all' ? stats.total : status === 'assigned' ? stats.assigned : stats.completed;
                      const label = status === 'assigned' ? 'In progress' : status.charAt(0).toUpperCase() + status.slice(1);
                      const isActive = filterStatus === status;
                      return (
                        <button
                          key={status}
                          onClick={() => setFilterStatus(status)}
                          aria-pressed={isActive}
                          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${isActive ? 'bg-[#2373F4] text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}`}
                        >
                          {label}
                          <span className={`rounded-md px-1.5 py-0.5 text-xs ${isActive ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Urgency</span>
                    {['all', 'normal', 'urgent'].map((urgency) => {
                      const isActive = filterUrgency === urgency;
                      return (
                        <button
                          key={urgency}
                          onClick={() => setFilterUrgency(urgency)}
                          aria-pressed={isActive}
                          className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${isActive ? 'bg-[#2373F4] text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}`}
                        >
                          {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {!isAdminDashboardView && <AgentSharedBuyerRequests />}

              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900">Requests</h2>
                <SectionHint message="Active client requests routed to you. Update status, add notes, or release to the next agent." />
                {!loading && (
                  <span className="rounded-lg bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700">
                    {filteredRequests.length}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="rounded-2xl bg-white py-12 text-center">
                  <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#2373F4]"></div>
                  <p className="text-sm text-gray-600">Loading requests...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="rounded-2xl bg-white py-12 text-center">
                  <Users className="mx-auto mb-4 h-14 w-14 text-gray-300" />
                  <p className="mb-2 font-semibold text-gray-700">No client requests found</p>
                  <p className="text-sm text-gray-500">
                    {filterStatus !== 'all' ? `No ${filterStatus === 'assigned' ? 'in progress' : filterStatus} requests` : 'Client requests will appear here'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {filteredRequests.map((request) => {
                    const buyerPrequal = request.buyer_prequalification || null;
                    const readiness = request.buyer_readiness || buyerPrequal || null;
                    const hasBuyerDetails =
                      buyerPrequal &&
                      (buyerPrequal.purchase_method ||
                        buyerPrequal.target_property_price != null ||
                        buyerPrequal.monthly_income != null ||
                        buyerPrequal.deposit_available != null ||
                        buyerPrequal.lender_name);

                    return (
                      <article
                        key={request.id}
                        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
                      >
                        {/* ---- Header ---- */}
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold capitalize text-gray-900">
                            {request.request_type?.charAt(0).toUpperCase() + request.request_type?.slice(1)} · {request.property_type}
                          </h3>
                          <span
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${
                              request.status === 'completed'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-[#2373F4]/10 text-[#2373F4]'
                            }`}
                          >
                            {request.status?.replace('_', ' ')}
                          </span>
                          {readiness && (
                            <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
                              Buyer readiness · Level {readiness.qualification_level ?? 0}
                            </span>
                          )}
                          {request.urgency === 'urgent' && (
                            <span className="rounded-lg bg-[#2373F4]/10 px-2.5 py-1 text-xs font-semibold text-[#2373F4]">
                              Urgent
                            </span>
                          )}
                          <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700">
                            <Calendar size={12} />
                            <span className="font-semibold text-gray-900">Submitted </span>
                            {new Date(request.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>

                        {/* ---- Details grid ---- */}
                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600 sm:grid-cols-4">
                          <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Location</p>
                            <p className="mt-0.5 flex items-center gap-1 font-semibold text-gray-900">
                              <MapPin size={12} className="shrink-0 text-gray-400" />
                              <span className="truncate">{request.location || '—'}</span>
                            </p>
                          </div>
                          <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Budget</p>
                            <p className="mt-0.5 font-semibold text-gray-900">
                              {request.budget_min && request.budget_max
                                ? `J$${Number(request.budget_min).toLocaleString()} – J$${Number(request.budget_max).toLocaleString()}`
                                : request.budget_max
                                  ? `up to J$${Number(request.budget_max).toLocaleString()}`
                                  : request.budget_min
                                    ? `from J$${Number(request.budget_min).toLocaleString()}`
                                    : '—'}
                            </p>
                          </div>
                          <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Bedrooms</p>
                            <p className="mt-0.5 flex items-center gap-1 font-semibold text-gray-900">
                              <Bed size={12} className="shrink-0 text-gray-400" />
                              {request.bedrooms ?? '—'}
                            </p>
                          </div>
                          <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Bathrooms</p>
                            <p className="mt-0.5 flex items-center gap-1 font-semibold text-gray-900">
                              <Bath size={12} className="shrink-0 text-gray-400" />
                              {request.bathrooms ?? '—'}
                            </p>
                          </div>
                        </div>

                        {/* ---- Buyer readiness summary ---- */}
                        {readiness && (
                          <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Buyer readiness</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-800">
                              <span className="font-semibold capitalize">
                                {readiness.status?.replaceAll('_', ' ') || '—'}
                              </span>
                              <span className="text-gray-300">·</span>
                              <span>Level {readiness.qualification_level ?? 0}</span>
                              {readiness.financing_progress && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  <span className="capitalize">{readiness.financing_progress.replaceAll('_', ' ')}</span>
                                </>
                              )}
                            </div>
                            {(readiness.verified_budget_min != null || readiness.verified_budget_max != null) && (
                              <p className="mt-1 text-xs text-gray-700">
                                <span className="font-semibold text-gray-900">Verified budget: </span>
                                {readiness.verified_budget_min == null
                                  ? '—'
                                  : `J$${Number(readiness.verified_budget_min).toLocaleString()}`}
                                {' – '}
                                {readiness.verified_budget_max == null
                                  ? '—'
                                  : `J$${Number(readiness.verified_budget_max).toLocaleString()}`}
                              </p>
                            )}
                          </div>
                        )}

                        {/* ---- Buyer prequalification details ---- */}
                        {hasBuyerDetails && (
                          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                              Buyer prequalification
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 sm:grid-cols-3">
                              {buyerPrequal.purchase_method && (
                                <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Purchase method</p>
                                  <p className="mt-0.5 font-semibold capitalize text-gray-900">
                                    {buyerPrequal.purchase_method.replaceAll('_', ' ')}
                                  </p>
                                </div>
                              )}
                              {buyerPrequal.target_property_price != null && (
                                <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Target price</p>
                                  <p className="mt-0.5 font-semibold text-gray-900">
                                    J${Number(buyerPrequal.target_property_price).toLocaleString()}
                                  </p>
                                </div>
                              )}
                              {buyerPrequal.monthly_income != null && (
                                <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Monthly income</p>
                                  <p className="mt-0.5 font-semibold text-gray-900">
                                    J${Number(buyerPrequal.monthly_income).toLocaleString()}
                                  </p>
                                </div>
                              )}
                              {buyerPrequal.deposit_available != null && (
                                <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Deposit available</p>
                                  <p className="mt-0.5 font-semibold text-gray-900">
                                    J${Number(buyerPrequal.deposit_available).toLocaleString()}
                                  </p>
                                </div>
                              )}
                              {buyerPrequal.lender_name && (
                                <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Lender</p>
                                  <p className="mt-0.5 font-semibold text-gray-900">{buyerPrequal.lender_name}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ---- Description ---- */}
                        {request.description && (
                          <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                            {request.description}
                          </p>
                        )}

                        {/* ---- Contact ---- */}
                        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">Client</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-700">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <Users size={13} className="shrink-0 text-gray-400" />
                              <span className="truncate font-semibold text-gray-900">{request.client_name}</span>
                            </div>
                            <a
                              href={`mailto:${request.client_email}`}
                              className="inline-flex items-center gap-1.5 hover:text-[#2373F4]"
                            >
                              <Mail size={13} className="shrink-0 text-gray-400" />
                              <span className="truncate">{request.client_email}</span>
                            </a>
                            {request.client_phone && (
                              <a
                                href={`tel:${request.client_phone}`}
                                className="inline-flex items-center gap-1.5 hover:text-[#2373F4]"
                              >
                                <Phone size={13} className="shrink-0 text-gray-400" />
                                <span>{request.client_phone}</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* ---- Documents ---- */}
                        {request.buyer_documents?.length > 0 && (
                          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                              Supporting documents ({request.buyer_documents.length})
                            </p>
                            <div className="space-y-2">
                              {request.buyer_documents.map((document) => (
                                <div
                                  key={document.id}
                                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2.5"
                                >
                                  <FileText size={14} className="shrink-0 text-gray-500" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-gray-900">
                                      {document.file_name}
                                    </p>
                                    <p className="text-[10px] capitalize text-gray-500">
                                      {String(document.document_type || '').replaceAll('_', ' ') || document.status}
                                    </p>
                                  </div>
                                  <a
                                    href={`/api/agent/buyer-documents/${encodeURIComponent(document.id)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-gray-700 hover:text-[#2373F4]"
                                  >
                                    <ExternalLink size={12} /> Open
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ---- Latest note ---- */}
                        {request.comment && (
                          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                              Latest note
                            </p>
                            <p className="text-sm text-gray-700">
                              {request.comment}
                              <span className="text-gray-500"> — {agentData?.name || 'Agent'}</span>
                              {request.comment_updated_at && (
                                <span className="text-gray-400"> · {getRelativeTime(request.comment_updated_at)}</span>
                              )}
                            </p>
                          </div>
                        )}

                        {/* ---- Actions ---- */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2373F4] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 sm:flex-none"
                          >
                            View details
                          </button>
                          {!isAdminDashboardView && request.status !== 'completed' && (
                            <>
                              <button
                                onClick={() => handleRequestAction(request.id, 'complete')}
                                disabled={actionLoading}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 sm:flex-none"
                                title="Mark as Complete"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Complete
                              </button>
                              <button
                                onClick={() => handleRequestAction(request.id, 'release')}
                                disabled={actionLoading}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 sm:flex-none"
                                title="Release to Next Agent"
                              >
                                <RotateCcw className="h-4 w-4" />
                                Release
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowCommentModal(true);
                                }}
                                disabled={actionLoading}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 sm:flex-none"
                                title="Add note"
                              >
                                <MessageCircle className="h-4 w-4" />
                                Add note
                              </button>
                              <button
                                onClick={() => handleRequestAction(request.id, 'contacted')}
                                disabled={actionLoading}
                                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition disabled:opacity-50 sm:flex-none ${
                                  request.is_contacted
                                    ? 'bg-[#2373F4]/10 text-[#2373F4] hover:bg-[#2373F4]/15'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                title={request.is_contacted ? 'Contacted' : 'Not contacted'}
                              >
                                <PhoneIcon className="h-4 w-4" />
                                {request.is_contacted ? 'Contacted' : 'Mark contacted'}
                              </button>
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreateRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-request-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 sm:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2373F4]">New client lead</p>
                <h2 id="create-request-title" className="mt-1 text-2xl font-bold text-gray-950">Create a request</h2>
                <p className="mt-2 text-sm text-gray-600">The request will be assigned directly to your dashboard.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateRequestModal(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleCreateRequest} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['clientName', 'Client name', 'text'],
                  ['clientEmail', 'Client email', 'email'],
                  ['clientPhone', 'Client phone', 'tel'],
                  ['location', 'Location', 'text'],
                ].map(([field, label, type]) => (
                  <label key={field} className="block text-sm font-medium text-gray-700">
                    {label}
                    <input
                      required
                      type={type}
                      value={newRequest[field]}
                      onChange={(event) => setNewRequest((current) => ({ ...current, [field]: event.target.value }))}
                      className="mt-1.5 w-full rounded-xl bg-gray-50 px-4 py-3 text-gray-900 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-[#2373F4]"
                    />
                  </label>
                ))}
                <label className="block text-sm font-medium text-gray-700">
                  Request type
                  <select
                    value={newRequest.requestType}
                    onChange={(event) => setNewRequest((current) => ({ ...current, requestType: event.target.value }))}
                    className="mt-1.5 w-full rounded-xl bg-gray-50 px-4 py-3 text-gray-900 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-[#2373F4]"
                  >
                    {['buy', 'rent', 'sell', 'lease', 'valuation'].map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Property type
                  <select
                    value={newRequest.propertyType}
                    onChange={(event) => setNewRequest((current) => ({ ...current, propertyType: event.target.value }))}
                    className="mt-1.5 w-full rounded-xl bg-gray-50 px-4 py-3 text-gray-900 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-[#2373F4]"
                  >
                    {['house', 'apartment', 'land', 'commercial', 'other'].map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Minimum budget (JMD)
                  <input type="number" min="0" value={newRequest.budgetMin} onChange={(event) => setNewRequest((current) => ({ ...current, budgetMin: event.target.value }))} className="mt-1.5 w-full rounded-xl bg-gray-50 px-4 py-3 text-gray-900 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-[#2373F4]" />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Maximum budget (JMD)
                  <input type="number" min="0" value={newRequest.budgetMax} onChange={(event) => setNewRequest((current) => ({ ...current, budgetMax: event.target.value }))} className="mt-1.5 w-full rounded-xl bg-gray-50 px-4 py-3 text-gray-900 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-[#2373F4]" />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Bedrooms
                  <input type="number" min="0" value={newRequest.bedrooms} onChange={(event) => setNewRequest((current) => ({ ...current, bedrooms: event.target.value }))} className="mt-1.5 w-full rounded-xl bg-gray-50 px-4 py-3 text-gray-900 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-[#2373F4]" />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Bathrooms
                  <input type="number" min="0" value={newRequest.bathrooms} onChange={(event) => setNewRequest((current) => ({ ...current, bathrooms: event.target.value }))} className="mt-1.5 w-full rounded-xl bg-gray-50 px-4 py-3 text-gray-900 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-[#2373F4]" />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Urgency
                  <select
                    value={newRequest.urgency}
                    onChange={(event) => setNewRequest((current) => ({ ...current, urgency: event.target.value }))}
                    className="mt-1.5 w-full rounded-xl bg-gray-50 px-4 py-3 text-gray-900 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-[#2373F4]"
                  >
                    {['low', 'normal', 'high', 'urgent'].map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-medium text-gray-700">
                Notes
                <textarea rows={4} value={newRequest.description} onChange={(event) => setNewRequest((current) => ({ ...current, description: event.target.value }))} className="mt-1.5 w-full resize-y rounded-xl bg-gray-50 px-4 py-3 text-gray-900 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-[#2373F4]" />
              </label>
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowCreateRequestModal(false)} className="rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200">
                  Cancel
                </button>
                <button type="submit" disabled={createRequestLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2373F4] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
                  <Plus className="h-4 w-4" />
                  {createRequestLoading ? 'Creating…' : 'Create request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Request Details</h2>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Request Type</h3>
                <p className="text-gray-700">
                  {selectedRequest.request_type.toUpperCase()} - {selectedRequest.property_type}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Client Information</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Name:</strong> {selectedRequest.client_name}</p>
                  <p><strong>Email:</strong> {selectedRequest.client_email}</p>
                  <p><strong>Phone:</strong> {selectedRequest.client_phone}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Property Details</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Location:</strong> {selectedRequest.location}</p>
                  {selectedRequest.budget_min && (
                    <p><strong>Budget:</strong> ${selectedRequest.budget_min?.toLocaleString()} - ${selectedRequest.budget_max?.toLocaleString()}</p>
                  )}
                  {selectedRequest.bedrooms && <p><strong>Bedrooms:</strong> {selectedRequest.bedrooms}</p>}
                  {selectedRequest.bathrooms && <p><strong>Bathrooms:</strong> {selectedRequest.bathrooms}</p>}
                  <p><strong>Urgency:</strong> {selectedRequest.urgency}</p>
                </div>
              </div>

              {selectedRequest.buyer_readiness && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <h3 className="font-semibold text-gray-900">Verified buyer readiness</h3>
                  <p className="mt-1 text-sm text-gray-700">
                    Level {selectedRequest.buyer_readiness.qualification_level} · Verified budget{' '}
                    {selectedRequest.buyer_readiness.verified_budget_min == null
                      ? '—'
                      : `J$${Number(selectedRequest.buyer_readiness.verified_budget_min).toLocaleString()}`}
                    {' - '}
                    {selectedRequest.buyer_readiness.verified_budget_max == null
                      ? '—'
                      : `J$${Number(selectedRequest.buyer_readiness.verified_budget_max).toLocaleString()}`}
                  </p>
                  {selectedRequest.buyer_readiness.financing_progress && (
                    <p className="mt-1 text-xs text-gray-700">
                      Financing progress: {selectedRequest.buyer_readiness.financing_progress.replaceAll('_', ' ')}
                    </p>
                  )}
                </div>
              )}

              {selectedRequest.description && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-sm text-gray-700">{selectedRequest.description}</p>
                </div>
              )}

              {selectedRequest.comment && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Agent Notes</h3>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-700 mb-2">{selectedRequest.comment}</p>
                    {selectedRequest.comment_updated_at && (
                      <p className="text-xs text-gray-500">
                        Last updated: {new Date(selectedRequest.comment_updated_at).toLocaleDateString()} at {new Date(selectedRequest.comment_updated_at).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t flex gap-3 flex-wrap">
                {!isAdminDashboardView && selectedRequest.status !== 'completed' && (
                  <>
                    <button
                      onClick={() => handleRequestAction(selectedRequest.id, 'complete')}
                      disabled={actionLoading}
                      className="flex-1 min-w-[100px] px-4 py-2 bg-[#2373F4] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Complete
                    </button>
                    <button
                      onClick={() => handleRequestAction(selectedRequest.id, 'release')}
                      disabled={actionLoading}
                      className="flex-1 min-w-[100px] px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Release
                    </button>
                    <button
                      onClick={() => setShowCommentModal(true)}
                      disabled={actionLoading}
                      className="flex-1 min-w-[100px] px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Comment
                    </button>
                    <button
                      onClick={() => handleRequestAction(selectedRequest.id, 'contacted')}
                      disabled={actionLoading}
                      className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 ${selectedRequest.is_contacted ? 'bg-[#2373F4]/10 text-[#2373F4] hover:bg-[#2373F4]/15' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      <PhoneIcon className="w-4 h-4" />
                      {selectedRequest.is_contacted ? 'Mark not contacted' : 'Mark contacted'}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="flex-1 min-w-[100px] px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {!isAdminDashboardView && showCommentModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add Comment</h2>
                <button
                  onClick={() => {
                    setShowCommentModal(false);
                    setCommentText('');
                    setSelectedRequest(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Request</h3>
                <p className="text-gray-700">
                  {selectedRequest.request_type?.toUpperCase() || 'Request'} - {selectedRequest.property_type}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Client: {selectedRequest.client_name}</h3>
                <p className="text-sm text-gray-600">{selectedRequest.client_email}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Your Comment
                </label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add any notes or comments about this request..."
                  rows="6"
                  className="w-full px-4 py-2 rounded-lg bg-gray-50 ring-1 ring-gray-200 focus:ring-2 focus:ring-[#2373F4] resize-none"
                />
              </div>

              {selectedRequest.comment && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Last comment:</p>
                  <p className="text-sm text-gray-700">{selectedRequest.comment}</p>
                  {selectedRequest.comment_updated_at && (
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(selectedRequest.comment_updated_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              <div className="pt-4 border-t flex gap-3">
                <button
                  onClick={() => handleCommentSubmit(selectedRequest.id)}
                  disabled={actionLoading || !commentText.trim()}
                  className="flex-1 px-4 py-2 bg-[#2373F4] text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
                >
                  Save Comment
                </button>
                <button
                  onClick={() => {
                    setShowCommentModal(false);
                    setCommentText('');
                    setSelectedRequest(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}