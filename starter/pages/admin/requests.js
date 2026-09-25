import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth, useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import {
  MessageCircle,
  Phone as PhoneIcon,
  Trash2,
  Filter,
  Search,
  X,
  MapPin,
  DollarSign,
  Calendar,
  User,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  UserCog,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import AutoAssignModal from '../../components/AutoAssignModal';
import BudgetRejectionEmailer from '../../components/BudgetRejectionEmailer';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20';
const labelClass =
  'block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5';

const STATUS_STYLES = {
  open: { badge: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  assigned: { badge: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  in_progress: { badge: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  completed: { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  cancelled: { badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
};

const getStatusStyle = (status) =>
  STATUS_STYLES[status] || STATUS_STYLES.cancelled;

const formatJMD = (value) => `J$${Number(value || 0).toLocaleString()}`;

export default function AdminRequestsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
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
  const [filterLocation, setFilterLocation] = useState('');
  const [filterBudgetMin, setFilterBudgetMin] = useState('');
  const [filterBudgetMax, setFilterBudgetMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);
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
      const response = await fetch('/api/admin/verify-admin');
      const userData = await response.json();

      if (!response.ok || !userData?.isAdmin) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      if (!userData.email || !userData.name) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      fetchData();
    } catch (err) {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/requests');
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load data');
      }

      setRequests(payload.requests || []);
      setAgents(payload.agents || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const authedPost = async (url, payload) => {
    const token = await getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    return fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(payload),
    });
  };

  const isActivePaid = (agent) => {
    const paid = ['7-day', '30-day', '90-day'].includes(agent.payment_status);
    if (!paid) return false;
    if (!agent.access_expiry) return false;
    return new Date(agent.access_expiry) > new Date();
  };

  const canAgentHandleRequest = (agent, request) => {
    const type = request.request_type;
    const budget = Number(request.budget_max || request.budget_min || 0);

    if (agent.payment_status === 'free') {
      if (type !== 'rent') return false;
      return budget <= 80000;
    }

    if (!isActivePaid(agent)) return false;

    if (agent.payment_status === '7-day') {
      if (type === 'sell') return false;
      if (type === 'rent') return budget <= 100000;
      if (type === 'buy') return budget <= 10000000;
      return false;
    }

    return ['30-day', '90-day'].includes(agent.payment_status);
  };

  const sendAgentAndClientAssignmentEmails = async (agent, assignedRequests) => {
    const sendEmail = async ({ to, subject, htmlContent, textContent }) => {
      if (!to) return;
      try {
        await fetch('/api/send-brevo-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, subject, htmlContent, textContent }),
        });
      } catch (err) {
        console.warn('Failed to send email:', err);
      }
    };

    if (!agent?.email) return;

    const agentContentRows = assignedRequests
      .map(
        (req) => `
        <li>
          ${req.request_type} ${req.property_type} in ${req.location} - ${req.client_name} (${req.client_email})
        </li>
      `
      )
      .join('');

    await sendEmail({
      to: agent.email,
      subject: 'New request(s) assigned to you',
      htmlContent: `
        <p>Hi ${agent.full_name || 'Agent'},</p>
        <p>The following requests have just been assigned to you:</p>
        <ul>${agentContentRows}</ul>
        <p>Please follow up with these clients promptly.</p>
      `,
      textContent: `Hi ${agent.full_name || 'Agent'},\n\nThe following requests have just been assigned to you:\n${assignedRequests
        .map(
          (req) =>
            `- ${req.request_type} ${req.property_type} in ${req.location} - ${req.client_name} (${req.client_email})`
        )
        .join('\n')}\n\nPlease follow up with these clients promptly.`,
    });

    for (const request of assignedRequests) {
      if (!request.client_email) continue;
      await sendEmail({
        to: request.client_email,
        subject: 'Your service request has been assigned to an agent',
        htmlContent: `
          <p>Hi ${request.client_name},</p>
          <p>Your request has been assigned to ${agent.full_name || 'one of our agents'}.</p>
          <p>Agent Email: ${agent.email}</p>
          <p>They will contact you shortly.</p>
        `,
        textContent: `Hi ${request.client_name},\n\nYour request has been assigned to ${
          agent.full_name || 'one of our agents'
        } (${agent.email}). They will contact you shortly.`,
      });
    }
  };

  const handleManualAssign = async (requestId, agentId) => {
    setAssignLoading(true);
    try {
      const request = requests.find((r) => r.id === requestId);
      const agent = agents.find((a) => a.id === agentId);
      if (agent && request && !canAgentHandleRequest(agent, request)) {
        throw new Error('Agent plan does not allow this request');
      }
      const now = new Date().toISOString();

      const updatePayload = {
        assigned_agent_id: agentId || null,
        status: agentId ? 'assigned' : 'open',
        assigned_at: agentId ? now : null,
      };

      const response = await authedPost('/api/admin/requests', {
        action: 'manualAssign',
        requestId,
        agentId,
        updatePayload,
        now,
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Database update failed');
      }

      toast.success(agentId ? 'Request assigned!' : 'Request unassigned!');
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
    const selectedAgent = agents.find((a) => a.id === autoAssignAgentId);
    if (!selectedAgent) {
      toast.error('Selected agent not found');
      return;
    }

    const candidates = requests
      .filter((r) => r.status === 'open')
      .filter((r) => (autoIncludeBuys ? true : r.request_type !== 'buy'))
      .filter((r) => {
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
    const ids = candidates.map((r) => r.id);

    try {
      const response = await authedPost('/api/admin/requests', {
        action: 'autoAssign',
        ids,
        agentId: autoAssignAgentId,
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to auto-assign');

      await sendAgentAndClientAssignmentEmails(selectedAgent, candidates);

      toast.success(`Assigned ${ids.length} request${ids.length === 1 ? '' : 's'}.`);
      setShowAutoAssign(false);
      setAutoAssignAgentId('');
      setAutoAssignCount(5);
      setAutoIncludeBuys(false);
      setAutoBudgetMin(10000);
      setAutoBudgetMax(100000000);
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
      const response = await authedPost('/api/admin/requests', {
        action: 'comment',
        requestId,
        comment: commentText,
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to save comment');

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
      const response = await authedPost('/api/admin/requests', {
        action: 'toggleContacted',
        requestId,
        currentStatus,
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success)
        throw new Error(payload?.error || 'Failed to update contacted status');

      toast.success(`Request marked as ${!currentStatus ? 'contacted' : 'not contacted'}!`);
      setTimeout(() => fetchData(), 200);
    } catch (err) {
      console.error('Contacted toggle error:', err);
      toast.error('Failed to update contacted status');
    }
  };

  const handleReactivateCase = async (requestId) => {
    if (!confirm('Are you sure you want to reactivate this completed case?')) return;

    try {
      const response = await authedPost('/api/admin/requests', {
        action: 'reactivate',
        requestId,
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to reactivate case');

      toast.success('Case reactivated successfully!');
      setTimeout(() => fetchData(), 200);
    } catch (err) {
      console.error('Reactivate error:', err);
      toast.error('Failed to reactivate case');
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!confirm('Are you sure you want to permanently delete this request?')) return;

    try {
      const response = await authedPost('/api/admin/requests', {
        action: 'delete',
        requestId,
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to delete request');

      toast.success('Request deleted successfully!');
      setTimeout(() => fetchData(), 200);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  const formatWhatsAppNumber = (phone) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('1876') && cleaned.length === 11) return cleaned;
    if (cleaned.startsWith('876')) return '1' + cleaned;
    if (cleaned.startsWith('1') && cleaned.length === 11) return cleaned;
    if (cleaned.length === 10 && cleaned.startsWith('876')) return '1' + cleaned;
    if (cleaned.length === 7) return '1876' + cleaned;
    if (cleaned.length >= 7) return '1876' + cleaned.slice(-7);
    return cleaned;
  };

  const openComment = (request) => {
    setSelectedRequest(request);
    setShowCommentModal(true);
    setCommentText(request.comment || '');
  };

  const activeFilterCount = [
    filterType !== 'all',
    filterUrgency !== 'all',
    filterStatus !== 'all',
    Boolean(filterLocation),
    Boolean(filterBudgetMin),
    Boolean(filterBudgetMax),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterType('all');
    setFilterUrgency('all');
    setFilterStatus('all');
    setFilterLocation('');
    setFilterBudgetMin('');
    setFilterBudgetMax('');
  };

  const filteredRequests = requests.filter((request) => {
    const typeMatch = filterType === 'all' || request.request_type === filterType;
    const urgencyMatch = filterUrgency === 'all' || request.urgency === filterUrgency;
    const locationMatch =
      !filterLocation.trim() ||
      String(request.location || '')
        .toLowerCase()
        .includes(filterLocation.trim().toLowerCase());
    const requestBudgetMin = Number(request.budget_min ?? request.budget_max ?? 0);
    const requestBudgetMax = Number(request.budget_max ?? request.budget_min ?? 0);
    const budgetMinMatch = !filterBudgetMin || requestBudgetMax >= Number(filterBudgetMin);
    const budgetMaxMatch = !filterBudgetMax || requestBudgetMin <= Number(filterBudgetMax);
    const statusMatch =
      filterStatus === 'all'
        ? true
        : filterStatus === 'assigned'
        ? request.status === 'assigned' || request.status === 'in_progress'
        : request.status === filterStatus;
    return typeMatch && urgencyMatch && locationMatch && budgetMinMatch && budgetMaxMatch && statusMatch;
  });

  if (!isAdmin && !loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Access denied</h1>
          <p className="mt-2 text-sm text-slate-600">Admin access is required to view this page.</p>
        </div>
      </div>
    );
  }

  const openCount = requests.filter((r) => r.status === 'open').length;
  const assignedCount = requests.filter(
    (r) => r.status === 'assigned' || r.status === 'in_progress'
  ).length;
  const completedCount = requests.filter((r) => r.status === 'completed').length;

  return (
    <>
      <Head>
        <title>Service Requests — Admin</title>
      </Head>

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Service Requests
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Client Requests
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Assign requests, track contact status, and keep agents moving.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowAutoAssign(true)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Zap size={15} />
              Auto assign
            </button>
            <button
              type="button"
              onClick={() => setShowBudgetRejectionEmailer(true)}
              className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              <Mail size={15} />
              Budget emails
            </button>
          </div>
        </div>

        {/* Status strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatusTile
            label="Total"
            value={requests.length}
            tone="slate"
            active={filterStatus === 'all'}
            onClick={() => setFilterStatus('all')}
          />
          <StatusTile
            label="Open"
            value={openCount}
            tone="amber"
            active={filterStatus === 'open'}
            onClick={() => setFilterStatus('open')}
          />
          <StatusTile
            label="Assigned"
            value={assignedCount}
            tone="blue"
            active={filterStatus === 'assigned'}
            onClick={() => setFilterStatus('assigned')}
          />
          <StatusTile
            label="Completed"
            value={completedCount}
            tone="emerald"
            active={filterStatus === 'completed'}
            onClick={() => setFilterStatus('completed')}
          />
        </div>

        {/* Filters bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                showFilters || activeFilterCount > 0
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown
                size={14}
                className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </button>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-700"
              >
                <X size={12} />
                Clear all
              </button>
            )}

            <button
              type="button"
              onClick={fetchData}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              aria-label="Refresh"
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
              {/* Type */}
              <div>
                <p className={labelClass}>Type</p>
                <div className="flex flex-wrap gap-2">
                  {['all', 'buy', 'sell', 'rent'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterType(type)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                        filterType === type
                          ? 'border-accent bg-accent text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-accent'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Urgency */}
              <div>
                <p className={labelClass}>Urgency</p>
                <div className="flex flex-wrap gap-2">
                  {['all', 'normal', 'urgent'].map((urgency) => (
                    <button
                      key={urgency}
                      type="button"
                      onClick={() => setFilterUrgency(urgency)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                        filterUrgency === urgency
                          ? 'border-accent bg-accent text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-accent'
                      }`}
                    >
                      {urgency}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text + budget */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>Location</label>
                  <div className="relative">
                    <Search
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="search"
                      value={filterLocation}
                      onChange={(e) => setFilterLocation(e.target.value)}
                      placeholder="Search location"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Budget from</label>
                  <input
                    type="number"
                    min="0"
                    value={filterBudgetMin}
                    onChange={(e) => setFilterBudgetMin(e.target.value)}
                    placeholder="Minimum"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Budget to</label>
                  <input
                    type="number"
                    min="0"
                    value={filterBudgetMax}
                    onChange={(e) => setFilterBudgetMax(e.target.value)}
                    placeholder="Maximum"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-slate-500">
            Showing <strong className="text-slate-900">{filteredRequests.length}</strong> of{' '}
            {requests.length} request{requests.length === 1 ? '' : 's'}
          </p>
        )}

        {/* Requests list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
              />
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              {requests.length === 0 ? 'No service requests yet' : 'No requests match your filters'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {requests.length === 0
                ? 'New client submissions will appear here.'
                : 'Try clearing the filters above.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                agents={agents}
                assignLoading={assignLoading}
                onManualAssign={handleManualAssign}
                onComment={() => openComment(request)}
                onContactedToggle={() => handleContactedToggle(request.id, request.is_contacted)}
                onReactivate={() => handleReactivateCase(request.id)}
                onDelete={() => handleDeleteRequest(request.id)}
                canAgentHandleRequest={canAgentHandleRequest}
                formatWhatsAppNumber={formatWhatsAppNumber}
              />
            ))}
          </div>
        )}
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

      {/* Comment modal */}
      {showCommentModal && selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => {
            setShowCommentModal(false);
            setCommentText('');
          }}
        >
          <div
            className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white sm:max-w-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Add comment</h2>
                <p className="mt-0.5 text-sm text-slate-600">
                  {selectedRequest.request_type?.toUpperCase() || 'Request'} ·{' '}
                  {selectedRequest.property_type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCommentModal(false);
                  setCommentText('');
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-lg bg-slate-50 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Client
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {selectedRequest.client_name}
                </p>
                <p className="text-xs text-slate-500">{selectedRequest.client_email}</p>
              </div>

              {selectedRequest.comment && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Existing notes
                  </p>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3.5">
                    <p className="whitespace-pre-line text-sm text-slate-700">
                      {selectedRequest.comment}
                    </p>
                    {selectedRequest.comment_updated_at && (
                      <p className="mt-2 text-xs text-slate-500">
                        Updated{' '}
                        {new Date(selectedRequest.comment_updated_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>Your comment</label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add notes about this request…"
                  rows="5"
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>

            <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white p-5">
              <button
                type="button"
                onClick={() => {
                  setShowCommentModal(false);
                  setCommentText('');
                }}
                className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCommentSubmit(selectedRequest.id)}
                disabled={!commentText.trim()}
                className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
              >
                Save comment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* -------------------- sub components -------------------- */

const TONE = {
  slate: { bg: 'bg-slate-100', text: 'text-slate-800', ring: 'ring-slate-400' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-800', ring: 'ring-amber-400' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-800', ring: 'ring-blue-400' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-800', ring: 'ring-emerald-400' },
};

function StatusTile({ label, value, tone = 'slate', active, onClick }) {
  const t = TONE[tone] || TONE.slate;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border border-slate-200 bg-white p-4 text-left transition ${
        active ? `ring-2 ${t.ring}` : 'hover:border-slate-300'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${active ? t.text : 'text-slate-900'}`}>
        {value}
      </p>
    </button>
  );
}

function RequestCard({
  request,
  agents,
  assignLoading,
  onManualAssign,
  onComment,
  onContactedToggle,
  onReactivate,
  onDelete,
  canAgentHandleRequest,
  formatWhatsAppNumber,
}) {
  const statusStyle = getStatusStyle(request.status);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition ">
      {/* Top section */}
      <div className="p-4 sm:p-5">
        {/* Title row */}
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold uppercase tracking-tight text-slate-900">
            {request.request_type} · {request.property_type}
          </h3>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyle.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
            {request.status}
          </span>
          {request.urgency === 'urgent' && (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-800">
              <AlertCircle size={10} />
              Urgent
            </span>
          )}
          <button
            type="button"
            onClick={onContactedToggle}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition ${
              request.is_contacted
                ? 'border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <PhoneIcon size={10} />
            {request.is_contacted ? 'Contacted' : 'Not contacted'}
          </button>
        </div>

        {/* Meta grid */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetaItem icon={User} label="Client" value={request.client_name} />
          <MetaItem icon={MapPin} label="Location" value={request.location} />
          {request.budget_min && (
            <MetaItem
              icon={DollarSign}
              label="Budget"
              value={`${formatJMD(request.budget_min)} – ${formatJMD(request.budget_max)}`}
            />
          )}
          <MetaItem
            icon={Calendar}
            label="Created"
            value={new Date(request.created_at).toLocaleDateString()}
          />
        </div>

        {/* Description */}
        {request.description && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
            {request.description}
          </p>
        )}

        {/* Contact row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a
            href={`mailto:${request.client_email}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
          >
            <Mail size={12} />
            <span className="max-w-[180px] truncate">{request.client_email}</span>
          </a>
          <a
            href={`https://wa.me/${formatWhatsAppNumber(request.client_phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            <PhoneIcon size={12} />
            {request.client_phone}
          </a>
        </div>
      </div>

      {/* Action bar */}
      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
        {request.agent ? (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Assigned agent
              </p>
              <p className="mt-0.5 truncate text-sm font-bold text-slate-900">
                {request.agent.full_name}
              </p>
              <p className="truncate text-xs text-slate-500">{request.agent.email}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {request.status === 'completed' && (
                <button
                  type="button"
                  onClick={onReactivate}
                  disabled={assignLoading}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
                >
                  <RefreshCw size={13} />
                  Reactivate
                </button>
              )}

              {request.status !== 'completed' && request.status !== 'cancelled' && (
                <>
                  <button
                    type="button"
                    onClick={() => onManualAssign(request.id, null)}
                    disabled={assignLoading}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Unassign
                  </button>

                  <div className="relative">
                    <select
                      onChange={(e) =>
                        e.target.value && onManualAssign(request.id, e.target.value)
                      }
                      className="appearance-none rounded-full border border-slate-200 bg-white py-2 pl-3.5 pr-8 text-xs font-semibold text-slate-700 transition hover:border-slate-300 focus:border-accent focus:outline-none"
                      disabled={assignLoading}
                      defaultValue=""
                    >
                      <option value="">Reassign to…</option>
                      {agents
                        .filter(
                          (a) =>
                            a.id !== request.agent_id && canAgentHandleRequest(a, request)
                        )
                        .map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.full_name}
                          </option>
                        ))}
                    </select>
                    <ChevronDown
                      size={13}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={onComment}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-accent hover:text-accent"
                    title="Comment"
                  >
                    <MessageCircle size={14} />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={onDelete}
                className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-100 bg-white text-red-600 transition hover:bg-red-50"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <select
                onChange={(e) => e.target.value && onManualAssign(request.id, e.target.value)}
                className="w-full appearance-none rounded-full border border-amber-300 bg-white py-2.5 pl-3.5 pr-9 text-sm font-medium text-slate-700 transition hover:border-amber-400 focus:border-accent focus:outline-none"
                disabled={assignLoading}
                defaultValue=""
              >
                <option value="">Select an agent to assign…</option>
                {agents
                  .filter((agent) => canAgentHandleRequest(agent, request))
                  .map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.full_name} — {agent.email}
                      {!agent.last_request_assigned_at ? ' (Never assigned)' : ''}
                    </option>
                  ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onComment}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-accent hover:text-accent"
                title="Comment"
              >
                <MessageCircle size={14} />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-100 bg-white text-red-600 transition hover:bg-red-50"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function MetaItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
        <Icon size={13} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}