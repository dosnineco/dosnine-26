import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatMoney } from '../../lib/formatMoney';
import { getUserProfileByClerkId } from '../../lib/getUserProfile';
import { AlertCircle, Clock, XCircle, Briefcase, CheckCircle, Activity, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState({ properties: 0, applications: 0, activeListings: 0 });
  const [recentProperties, setRecentProperties] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [agentData, setAgentData] = useState(null);
  const [showAgentPrompt, setShowAgentPrompt] = useState(false);
  const [queueCount, setQueueCount] = useState(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [paidAgentCount, setPaidAgentCount] = useState(null);
  const [paidAgentLoading, setPaidAgentLoading] = useState(true);
  const [shouldLoadData, setShouldLoadData] = useState(false);

  const formatDate = (value) => {
    if (!value) return 'Not available';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString();
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

  async function checkUserStatus() {
    try {
      setRedirecting(true);
      
      // Check if user is an agent - minimal data fetch for redirect check only
      const { data: userData } = await supabase
        .from('users')
        .select('id, agent:agents(verification_status, payment_status, access_expiry, verification_submitted_at, created_at)')
        .eq('clerk_id', user.id)
        .single();

      if (userData?.agent) {
        const agent = Array.isArray(userData.agent) ? userData.agent[0] : userData.agent;
        
        // Handle agent redirects based on status
        const validPlans = ['free', '7-day', '30-day', '90-day'];
        const isApproved = agent?.verification_status === 'approved';
        const hasValidPlan = validPlans.includes(agent?.payment_status);
        
        if (isApproved && hasValidPlan) {
          // Redirect approved agents with valid plans to agent dashboard immediately
          router.replace('/agent/dashboard');
          return;
        }
        
        // Non-approved or plan-less agent can use regular dashboard
        setAgentData(agent);
        setShowAgentPrompt(false);
      } else {
        // Show prompt to become agent
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
      // Get user from database
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user.id)
        .single();

      if (!userData) return;

      // Fetch stats
      const { data: props } = await supabase
        .from('properties')
        .select('id, status')
        .eq('owner_id', userData.id);

      const { data: apps, count: appCount } = await supabase
        .from('applications')
        .select('id', { count: 'exact' })
        .in('property_id', (props || []).map((p) => p.id));

      setStats({
        properties: props?.length || 0,
        applications: appCount || 0,
        activeListings: props?.filter((p) => p.status === 'available').length || 0,
      });

      // Fetch recent properties
      const { data: recentProps } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', userData.id)
        .order('created_at', { ascending: false })
        ;

      setRecentProperties(recentProps || []);
      
      // Fetch user's service requests (if table exists)
      try {
        const { data: requests, error: requestsError } = await supabase
          .from('service_requests')
          .select('*')
          .eq('client_user_id', userData.id)
          .order('created_at', { ascending: false });

        if (!requestsError) {
          setServiceRequests(requests || []);
        } else {
          setServiceRequests([]);
        }
      } catch (reqErr) {
        setServiceRequests([]);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-3xl font-bold mb-8">Welcome, {user?.username || 'User'}!</h1>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
        </div>

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

        {/* Become Agent Prompt */}
        {!agentData && showAgentPrompt && (
          <div className="bg-gradient-to-r from-accent/10 to-accent/5 border-l-4 border-accent p-6 rounded-lg mb-8">
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

        {redirecting && (
          <div className="bg-white rounded-lg p-6 mb-8">
            <p className="text-gray-600">Checking your account and redirecting…</p>
          </div>
        )}

        {/* Stats Cards */}
        {!redirecting && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg  p-6">
            <div className="text-gray-600 text-sm font-semibold">Total Properties</div>
            <div className="text-4xl font-bold text-blue-600 mt-2">
              {agentData?.verification_status === 'approved' 
                ? `${stats.properties}/∞` 
                : `${stats.properties}/2`}
            </div>
          </div>
          <div className="bg-white rounded-lg  p-6">
            <div className="text-gray-600 text-sm font-semibold">Active Listings</div>
            <div className="text-4xl font-bold text-green-600 mt-2">{stats.activeListings}</div>
          </div>
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