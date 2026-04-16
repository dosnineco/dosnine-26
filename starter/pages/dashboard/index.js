import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import axios from 'axios';
import { formatMoney } from '../../lib/formatMoney';
import { Clock, XCircle, Briefcase, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState({ properties: 0, applications: 0, activeListings: 0 });
  const [recentProperties, setRecentProperties] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [advertisements, setAdvertisements] = useState([]);
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
  const [editingAdId, setEditingAdId] = useState(null);
  const [editingAdValues, setEditingAdValues] = useState({ title: '', description: '', phone: '', website: '' });
  const [adOperationLoading, setAdOperationLoading] = useState(false);
  const [adMessage, setAdMessage] = useState(null);

  const isApprovedAgent = (agent) => {
    const status = String(agent?.verification_status || '').trim().toLowerCase();
    return status === 'approved';
  };

  const formatDate = (value) => {
    if (!value) return 'Not available';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString();
  };

  const isRegularOwner = () => userType !== 'agent';

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
    if (!user?.id) return;
    checkUserStatus();
  }, [user, isLoaded]);

  // Only fetch queue count if user should see dashboard (not redirecting)
  useEffect(() => {
    if (!shouldLoadData) return;
    
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
  }, [shouldLoadData]);

  // Only fetch paid agents count if user should see dashboard (not redirecting)
  useEffect(() => {
    if (!shouldLoadData) return;
    
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
  }, [shouldLoadData]);

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

      const agent = Array.isArray(userData?.agent)
        ? (userData.agent[0] || null)
        : (userData?.agent || null);

      if (agent) {
        
        // Redirect verified agents to agent dashboard
        const isApproved = isApprovedAgent(agent);
        
        if (isApproved) {
          // Verified agents should not stay on the regular user dashboard
          router.replace('/agent/dashboard');
          return;
        }
        
        // Non-approved or plan-less agent can use regular dashboard
        setAgentData(agent);
        setShowAgentPrompt(false);
      } else {
        // Show prompt to become agent
        setAgentData(null);
        setShowAgentPrompt(true);
      }

      // User should see this dashboard - allow data loading
      setRedirecting(false);
      setShouldLoadData(true);
      fetchDashboardData();
    } catch (error) {
      setRedirecting(false);
      setShouldLoadData(true);
      fetchDashboardData();
    }
  }

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const { data: overview } = await axios.get('/api/dashboard/overview', { withCredentials: true });
      const payload = overview || {};
      const agent = Array.isArray(payload?.agent)
        ? (payload.agent[0] || null)
        : (payload?.agent || null);

      setAgentData(agent);
      setUserType(payload?.user?.user_type || 'landlord');
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
      setAdvertisements(Array.isArray(payload?.advertisements) ? payload.advertisements : []);
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
      setStats({ properties: 0, applications: 0, activeListings: 0 });
      setRecentProperties([]);
      setServiceRequests([]);
      setAdvertisements([]);
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
        <h1 className="text-3xl font-bold mb-8">Hi, {user?.username || 'User'}!</h1>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link
            href="/properties/my-listings"
            className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition"
          >
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">My Properties</h3>
              <p className="text-sm text-gray-500">View and manage your listings</p>
            </div>
          </Link>

          <Link
            href="/properties/new"
            className="flex items-center gap-4 bg-accent text-white rounded-lg p-6 hover:bg-accent/90 transition"
          >
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">Post a Property</h3>
              <p className="text-sm text-white/80">Add a new listing</p>
            </div>
          </Link>

          <Link
            href="/advertise"
            className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition"
          >
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Create an Ad</h3>
              <p className="text-sm text-gray-500">Reach buyers and renters fast</p>
            </div>
          </Link>
        </div>

          {/* Become Agent Prompt */}
        {!agentData && showAgentPrompt && !pendingAdVerificationAt && (
          <div className="bg-blue-50 border-l-4 border-accent p-6 rounded-lg mb-8">
            <div className="flex items-start gap-3">
              <Briefcase className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Become a Verified Agent
                </h3>
                <p className="text-gray-700 mb-3">
                  Connect with clients, post unlimited properties, and grow your business!
                </p>
                <Link
                  href="/agent/signup"
                  className="btn-accent inline-block"
                >
                  Apply Now
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Agent Status Banner */}
        {agentData && (
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
                      We're reviewing your application. You'll receive an email within 24 hours.
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

        {pendingAdVerificationAt && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg mb-8">
            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-1">
                  Advertisement Verification Pending
                </h3>
                <p className="text-blue-700 mb-2">
                  Your ad payment is under review. Verification usually completes within 24 hours.
                </p>
                <p className="text-sm text-blue-600">
                  Submitted: {formatDate(pendingAdVerificationAt)}
                </p>
              </div>
            </div>
          </div>
        )}

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

          {advertisements.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-600">
              You don't have any ads yet. Create one now to start promoting your business.
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

    

        {redirecting && (
          <div className="bg-white rounded-lg p-6 mb-8">
            <p className="text-gray-600">Checking your account and redirecting…</p>
          </div>
        )}

        {/* Stats Cards */}
        {/* {!redirecting && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg  p-6">
            <div className="text-gray-600 text-sm font-semibold">Total Properties</div>
            <div className="text-4xl font-bold text-blue-600 mt-2">
              {agentData?.verification_status === 'approved' 
                ? `${stats.properties}/∞` 
                : `${stats.properties}/2`}
            </div>
          </div> */}


          {/* <div className="bg-white rounded-lg  p-6">
            <div className="text-gray-600 text-sm font-semibold">Active Listings</div>
            <div className="text-4xl font-bold text-green-600 mt-2">
              {agentData?.verification_status === 'approved'
                ? `${stats.activeListings}/∞`
                : `${stats.activeListings}/2`}
            </div>
          </div> */}
          {/* <div className="bg-white rounded-lg p-6">
            <div className="text-gray-600 text-sm font-semibold">Active Ads</div>
            <div className="text-4xl font-bold text-purple-600 mt-2">
              {adStats.activeAds || 0}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Verified: {adStats.verifiedAds || 0} · Pending: {adStats.pendingAds || 0}
            </p>
          </div>
        </div>
        )} */}

            {/* {!redirecting && (
          <div className="bg-gray-100 rounded-lg p-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create More Ads</h2>
              <p className="text-sm text-gray-700 mt-1">
                Reach at least 25,000 weekly visitors and keep your business in front of active clients.
              </p>
            </div>
            <Link
              href="/advertise"
              className="inline-flex items-center justify-center bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl px-5 py-3"
            >
              Create Ad Campaign
            </Link>
          </div>
        )} */}


        {!redirecting && adStats.verifiedAds > 0 && (
          <div className="bg-white rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Ad Performance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total Views</p>
                <p className="text-3xl font-bold text-blue-700">{Number(adStats.totalViews || 0).toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total Clicks</p>
                <p className="text-3xl font-bold text-green-700">{Number(adStats.totalClicks || 0).toLocaleString()}</p>
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
                      <p className="text-blue-700 font-semibold">{Number(ad.impressions || 0).toLocaleString()} views</p>
                      <p className="text-green-700 font-semibold">{Number(ad.clicks || 0).toLocaleString()} clicks</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No active verified ads yet.</p>
            )}
          </div>
        )}

    
  

        {/* Service Requests Section */}
        {!redirecting && serviceRequests.length > 0 && (
          <div className="bg-white rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Your Agent Requests</h2>
            <div className="space-y-4">
              {serviceRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {request.request_type.toUpperCase()} - {request.property_type}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      request.status === 'open' 
                        ? 'bg-blue-100 text-blue-800'
                        : request.status === 'withdrawn'
                        ? 'bg-gray-100 text-gray-800'
                        : request.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{request.location}</p>
                  {request.description && (
                    <p className="text-sm text-gray-700 mb-3">{request.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Created: {new Date(request.created_at).toLocaleDateString()}
                    </p>
                    {request.status === 'open' && (
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to withdraw this request?')) {
                            try {
                              await fetch('/api/service-requests/withdraw', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  clerkId: user.id,
                                  requestId: request.id
                                })
                              });
                              fetchDashboardData();
                            } catch (error) {
                            }
                          }
                        }}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Withdraw Request
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

    

        {/* Recent Properties */}
        {!redirecting && (
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Recent Properties</h2>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : recentProperties.length === 0 ? (
            <p className="text-gray-500">You haven't posted any properties yet.</p>
          ) : (
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
                      <td className="py-3 px-4">{formatMoney(prop.price)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(prop.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <Link href={`/property/${prop.slug}`} className="text-blue-600 hover:underline block">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}
      </div>
    </>
  );
}