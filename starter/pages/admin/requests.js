import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { FiTrash2 } from 'react-icons/fi';
import { MessageCircle, Phone as PhoneIcon } from 'lucide-react';
import AutoAssignModal from '../../components/AutoAssignModal';
import BudgetRejectionEmailer from '../../components/BudgetRejectionEmailer';

export default function AdminRequestsPage() {
  const { user } = useUser();
  const [requests, setRequests] = useState([]);
  const [agents, setAgents] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAutoAssign, setShowAutoAssign] = useState(false);
  const [autoAssignAgentId, setAutoAssignAgentId] = useState('');
  const [autoAssignCount, setAutoAssignCount] = useState(5);
  const [autoIncludeBuys, setAutoIncludeBuys] = useState(false);
  const [autoAssignLoading, setAutoAssignLoading] = useState(false);
  const [showBudgetRejectionEmailer, setShowBudgetRejectionEmailer] = useState(false);
  const [autoBudgetMin, setAutoBudgetMin] = useState(10000);
  const [autoBudgetMax, setAutoBudgetMax] = useState(100000000);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) return;
    
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('role, email, full_name')
        .eq('clerk_id', user.id)
        .single();

      if (error) throw error;

      // SECURITY FIX: Verify admin has valid data (not NULL)
      if (userData?.role === 'admin') {
        if (!userData.email || !userData.full_name) {
          console.error('❌ SECURITY: Admin user has NULL data');
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        setIsAdmin(true);
        fetchData();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch service requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('service_requests')
        .select(`
          *,
          agent:assigned_agent_id(
            id,
            business_name,
            users:user_id(
              full_name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch visitor budgets to backfill missing request budgets (two lead sources)
      const { data: visitorBudgetsData, error: visitorBudgetsError } = await supabase
        .from('visitor_emails')
        .select('email, budget_min');

      if (visitorBudgetsError) throw visitorBudgetsError;

      const visitorBudgetMap = Object.create(null);
      visitorBudgetsData?.forEach((v) => {
        if (v.email) {
          visitorBudgetMap[String(v.email).toLowerCase()] = v.budget_min;
        }
      });

      // Flatten the nested structure for easier access
      const flattenedRequests = requestsData?.map(req => ({
        ...req,
        // Prefer service_request budget; fallback to visitor_emails budget_min if missing
        budget_min: req.budget_min ?? visitorBudgetMap[String(req.client_email || '').toLowerCase()] ?? null,
        budget_max: req.budget_max ?? req.budget_min ?? visitorBudgetMap[String(req.client_email || '').toLowerCase()] ?? null,
        agent: req.agent ? {
          id: req.agent.id,
          business_name: req.agent.business_name,
          full_name: req.agent.users?.full_name || req.agent.business_name || 'Unknown Agent',
          email: req.agent.users?.email || 'No email'
        } : null
      })) || [];

      setRequests(flattenedRequests);

      // Fetch approved agents for assignment dropdown (include plan + expiry)
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select(`
          id,
          business_name,
          user_id,
          last_request_assigned_at,
          payment_status,
          access_expiry,
          service_areas,
          users:user_id(
            full_name,
            email
          )
        `)
        .eq('verification_status', 'approved')
        .order('last_request_assigned_at', { ascending: true, nullsFirst: true });

      if (agentsError) throw agentsError;

      // Flatten agents data
      const flattenedAgents = agentsData?.map(agent => ({
        id: agent.id,
        business_name: agent.business_name,
        full_name: agent.users?.full_name || agent.business_name || 'Unnamed Agent',
        email: agent.users?.email || 'No email',
        last_request_assigned_at: agent.last_request_assigned_at,
        payment_status: agent.payment_status,
        access_expiry: agent.access_expiry,
        service_areas: agent.service_areas || ''
      })) || [];

      setAgents(flattenedAgents);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Helpers: plan/eligibility checks
  const isActivePaid = (agent) => {
    const paid = ['7-day', '30-day', '90-day'].includes(agent.payment_status);
    if (!paid) return false;
    if (!agent.access_expiry) return false;
    return new Date(agent.access_expiry) > new Date();
  };

  const locationMatchesServiceArea = (agentAreas, requestLocation) => {
    if (!agentAreas) return false;
    if (!requestLocation) return true; // If no location, allow
    const a = String(agentAreas).toLowerCase();
    const r = String(requestLocation).toLowerCase();
    return a.includes(r) || r.includes(a);
  };

  const canAgentHandleRequest = (agent, request) => {
    // Common: must be approved (queried) and within service area
    if (!locationMatchesServiceArea(agent.service_areas, request.location)) return false;

    const type = request.request_type;
    const budget = Number(request.budget_max || request.budget_min || 0);

    // Free: only rentals up to 80k, no buy/sell
    if (agent.payment_status === 'free') {
      if (type !== 'rent') return false;
      return budget <= 80000;
    }

    // Paid but expired: not eligible
    if (!isActivePaid(agent)) return false;

    // 7-day restrictions
    if (agent.payment_status === '7-day') {
      if (type === 'sell') return false; // No sales leads
      if (type === 'rent') return budget <= 100000;
      if (type === 'buy') return budget <= 10000000; // <= J$10M buys
      return false;
    }

    // 30-day & 90-day: full access while active
    return ['30-day', '90-day'].includes(agent.payment_status);
  };

  const handleManualAssign = async (requestId, agentId) => {
    setAssignLoading(true);
    try {
      const request = requests.find(r => r.id === requestId);
      const agent = agents.find(a => a.id === agentId);
      if (agent && request && !canAgentHandleRequest(agent, request)) {
        throw new Error('Agent plan does not allow this request');
      }
      const now = new Date().toISOString();

      // Only update assignment-related fields - never touch required fields
      const updatePayload = {
        assigned_agent_id: agentId || null,
        status: agentId ? 'assigned' : 'open',
        assigned_at: agentId ? now : null
      };

      const { error: updateError, data } = await supabase
        .from('service_requests')
        .update(updatePayload)
        .eq('id', requestId)
        .select();

      if (updateError) {
        console.error('❌ DB Error:', updateError);
        throw new Error(updateError.message || 'Database update failed');
      }

      // Update agent's last assignment timestamp
      if (agentId) {
        const { error: agentError } = await supabase
          .from('agents')
          .update({ last_request_assigned_at: now })
          .eq('id', agentId);

        if (agentError) {
          console.warn(' Agent timestamp update failed:', agentError);
        }
      }

      toast.success(agentId ? 'Request assigned!' : 'Request unassigned!');
      
      // Refresh data after a short delay
      setTimeout(() => fetchData(), 200);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    if (!autoAssignAgentId) {
      toast.error('Select an agent to assign');
      return;
    }

    const limit = Math.max(1, Number(autoAssignCount) || 0);
    const selectedAgent = agents.find(a => a.id === autoAssignAgentId);
    if (!selectedAgent) {
      toast.error('Selected agent not found');
      return;
    }

    const candidates = requests
      .filter((r) => r.status === 'open')
      .filter((r) => (autoIncludeBuys ? true : r.request_type !== 'buy'))
      .filter((r) => {
        // Budget filter: check if request budget falls within the selected range
        const budgetMax = Number(r.budget_max || r.budget_min || 0);
        return budgetMax >= autoBudgetMin && budgetMax <= autoBudgetMax;
      })
      .filter((r) => canAgentHandleRequest(selectedAgent, r))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(0, limit);

    if (!candidates.length) {
      toast.error('No eligible open requests for this agent with selected budget range');
      return;
    }

    setAutoAssignLoading(true);
    const now = new Date().toISOString();
    const ids = candidates.map((r) => r.id);

    try {
      const { error } = await supabase
        .from('service_requests')
        .update({
          assigned_agent_id: autoAssignAgentId,
          status: 'assigned',
          assigned_at: now,
        })
        .in('id', ids)
        .eq('status', 'open');

      if (error) throw error;

      const { error: agentError } = await supabase
        .from('agents')
        .update({ last_request_assigned_at: now })
        .eq('id', autoAssignAgentId);

      if (agentError) {
        console.warn('Agent timestamp update failed:', agentError);
      }

      toast.success(`Assigned ${ids.length} request${ids.length === 1 ? '' : 's'}.`);
      setShowAutoAssign(false);
      setAutoAssignAgentId('');
      setAutoAssignCount(5);
      setAutoIncludeBuys(false);
      setAutoBudgetMin(10000);
      setAutoBudgetMax(100000000);
      setAutoAssignCount(5);
      setAutoIncludeBuys(false);
      setTimeout(() => fetchData(), 200);
    } catch (err) {
      console.error('Auto-assign error:', err);
      toast.error('Failed to auto-assign');
    } finally {
      setAutoAssignLoading(false);
    }
  };

  const handleCommentSubmit = async (requestId) => {
    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      const { error } = await supabase
        .from('service_requests')
        .update({
          comment: commentText,
          comment_updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Comment saved successfully!');
      setShowCommentModal(false);
      setCommentText('');
      setTimeout(() => fetchData(), 200);
    } catch (err) {
      console.error('Comment error:', err);
      toast.error('Failed to save comment');
    }
  };

  const handleContactedToggle = async (requestId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({
          is_contacted: !currentStatus,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success(`Request marked as ${!currentStatus ? 'contacted' : 'not contacted'}!`);
      setTimeout(() => fetchData(), 200);
    } catch (err) {
      console.error('Contacted toggle error:', err);
      toast.error('Failed to update contacted status');
    }
  };

  const handleReactivateCase = async (requestId) => {
    if (!confirm('Are you sure you want to reactivate this completed case?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('service_requests')
        .update({
          status: 'assigned',
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Case reactivated successfully!');
      setTimeout(() => fetchData(), 200);
    } catch (err) {
      console.error('Reactivate error:', err);
      toast.error('Failed to reactivate case');
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!confirm('Are you sure you want to permanently delete this request?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('service_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request deleted successfully!');
      setTimeout(() => fetchData(), 200);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  // Format phone number for WhatsApp - ensure 11 digits with 1876 prefix
  const formatWhatsAppNumber = (phone) => {
    if (!phone) return '';
    
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 1876, it's already correct format
    if (cleaned.startsWith('1876') && cleaned.length === 11) {
      return cleaned;
    }
    
    // If starts with 876, add 1 prefix
    if (cleaned.startsWith('876')) {
      return '1' + cleaned;
    }
    
    // If starts with 1 and is 11 digits, assume it's correct
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      return cleaned;
    }
    
    // If 10 digits starting with 876
    if (cleaned.length === 10 && cleaned.startsWith('876')) {
      return '1' + cleaned;
    }
    
    // If 7 digits, add 1876 prefix
    if (cleaned.length === 7) {
      return '1876' + cleaned;
    }
    
    // If none of the above, try to make it 1876 + last 7 digits
    if (cleaned.length >= 7) {
      return '1876' + cleaned.slice(-7);
    }
    
    // If less than 7 digits, just return what we have
    return cleaned;
  };

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Service Requests — Admin Dashboard</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
       
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Service Requests</h1>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAutoAssign(true)}
                className="px-4 py-2 bg-gray-200 text-black text-sm rounded-lg hover:bg-gray-200 hover:text-black hover: font-semibold"
              >
                AutoAssign
              </button>
              <button
                onClick={() => setShowBudgetRejectionEmailer(true)}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-semibold"
              >
                Send
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Filters */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</span>
                  {['all', 'buy', 'sell', 'rent'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition whitespace-nowrap border ${
                        filterType === type
                          ? 'bg-accent text-white border-accent'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-accent hover:text-accent'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Urgency</span>
                  {['all', 'normal', 'urgent'].map((urgency) => (
                    <button
                      key={urgency}
                      onClick={() => setFilterUrgency(urgency)}
                      className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition whitespace-nowrap border ${
                        filterUrgency === urgency
                          ? 'bg-accent text-white border-accent'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-accent hover:text-accent'
                      }`}
                    >
                      {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  aria-pressed={filterStatus === 'all'}
                  className={`bg-white rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer w-full ${
                    filterStatus === 'all' ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <p className="text-sm text-gray-600 mb-1">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('open')}
                  aria-pressed={filterStatus === 'open'}
                  className={`bg-white rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer w-full ${
                    filterStatus === 'open' ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <p className="text-sm text-gray-600 mb-1">Open</p>
                  <p className="text-2xl font-bold text-orange-600">{requests.filter(r => r.status === 'open').length}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('assigned')}
                  aria-pressed={filterStatus === 'assigned'}
                  className={`bg-white rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer w-full ${
                    filterStatus === 'assigned' ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <p className="text-sm text-gray-600 mb-1">Assigned</p>
                  <p className="text-2xl font-bold text-blue-600">{requests.filter(r => r.status === 'assigned' || r.status === 'in_progress').length}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('completed')}
                  aria-pressed={filterStatus === 'completed'}
                  className={`bg-white rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer w-full ${
                    filterStatus === 'completed' ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{requests.filter(r => r.status === 'completed').length}</p>
                </button>
              </div>

              {/* Request List */}
              <div className="space-y-3">
                {requests.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-600">No service requests yet</p>
                  </div>
                ) : (
                  requests.filter(request => {
                    const typeMatch = filterType === 'all' || request.request_type === filterType;
                    const urgencyMatch = filterUrgency === 'all' || request.urgency === filterUrgency;
                    const statusMatch =
                      filterStatus === 'all'
                        ? true
                        : filterStatus === 'assigned'
                          ? (request.status === 'assigned' || request.status === 'in_progress')
                          : request.status === filterStatus;
                    return typeMatch && urgencyMatch && statusMatch;
                  }).map((request) => (
                    <div key={request.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="font-bold text-gray-800 text-lg">
                              {request.request_type.toUpperCase()} - {request.property_type}
                            </h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              request.status === 'open' ? 'bg-orange-100 text-orange-800' :
                              request.status === 'assigned' || request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              request.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.status}
                            </span>
                            {request.urgency === 'urgent' && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Urgent
                              </span>
                            )}
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                              request.is_contacted 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              <PhoneIcon size={12} />
                              {request.is_contacted ? 'contacted' : 'not contacted'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                            <div>
                              <span className="font-medium">Client:</span> {request.client_name}
                            </div>
                            <div>
                              <span className="font-medium">Location:</span> {request.location}
                            </div>
                            {request.budget_min && (
                              <div>
                                <span className="font-medium">Budget:</span> ${request.budget_min?.toLocaleString()} - ${request.budget_max?.toLocaleString()}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Date:</span> {new Date(request.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          {request.description && (
                            <p className="text-sm text-gray-700 mb-3 bg-gray-50 p-2 rounded">{request.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
                            <span className="text-gray-600">📧 {request.client_email}</span>
                            <a 
                              href={`https://wa.me/${formatWhatsAppNumber(request.client_phone)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700 hover:underline font-medium"
                            >
                              {request.client_phone}
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Agent Assignment */}
                      <div className="border-t pt-3 mt-3 bg-gray-50 -mx-4 px-4 -mb-4 pb-4 rounded-b-lg">
                        {request.agent ? (
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Assigned Agent</p>
                              <p className="font-bold text-gray-900 text-lg">{request.agent.full_name}</p>
                              <p className="text-sm text-gray-600">{request.agent.email}</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {request.status === 'completed' && (
                                <button
                                  onClick={() => handleReactivateCase(request.id)}
                                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-[var(--accent-color-hover)] text-sm font-medium"
                                  disabled={assignLoading}
                                >
                                  Reactivate Case
                                </button>
                              )}
                              {request.status !== 'completed' && request.status !== 'cancelled' && (
                                <>
                                  <button
                                    onClick={() => handleManualAssign(request.id, null)}
                                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-accent hover:text-black text-sm font-medium transition"
                                    disabled={assignLoading}
                                  >
                                    Unassign
                                  </button>
                                  <select
                                    onChange={(e) => e.target.value && handleManualAssign(request.id, e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none text-sm"
                                    disabled={assignLoading}
                                    defaultValue=""
                                  >
                                    <option value="">Reassign to...</option>
                                    {agents.filter(a => a.id !== request.agent_id && canAgentHandleRequest(a, request)).map((agent) => (
                                      <option key={agent.id} value={agent.id}>
                                        {agent.full_name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setShowCommentModal(true);
                                      setCommentText(request.comment || '');
                                    }}
                                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-accent hover:text-black transition"
                                    title="Comment"
                                  >
                                    <MessageCircle size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleContactedToggle(request.id, request.is_contacted)}
                                    className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-accent hover:text-black transition"
                                    title={request.is_contacted ? 'Contacted' : 'Not contacted'}
                                  >
                                    <PhoneIcon size={16} />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDeleteRequest(request.id)}
                                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-600 hover:text-black transition"
                                title="Delete"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <select
                              onChange={(e) => e.target.value && handleManualAssign(request.id, e.target.value)}
                              className="w-full md:w-auto px-3 py-2 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-accent outline-none bg-white text-sm"
                              disabled={assignLoading}
                              defaultValue=""
                            >
                              <option value="">Select an agent...</option>
                              {agents.filter(agent => canAgentHandleRequest(agent, request)).map((agent) => (
                                <option key={agent.id} value={agent.id}>
                                  {agent.full_name} - {agent.email}
                                  {!agent.last_request_assigned_at && ' (Never assigned)'}
                                </option>
                              ))}
                            </select>
                            <div className="grid grid-cols-4 md:flex md:flex-row gap-2">
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowCommentModal(true);
                                  setCommentText(request.comment || '');
                                }}
                                className="flex items-center justify-center p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition duration-200"
                                title="Comment"
                              >
                                <MessageCircle size={18} />
                              </button>
                              <button
                                onClick={() => handleContactedToggle(request.id, request.is_contacted)}
                                className="flex items-center justify-center p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-green-100 hover:text-green-600 transition duration-200"
                                title={request.is_contacted ? 'Contacted' : 'Not contacted'}
                              >
                                <PhoneIcon size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteRequest(request.id)}
                                className="flex items-center justify-center p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition duration-200"
                                title="Delete"
                              >
                                <FiTrash2 size={18} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <AutoAssignModal
        open={showAutoAssign}
        agents={agents}
        agentId={autoAssignAgentId}
        count={autoAssignCount}
        includeBuys={autoIncludeBuys}
        loading={autoAssignLoading}
        budgetMin={autoBudgetMin}
        budgetMax={autoBudgetMax}
        onClose={() => {
          setShowAutoAssign(false);
          setAutoAssignAgentId('');
          setAutoAssignCount(5);
          setAutoIncludeBuys(false);
          setAutoBudgetMin(10000);
          setAutoBudgetMax(100000000);
        }}
        onSubmit={handleAutoAssign}
        onAgentChange={setAutoAssignAgentId}
        onCountChange={(value) => setAutoAssignCount(Number(value) || 1)}
        onIncludeBuysChange={setAutoIncludeBuys}
        onBudgetMinChange={setAutoBudgetMin}
        onBudgetMaxChange={setAutoBudgetMax}
      />

      <BudgetRejectionEmailer
        open={showBudgetRejectionEmailer}
        onClose={() => setShowBudgetRejectionEmailer(false)}
        onComplete={() => {
          setShowBudgetRejectionEmailer(false);
          fetchData();
        }}
        adminClerkId={user?.id}
      />

      {/* Comment Modal */}
      {showCommentModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add Comment</h2>
                <button
                  onClick={() => {
                    setShowCommentModal(false);
                    setCommentText('');
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

              {selectedRequest.comment && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Existing Agent Notes</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-700 mb-2">{selectedRequest.comment}</p>
                    {selectedRequest.comment_updated_at && (
                      <p className="text-xs text-gray-500">
                        Last updated: {new Date(selectedRequest.comment_updated_at).toLocaleDateString()} at {new Date(selectedRequest.comment_updated_at).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Your Comment
                </label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add any notes or comments about this request..."
                  rows="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                />
              </div>

              <div className="pt-4 border-t flex gap-3">
                <button
                  onClick={() => handleCommentSubmit(selectedRequest.id)}
                  disabled={!commentText.trim()}
                  className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-[var(--accent-color-hover)] hover:text-black disabled:opacity-50 font-medium"
                >
                  Save Comment
                </button>
                <button
                  onClick={() => {
                    setShowCommentModal(false);
                    setCommentText('');
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
