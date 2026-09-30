import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import {
  // Assign tab icons
  MessageCircle,
  Phone,
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
  RefreshCw,
  ChevronDown,
  // Manage tab icons
  UserPlus,
  XCircle,
  RotateCcw,
  PhoneOff,
  UserMinus,
  Users,
  Check,
  Pencil,
} from 'lucide-react';
import AutoAssignModal from '../../components/AutoAssignModal';
import BudgetRejectionEmailer from '../../components/BudgetRejectionEmailer';

/* ----------------------------------------------------------
 * Tokens
 * ---------------------------------------------------------- */
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
  deleted: { badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
};

const getStatusStyle = (status) => STATUS_STYLES[status] || STATUS_STYLES.deleted;

const formatJMD = (value) => `J$${Number(value || 0).toLocaleString()}`;

/* ============================================================
 * Page — parent wrapper with tabs
 * ============================================================ */

export default function AdminRequestsPage() {
  const { user } = useUser();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('assign');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  // Tab counts (updated by each tab when its data loads)
  const [assignCounts, setAssignCounts] = useState({ total: 0, open: 0 });
  const [manageCounts, setManageCounts] = useState({ total: 0, open: 0 });

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/admin/verify-admin');
        const userData = await response.json();

        if (!response.ok || !userData?.isAdmin) {
          setIsAdmin(false);
          return;
        }
        setIsAdmin(true);
      } catch {
        setIsAdmin(false);
      } finally {
        setLoadingAdmin(false);
      }
    };
    checkAdminAccess();
  }, [user]);

  if (loadingAdmin) {
    return (
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
        <div className="h-16 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
          />
        ))}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Access denied</h1>
          <p className="mt-2 text-sm text-slate-600">
            Admin access is required to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Requests — Admin</title>
      </Head>

      <div className="space-y-5">
        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Service Requests
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Requests
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Assign, edit, and manage every client request in one place.
          </p>
        </div>

        {/* Tabs */}
        <div className="inline-flex w-full rounded-full bg-slate-100 p-1 sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('assign')}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition sm:flex-none sm:px-5 ${
              activeTab === 'assign'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Client Requests
            {assignCounts.open > 0 ? (
              <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-amber-900">
                {assignCounts.open}
              </span>
            ) : (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeTab === 'assign'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {assignCounts.total}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition sm:flex-none sm:px-5 ${
              activeTab === 'manage'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Manage Requests
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === 'manage'
                  ? 'bg-accent/10 text-accent'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {manageCounts.total}
            </span>
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'assign' && (
          <AssignRequestsTab onCountsChange={setAssignCounts} />
        )}
        {activeTab === 'manage' && (
          <ManageRequestsTab onCountsChange={setManageCounts} />
        )}
      </div>
    </>
  );
}

/* ============================================================
 * TAB 1 — Client Requests (assign / auto-assign / comments)
 * ============================================================ */

function AssignRequestsTab({ onCountsChange }) {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [requests, setRequests] = useState([]);
  const [agents, setAgents] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [loading, setLoading] = useState(true);
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
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/requests');
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load data');
      }

      const nextRequests = payload.requests || [];
      const nextAgents = payload.agents || [];

      setRequests(nextRequests);
      setAgents(nextAgents);

      if (onCountsChange) {
        onCountsChange({
          total: nextRequests.length,
          open: nextRequests.filter((r) => r.status === 'open').length,
        });
      }
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
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to auto-assign');
      }

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
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to save comment');
      }

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
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update contacted status');
      }

      toast.success(
        `Request marked as ${!currentStatus ? 'contacted' : 'not contacted'}!`
      );
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
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to reactivate case');
      }

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
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to delete request');
      }

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
    return (
      typeMatch &&
      urgencyMatch &&
      locationMatch &&
      budgetMinMatch &&
      budgetMaxMatch &&
      statusMatch
    );
  });

  const openCount = requests.filter((r) => r.status === 'open').length;
  const assignedCount = requests.filter(
    (r) => r.status === 'assigned' || r.status === 'in_progress'
  ).length;
  const completedCount = requests.filter((r) => r.status === 'completed').length;

  return (
    <>
      <div className="space-y-5">
        {/* Action buttons */}
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

          {showFilters && (
            <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
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

        {!loading && (
          <p className="text-sm text-slate-500">
            Showing <strong className="text-slate-900">{filteredRequests.length}</strong> of{' '}
            {requests.length} request{requests.length === 1 ? '' : 's'}
          </p>
        )}

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
              {requests.length === 0
                ? 'No service requests yet'
                : 'No requests match your filters'}
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
              <AssignRequestCard
                key={request.id}
                request={request}
                agents={agents}
                assignLoading={assignLoading}
                onManualAssign={handleManualAssign}
                onComment={() => openComment(request)}
                onContactedToggle={() =>
                  handleContactedToggle(request.id, request.is_contacted)
                }
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
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-2xl sm:rounded-2xl"
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
                        {new Date(
                          selectedRequest.comment_updated_at
                        ).toLocaleString()}
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

/* ============================================================
 * TAB 2 — Manage Requests (bulk / edit)
 * ============================================================ */

function ManageRequestsTab({ onCountsChange }) {
  const { getToken } = useAuth();

  const [requests, setRequests] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedRequests, setSelectedRequests] = useState(new Set());
  const [filterDate, setFilterDate] = useState('');
  const [sortBy, setSortBy] = useState('edited-desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [assignContext, setAssignContext] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRequests = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/requests-management');
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load requests');
      }
      const nextRequests = payload.requests || [];
      setRequests(nextRequests);
      setAgents(payload.agents || []);

      if (onCountsChange) {
        onCountsChange({
          total: nextRequests.length,
          open: nextRequests.filter((r) => r.status === 'open').length,
        });
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
      toast.error('Failed to load requests');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const runAction = async (ids, action, extra = {}) => {
    const token = await getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch('/api/admin/requests-management', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ action, ids, ...extra }),
    });
    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || 'Action failed');
    }
    return payload;
  };

  const runCardAction = async (request, action, successMsg, extra = {}) => {
    setPendingAction({ requestId: request.id, action });
    try {
      await runAction([request.id], action, extra);
      toast.success(successMsg);
      await fetchRequests();
    } catch (err) {
      console.error(`Card action ${action} error:`, err);
      toast.error(err.message || 'Action failed');
    } finally {
      setPendingAction(null);
    }
  };

  const handleCardMarkCompleted = (request) =>
    runCardAction(request, 'complete', 'Marked as completed');
  const handleCardMarkIncomplete = (request) =>
    runCardAction(request, 'incomplete', 'Marked as incomplete');
  const handleCardReactivate = (request) =>
    runCardAction(request, 'reactivate', 'Request reactivated');
  const handleCardUnassign = (request) =>
    runCardAction(request, 'unassign', 'Unassigned from queue');

  const handleCardToggleContacted = (request) => {
    const next = !request.is_contacted;
    return runCardAction(
      request,
      next ? 'contacted' : 'uncontacted',
      next ? 'Marked as contacted' : 'Marked as uncontacted'
    );
  };

  const handleCardDelete = async (request) => {
    if (
      !window.confirm(
        `Delete request from ${request.client_name || 'this client'}? This cannot be undone.`
      )
    )
      return;
    await runCardAction(request, 'delete', 'Request deleted');
  };

  const handleEditSave = async (requestId, fields) => {
    setPendingAction({ requestId, action: 'edit' });
    try {
      await runAction([requestId], 'edit', { fields });
      toast.success('Request updated');
      setEditTarget(null);
      await fetchRequests();
    } catch (err) {
      console.error('Edit error:', err);
      toast.error(err.message || 'Failed to update request');
    } finally {
      setPendingAction(null);
    }
  };

  const openSingleAssign = (request) => {
    setSelectedAgent('');
    setAssignContext({ type: 'single', request });
  };

  const openBulkAssign = () => {
    setSelectedAgent('');
    setAssignContext({ type: 'bulk' });
  };

  const closeAssignModal = () => {
    setAssignContext(null);
    setSelectedAgent('');
  };

  const confirmAssign = async () => {
    if (!selectedAgent) {
      toast.error('Please select an agent');
      return;
    }

    const isBulk = assignContext?.type === 'bulk';
    const ids = isBulk ? Array.from(selectedRequests) : [assignContext.request.id];

    setPendingAction(
      isBulk ? 'bulk' : { requestId: assignContext.request.id, action: 'assign' }
    );

    try {
      await runAction(ids, 'assign', { agentId: selectedAgent });
      toast.success(
        isBulk
          ? `Assigned ${ids.length} requests`
          : `Assigned to ${agents.find((a) => a.id === selectedAgent)?.name || 'agent'}`
      );
      if (isBulk) setSelectedRequests(new Set());
      closeAssignModal();
      await fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to assign');
    } finally {
      setPendingAction(null);
    }
  };

  const runBulk = async (action, successMsg, extra = {}) => {
    setPendingAction('bulk');
    try {
      await runAction(Array.from(selectedRequests), action, extra);
      toast.success(successMsg);
      setSelectedRequests(new Set());
      await fetchRequests();
    } catch (err) {
      console.error(`Bulk action ${action} error:`, err);
      toast.error(err.message || 'Bulk action failed');
    } finally {
      setPendingAction(null);
    }
  };

  const bulkMarkCompleted = () =>
    runBulk('complete', `Marked ${selectedRequests.size} as completed`);
  const bulkMarkIncomplete = () =>
    runBulk('incomplete', `Marked ${selectedRequests.size} as incomplete`);
  const bulkUnassignToQueue = () =>
    runBulk('unassign', `Unassigned ${selectedRequests.size}`);
  const bulkReactivate = () =>
    runBulk('reactivate', `Reactivated ${selectedRequests.size}`);
  const bulkMarkContacted = () =>
    runBulk('contacted', `Marked ${selectedRequests.size} as contacted`);
  const bulkMarkUncontacted = () =>
    runBulk('uncontacted', `Marked ${selectedRequests.size} as uncontacted`);

  const bulkRemoveComments = async () => {
    if (!window.confirm(`Remove comments from ${selectedRequests.size} requests?`))
      return;
    await runBulk('remove-comments', 'Removed comments');
  };

  const bulkDelete = async () => {
    if (
      !window.confirm(
        `Delete ${selectedRequests.size} requests? This cannot be undone.`
      )
    )
      return;
    await runBulk('delete', `Deleted ${selectedRequests.size}`);
  };

  const toggleSelectRequest = (id) => {
    const next = new Set(selectedRequests);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRequests(next);
  };

  const filteredRequests = useMemo(() => {
    let filtered = [...requests];

    if (statusFilter === 'active') {
      filtered = filtered.filter(
        (r) => r.status !== 'deleted' && r.status !== 'completed'
      );
    } else if (statusFilter === 'completed') {
      filtered = filtered.filter((r) => r.status === 'completed');
    } else if (statusFilter === 'open') {
      filtered = filtered.filter((r) => r.status === 'open');
    }

    if (filterDate) {
      filtered = filtered.filter((r) => {
        if (!r.updated_at) return false;
        return r.updated_at.split('T')[0] === filterDate;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.client_name?.toLowerCase().includes(q) ||
          r.client_email?.toLowerCase().includes(q) ||
          r.client_phone?.includes(q) ||
          r.location?.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'edited-desc':
          return new Date(b.updated_at) - new Date(a.updated_at);
        case 'edited-asc':
          return new Date(a.updated_at) - new Date(b.updated_at);
        case 'created-desc':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'created-asc':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'name':
          return (a.client_name || '').localeCompare(b.client_name || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [requests, statusFilter, filterDate, searchQuery, sortBy]);

  const toggleSelectAll = () => {
    if (
      selectedRequests.size === filteredRequests.length &&
      filteredRequests.length > 0
    ) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(filteredRequests.map((r) => r.id)));
    }
  };

  const allSelected =
    selectedRequests.size === filteredRequests.length && filteredRequests.length > 0;

  const statusCounts = useMemo(
    () => ({
      all: requests.length,
      open: requests.filter((r) => r.status === 'open').length,
      active: requests.filter(
        (r) => r.status !== 'deleted' && r.status !== 'completed'
      ).length,
      completed: requests.filter((r) => r.status === 'completed').length,
    }),
    [requests]
  );

  const activeFilterCount = [
    Boolean(filterDate),
    sortBy !== 'edited-desc',
    statusFilter !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterDate('');
    setSortBy('edited-desc');
    setStatusFilter('all');
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
          />
        ))}
      </div>
    );
  }

  const selectedCount = selectedRequests.size;
  const isBulkPending = pendingAction === 'bulk';
  const hasAgents = agents.length > 0;

  return (
    <>
      <div className="space-y-5">
        {/* Refresh */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={fetchRequests}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All', count: statusCounts.all, tone: 'slate' },
            { key: 'open', label: 'Open', count: statusCounts.open, tone: 'amber' },
            { key: 'active', label: 'Active', count: statusCounts.active, tone: 'blue' },
            {
              key: 'completed',
              label: 'Completed',
              count: statusCounts.completed,
              tone: 'emerald',
            },
          ].map(({ key, label, count, tone }) => {
            const selected = statusFilter === key;
            const classes = {
              slate: selected
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
              amber: selected
                ? 'border-amber-500 bg-amber-500 text-white'
                : 'border-amber-200 bg-white text-amber-700 hover:border-amber-300',
              blue: selected
                ? 'border-blue-500 bg-blue-500 text-white'
                : 'border-blue-200 bg-white text-blue-700 hover:border-blue-300',
              emerald: selected
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300',
            }[tone];

            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${classes}`}
              >
                {label}
                <span
                  className={`rounded-full px-1.5 text-[10px] font-bold ${
                    selected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, phone, location…"
                className={`${inputClass} pl-9`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

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
                  Clear
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Filter by date</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={inputClass}
                >
                  <option value="edited-desc">Edited (newest)</option>
                  <option value="edited-asc">Edited (oldest)</option>
                  <option value="created-desc">Created (newest)</option>
                  <option value="created-asc">Created (oldest)</option>
                  <option value="name">Name (A–Z)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Selection bar */}
        {selectedCount > 0 && (
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Users size={15} className="text-accent" />
                  {selectedCount} selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedRequests(new Set())}
                  disabled={isBulkPending}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-slate-700"
                >
                  <X size={12} />
                  Clear
                </button>
              </div>

              <button
                type="button"
                onClick={toggleSelectAll}
                disabled={isBulkPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                {allSelected ? 'Deselect all' : `Select all ${filteredRequests.length}`}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openBulkAssign}
                disabled={isBulkPending || !hasAgents}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
              >
                <UserPlus size={13} />
                Assign agent
              </button>
              <button
                type="button"
                onClick={bulkMarkCompleted}
                disabled={isBulkPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
              >
                <CheckCircle2 size={13} />
                Mark completed
              </button>
              <button
                type="button"
                onClick={bulkMarkIncomplete}
                disabled={isBulkPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <XCircle size={13} />
                Mark incomplete
              </button>
              <button
                type="button"
                onClick={bulkReactivate}
                disabled={isBulkPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RotateCcw size={13} />
                Reactivate
              </button>
              <button
                type="button"
                onClick={bulkMarkContacted}
                disabled={isBulkPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
              >
                <Phone size={13} />
                Mark contacted
              </button>
              <button
                type="button"
                onClick={bulkMarkUncontacted}
                disabled={isBulkPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <PhoneOff size={13} />
                Mark uncontacted
              </button>
              <button
                type="button"
                onClick={bulkUnassignToQueue}
                disabled={isBulkPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <UserMinus size={13} />
                Unassign
              </button>
              <button
                type="button"
                onClick={bulkRemoveComments}
                disabled={isBulkPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Trash2 size={13} />
                Clear comments
              </button>
              <button
                type="button"
                onClick={bulkDelete}
                disabled={isBulkPending}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Results count */}
        {!selectedCount && filteredRequests.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing <strong className="text-slate-900">{filteredRequests.length}</strong>{' '}
              of {requests.length}
            </p>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-accent"
            >
              <Check size={12} />
              Select all
            </button>
          </div>
        )}

        {/* List */}
        {filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              {requests.length === 0
                ? 'No requests yet'
                : 'No requests match your filters'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {requests.length === 0
                ? 'New client submissions will appear here.'
                : 'Try clearing the filters above.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <RequestManageCard
                key={request.id}
                request={request}
                selected={selectedRequests.has(request.id)}
                onToggle={() => toggleSelectRequest(request.id)}
                pendingAction={
                  pendingAction?.requestId === request.id ? pendingAction.action : null
                }
                hasAgents={hasAgents}
                onAssign={() => openSingleAssign(request)}
                onEdit={() => setEditTarget(request)}
                onMarkCompleted={() => handleCardMarkCompleted(request)}
                onMarkIncomplete={() => handleCardMarkIncomplete(request)}
                onReactivate={() => handleCardReactivate(request)}
                onUnassign={() => handleCardUnassign(request)}
                onToggleContacted={() => handleCardToggleContacted(request)}
                onDelete={() => handleCardDelete(request)}
              />
            ))}
          </div>
        )}
      </div>

      {assignContext && (
        <AssignModal
          context={assignContext}
          selectedCount={selectedCount}
          agents={agents}
          selectedAgent={selectedAgent}
          setSelectedAgent={setSelectedAgent}
          onClose={closeAssignModal}
          onConfirm={confirmAssign}
          busy={pendingAction !== null}
        />
      )}

      {editTarget && (
        <EditRequestModal
          request={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(fields) => handleEditSave(editTarget.id, fields)}
          busy={
            pendingAction?.requestId === editTarget.id &&
            pendingAction?.action === 'edit'
          }
        />
      )}
    </>
  );
}

/* ============================================================
 * Assign tab sub-components
 * ============================================================ */

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
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${active ? t.text : 'text-slate-900'}`}>
        {value}
      </p>
    </button>
  );
}

function AssignRequestCard({
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
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition">
      <div className="p-4 sm:p-5">
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
            <Phone size={10} />
            {request.is_contacted ? 'Contacted' : 'Not contacted'}
          </button>
        </div>

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

        {request.description && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
            {request.description}
          </p>
        )}

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
            <Phone size={12} />
            {request.client_phone}
          </a>
        </div>
      </div>

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
                            a.id !== request.agent_id &&
                            canAgentHandleRequest(a, request)
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
                onChange={(e) =>
                  e.target.value && onManualAssign(request.id, e.target.value)
                }
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

/* ============================================================
 * Manage tab sub-components
 * ============================================================ */

function RequestManageCard({
  request,
  selected,
  onToggle,
  pendingAction,
  hasAgents,
  onAssign,
  onEdit,
  onMarkCompleted,
  onMarkIncomplete,
  onReactivate,
  onUnassign,
  onToggleContacted,
  onDelete,
}) {
  const statusStyle = getStatusStyle(request.status);
  const isCompleted = request.status === 'completed';
  const isAssigned = Boolean(request.assigned_agent_id);
  const busy = Boolean(pendingAction);

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white transition ${
        selected
          ? 'border-accent ring-2 ring-accent/30'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex gap-4 p-4 sm:p-5">
        <div className="flex shrink-0 pt-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="h-5 w-5 cursor-pointer rounded border-slate-300 text-accent focus:ring-accent"
            aria-label={`Select request from ${request.client_name}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-slate-900">
              {request.client_name || 'Unknown client'}
            </h3>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyle.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
              {request.status || 'unknown'}
            </span>
            {request.is_contacted ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                <Phone size={10} />
                Contacted
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <PhoneOff size={10} />
                Not contacted
              </span>
            )}
          </div>

          {request.request_type && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-blue-700">
                {request.request_type}
              </span>
              {request.property_type && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
                  {request.property_type}
                </span>
              )}
              {request.bedrooms != null && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {request.bedrooms} bd
                </span>
              )}
              {request.bathrooms != null && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {request.bathrooms} ba
                </span>
              )}
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
            {request.client_email && (
              <div className="flex items-start gap-2">
                <Mail size={13} className="mt-0.5 shrink-0 text-slate-400" />
                <span className="min-w-0 truncate">{request.client_email}</span>
              </div>
            )}
            {request.client_phone && (
              <div className="flex items-start gap-2">
                <Phone size={13} className="mt-0.5 shrink-0 text-slate-400" />
                <span className="min-w-0 truncate">{request.client_phone}</span>
              </div>
            )}
            {request.location && (
              <div className="flex items-start gap-2">
                <MapPin size={13} className="mt-0.5 shrink-0 text-slate-400" />
                <span className="min-w-0 truncate">{request.location}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Calendar size={13} className="mt-0.5 shrink-0 text-slate-400" />
              <span className="min-w-0 truncate">
                Edited{' '}
                {request.updated_at
                  ? new Date(request.updated_at).toLocaleDateString()
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-50"
        >
          <Pencil size={13} />
          Edit
        </button>

        <button
          type="button"
          onClick={onAssign}
          disabled={busy || !hasAgents}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:opacity-50"
        >
          <UserPlus size={13} />
          {isAssigned ? 'Reassign' : 'Assign'}
        </button>

        {isAssigned && !isCompleted && (
          <button
            type="button"
            onClick={onUnassign}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
          >
            <UserMinus size={13} />
            Unassign
          </button>
        )}

        {isCompleted ? (
          <button
            type="button"
            onClick={onReactivate}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-amber-700 shadow-sm transition hover:bg-amber-50 disabled:opacity-50"
          >
            <RotateCcw size={13} />
            Reactivate
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onMarkCompleted}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:opacity-50"
            >
              <CheckCircle2 size={13} />
              Complete
            </button>
            <button
              type="button"
              onClick={onMarkIncomplete}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
            >
              <XCircle size={13} />
              Incomplete
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onToggleContacted}
          disabled={busy}
          className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold shadow-sm transition disabled:opacity-50 ${
            request.is_contacted
              ? 'text-slate-700 hover:bg-slate-100'
              : 'text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          {request.is_contacted ? (
            <>
              <PhoneOff size={13} />
              Uncontacted
            </>
          ) : (
            <>
              <Phone size={13} />
              Contacted
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </article>
  );
}

function AssignModal({
  context,
  selectedCount,
  agents,
  selectedAgent,
  setSelectedAgent,
  onClose,
  onConfirm,
  busy,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Assign to agent</h2>
            <p className="mt-1 text-sm text-slate-600">
              {context.type === 'bulk'
                ? `Assigning ${selectedCount} request${selectedCount === 1 ? '' : 's'}.`
                : `Assigning request from ${context.request.client_name || 'client'}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5">
          <label className={labelClass}>Select agent</label>
          <div className="relative">
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className={`${inputClass} appearance-none pr-9`}
            >
              <option value="">— Select an agent —</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.email})
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!selectedAgent || busy}
            className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
          >
            {busy ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}

const REQUEST_TYPES = [
  { value: 'buy', label: 'Buy' },
  { value: 'rent', label: 'Rent' },
  { value: 'sell', label: 'Sell' },
];

const URGENCY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
];

function buildInitialEditForm(request) {
  return {
    client_name: request.client_name || '',
    client_email: request.client_email || '',
    client_phone: request.client_phone || '',
    location: request.location || '',
    property_type: request.property_type || '',
    request_type: request.request_type || 'rent',
    bedrooms: request.bedrooms ?? '',
    bathrooms: request.bathrooms ?? '',
    budget_min: request.budget_min ?? '',
    budget_max: request.budget_max ?? '',
    urgency: request.urgency || 'normal',
    description: request.description || '',
  };
}

function EditRequestModal({ request, onClose, onSave, busy }) {
  const [form, setForm] = useState(() => buildInitialEditForm(request));
  const [errors, setErrors] = useState({});

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = () => {
    const next = {};
    if (!String(form.client_name).trim()) next.client_name = 'Name is required';
    if (
      form.client_email &&
      !/^\S+@\S+\.\S+$/.test(String(form.client_email).trim())
    ) {
      next.client_email = 'Enter a valid email';
    }
    if (form.budget_min !== '' && form.budget_max !== '') {
      const min = Number(form.budget_min);
      const max = Number(form.budget_max);
      if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
        next.budget_max = 'Max must be ≥ min';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const fields = {
      client_name: form.client_name,
      client_email: form.client_email,
      client_phone: form.client_phone,
      location: form.location,
      property_type: form.property_type,
      request_type: form.request_type,
      urgency: form.urgency,
      description: form.description,
    };

    if (form.bedrooms !== '') fields.bedrooms = Number(form.bedrooms);
    if (form.bathrooms !== '') fields.bathrooms = Number(form.bathrooms);
    if (form.budget_min !== '') fields.budget_min = Number(form.budget_min);
    if (form.budget_max !== '') fields.budget_max = Number(form.budget_max);

    onSave(fields);
  };

  const fieldError = (key) =>
    errors[key] ? <p className="mt-1 text-xs text-red-600">{errors[key]}</p> : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Edit request</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Update the client details for this request.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Client name *</label>
              <input
                type="text"
                value={form.client_name}
                onChange={(e) => setField('client_name', e.target.value)}
                className={inputClass}
                placeholder="Full name"
              />
              {fieldError('client_name')}
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={form.client_email}
                onChange={(e) => setField('client_email', e.target.value)}
                className={inputClass}
                placeholder="client@example.com"
              />
              {fieldError('client_email')}
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={form.client_phone}
                onChange={(e) => setField('client_phone', e.target.value)}
                className={inputClass}
                placeholder="876-123-4567"
              />
            </div>
            <div>
              <label className={labelClass}>Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setField('location', e.target.value)}
                className={inputClass}
                placeholder="Kingston, St. Andrew"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Request type</label>
              <select
                value={form.request_type}
                onChange={(e) => setField('request_type', e.target.value)}
                className={inputClass}
              >
                {REQUEST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Property type</label>
              <input
                type="text"
                value={form.property_type}
                onChange={(e) => setField('property_type', e.target.value)}
                className={inputClass}
                placeholder="House, apartment, land…"
              />
            </div>
            <div>
              <label className={labelClass}>Urgency</label>
              <select
                value={form.urgency}
                onChange={(e) => setField('urgency', e.target.value)}
                className={inputClass}
              >
                {URGENCY_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className={labelClass}>Bedrooms</label>
              <input
                type="number"
                min="0"
                max="20"
                value={form.bedrooms}
                onChange={(e) => setField('bedrooms', e.target.value)}
                className={inputClass}
                placeholder="3"
              />
            </div>
            <div>
              <label className={labelClass}>Bathrooms</label>
              <input
                type="number"
                min="0"
                max="20"
                value={form.bathrooms}
                onChange={(e) => setField('bathrooms', e.target.value)}
                className={inputClass}
                placeholder="2"
              />
            </div>
            <div>
              <label className={labelClass}>Budget min (JMD)</label>
              <input
                type="number"
                min="0"
                value={form.budget_min}
                onChange={(e) => setField('budget_min', e.target.value)}
                className={inputClass}
                placeholder="50000"
              />
            </div>
            <div>
              <label className={labelClass}>Budget max (JMD)</label>
              <input
                type="number"
                min="0"
                value={form.budget_max}
                onChange={(e) => setField('budget_max', e.target.value)}
                className={inputClass}
                placeholder="120000"
              />
              {fieldError('budget_max')}
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={4}
              className={`${inputClass} resize-none`}
              placeholder="Client notes about what they're looking for…"
            />
          </div>
        </form>

        <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}