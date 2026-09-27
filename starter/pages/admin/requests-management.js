import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';
import {
  Search,
  Filter,
  X,
  RefreshCw,
  ChevronDown,
  UserPlus,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Phone,
  PhoneOff,
  Trash2,
  UserMinus,
  Users,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  Check,
  Pencil,
} from 'lucide-react';

/* ----------------------------------------------------------
 * Style tokens
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
  deleted: { badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
};

const getStatusStyle = (status) => STATUS_STYLES[status] || STATUS_STYLES.deleted;

/* ============================================================
 * Page component
 * ============================================================ */

export default function RequestsManagementPage() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [requests, setRequests] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedRequests, setSelectedRequests] = useState(new Set());
  const [filterDate, setFilterDate] = useState('');
  const [sortBy, setSortBy] = useState('edited-desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* Assign modal */
  const [assignContext, setAssignContext] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState('');

  /* Edit modal */
  const [editTarget, setEditTarget] = useState(null);

  /* In-flight action */
  const [pendingAction, setPendingAction] = useState(null);

  /* ----------------------------------------------------------
   * Admin gate
   * ---------------------------------------------------------- */
  useEffect(() => {
    const checkAdmin = async () => {
      if (!isSignedIn || !user) {
        router.push('/');
        return;
      }
      try {
        const verifyResponse = await fetch('/api/admin/verify-admin');
        const verifyPayload = await verifyResponse.json();

        if (!verifyResponse.ok || !verifyPayload?.isAdmin) {
          toast.error('You do not have admin access');
          router.push('/');
          return;
        }

        setIsAdmin(true);
        setLoading(false);
      } catch (err) {
        console.error('Admin check error:', err);
        toast.error('Failed to verify admin access');
        router.push('/');
      }
    };

    checkAdmin();
  }, [isSignedIn, user]);

  /* ----------------------------------------------------------
   * Fetch
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (isAdmin && !loading) {
      fetchRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, loading]);

  const fetchRequests = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/requests-management');
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load requests');
      }
      setRequests(payload.requests || []);
      setAgents(payload.agents || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      toast.error('Failed to load requests');
    } finally {
      setRefreshing(false);
    }
  };

  /* ----------------------------------------------------------
   * Core action runner
   * ---------------------------------------------------------- */
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

  /* ----------------------------------------------------------
   * Per-card actions
   * ---------------------------------------------------------- */
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

  /* ----------------------------------------------------------
   * Assign modal (bulk or single)
   * ---------------------------------------------------------- */
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

  /* ----------------------------------------------------------
   * Bulk actions
   * ---------------------------------------------------------- */
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
    if (!window.confirm(`Remove comments from ${selectedRequests.size} requests?`)) return;
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

  /* ----------------------------------------------------------
   * Selection
   * ---------------------------------------------------------- */
  const toggleSelectRequest = (id) => {
    const next = new Set(selectedRequests);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRequests(next);
  };

  /* ----------------------------------------------------------
   * Filter + sort
   * ---------------------------------------------------------- */
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
    if (selectedRequests.size === filteredRequests.length && filteredRequests.length > 0) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(filteredRequests.map((r) => r.id)));
    }
  };

  const allSelected =
    selectedRequests.size === filteredRequests.length && filteredRequests.length > 0;

  /* ----------------------------------------------------------
   * Counts
   * ---------------------------------------------------------- */
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

  /* ----------------------------------------------------------
   * Loading / access states
   * ---------------------------------------------------------- */
  if (loading) {
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

  if (!isAdmin) return null;

  const selectedCount = selectedRequests.size;
  const isBulkPending = pendingAction === 'bulk';
  const hasAgents = agents.length > 0;

  /* ----------------------------------------------------------
   * Render
   * ---------------------------------------------------------- */
  return (
    <>
      <Head>
        <title>Requests Management — Dosnine Admin</title>
      </Head>

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Requests Management
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Manage Requests
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Edit, assign, and update status on any request.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchRequests}
            disabled={refreshing}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
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
            { key: 'completed', label: 'Completed', count: statusCounts.completed, tone: 'emerald' },
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

        {/* Requests list */}
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
                  pendingAction?.requestId === request.id
                    ? pendingAction.action
                    : null
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

      {/* Assign modal */}
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

      {/* Edit modal */}
      {editTarget && (
        <EditRequestModal
          request={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(fields) => handleEditSave(editTarget.id, fields)}
          busy={pendingAction?.requestId === editTarget.id && pendingAction?.action === 'edit'}
        />
      )}
    </>
  );
}

/* ============================================================
 * Request card
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

      {/* Per-card actions */}
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

/* ============================================================
 * Assign modal
 * ============================================================ */

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

/* ============================================================
 * Edit request modal
 * ============================================================ */

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

    // Only include numeric fields if the user actually entered a value
    if (form.bedrooms !== '') fields.bedrooms = Number(form.bedrooms);
    if (form.bathrooms !== '') fields.bathrooms = Number(form.bathrooms);
    if (form.budget_min !== '') fields.budget_min = Number(form.budget_min);
    if (form.budget_max !== '') fields.budget_max = Number(form.budget_max);

    onSave(fields);
  };

  const fieldError = (key) =>
    errors[key] ? (
      <p className="mt-1 text-xs text-red-600">{errors[key]}</p>
    ) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          {/* Contact */}
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

          {/* Type */}
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

          {/* Specs + budget */}
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

          {/* Description */}
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

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form=""
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