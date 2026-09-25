import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth, useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Mail,
  MapPin,
  DollarSign,
  Calendar,
  Briefcase,
  Home,
  BedDouble,
  Bath,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

const formatJMD = (value) => `J$${Number(value || 0).toLocaleString()}`;

const STATUS_STYLES = {
  pending: {
    label: 'Pending',
    icon: Clock,
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    strip: 'bg-amber-400',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle2,
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    strip: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    badge: 'bg-red-100 text-red-800 border-red-200',
    strip: 'bg-red-500',
  },
};

const getStatusStyle = (status) => STATUS_STYLES[status] || STATUS_STYLES.pending;

export default function AgentApplicationsPage() {
  const { user } = useUser();
  const { getToken, isLoaded: authLoaded, userId } = useAuth();
  const [applications, setApplications] = useState([]);
  const [requests, setRequests] = useState({});
  const [agents, setAgents] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [updateLoading, setUpdateLoading] = useState(null);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/admin/verify-admin');
      const payload = await response.json();

      if (response.ok && payload?.isAdmin) {
        setIsAdmin(true);
        fetchApplications();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    } catch (err) {
      console.error('Admin check error:', err);
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      if (!authLoaded || !userId) throw new Error('Session expired. Please sign in again.');
      const token = await getToken();

      const response = await fetch('/api/admin/agent-applications', {
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const raw = await response.text();
      let payload = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch (parseErr) {
        payload = null;
      }

      if (!response.ok || !payload?.success) {
        const message =
          payload?.error ||
          payload?.message ||
          (raw && !raw.startsWith('<!DOCTYPE') ? raw : '') ||
          'Failed to load applications';

        throw new Error(message);
      }

      setApplications(payload.applications || []);
      setRequests(payload.requests || {});
      setAgents(payload.agents || {});
    } catch (err) {
      console.error('Error fetching applications:', err);
      if (err?.message) toast.error(err.message);
      else toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appId, newStatus) => {
    setUpdateLoading(appId);
    try {
      if (!authLoaded || !userId) throw new Error('Session expired. Please sign in again.');
      const token = await getToken();

      const response = await fetch('/api/admin/agent-applications', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ appId, status: newStatus }),
      });

      const raw = await response.text();
      let payload = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch (parseErr) {
        payload = null;
      }

      if (!response.ok || !payload?.success) {
        const message =
          payload?.error ||
          payload?.message ||
          (raw && !raw.startsWith('<!DOCTYPE') ? raw : '') ||
          'Failed to update application';

        throw new Error(message);
      }

      toast.success(`Application ${newStatus}`);
      fetchApplications();
    } catch (err) {
      console.error('Error updating application:', err);
      if (err?.message) toast.error(err.message);
      else toast.error('Failed to update application');
    } finally {
      setUpdateLoading(null);
    }
  };

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  const filteredApplications = applications.filter((app) => {
    if (filterStatus === 'all') return true;
    return app.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-24 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
        <div className="h-40 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
        <div className="h-40 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <XCircle className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Access denied</h1>
          <p className="mt-2 text-sm text-slate-600">
            Admin access is required to view applications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Agent Applications — Admin</title>
      </Head>

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Applications
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Agent Request Applications
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Review agent applications to client requests and approve or reject.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchApplications}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All', count: counts.all, tone: 'slate' },
            { key: 'pending', label: 'Pending', count: counts.pending, tone: 'amber' },
            { key: 'approved', label: 'Approved', count: counts.approved, tone: 'emerald' },
            { key: 'rejected', label: 'Rejected', count: counts.rejected, tone: 'red' },
          ].map(({ key, label, count, tone }) => {
            const selected = filterStatus === key;
            const classes = {
              slate: selected
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
              amber: selected
                ? 'border-amber-500 bg-amber-500 text-white'
                : 'border-amber-200 bg-white text-amber-700 hover:border-amber-300',
              emerald: selected
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300',
              red: selected
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-red-200 bg-white text-red-700 hover:border-red-300',
            }[tone];

            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilterStatus(key)}
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

        {/* Results */}
        {filteredApplications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              {applications.length === 0
                ? 'No applications yet'
                : 'No applications in this view'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {applications.length === 0
                ? 'New agent applications will appear here.'
                : 'Try switching the filter above.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((app) => {
              const request = requests[app.request_id];
              const agent = agents[app.agent_id];
              const statusUi = getStatusStyle(app.status);
              const StatusIcon = statusUi.icon;
              const isUpdating = updateLoading === app.id;

              return (
                <article
                  key={app.id}
                  className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white  transition "
                >
                  {/* Status strip */}
                  <div className={`absolute inset-y-0 left-0 w-1 ${statusUi.strip}`} />

                  <div className="pl-5 pr-4 pt-4 pb-4 sm:pl-6 sm:pr-5 sm:pt-5 sm:pb-5">
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">
                            {agent?.full_name || 'Unknown agent'}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusUi.badge}`}
                          >
                            <StatusIcon size={11} />
                            {statusUi.label}
                          </span>
                        </div>
                        {agent?.email && (
                          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-600">
                            <Mail size={12} className="shrink-0 text-slate-400" />
                            <span className="truncate">{agent.email}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Request details */}
                    {request ? (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 ">
                            <Home size={11} />
                            {request.request_type || 'request'}
                          </span>
                          {request.property_type && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 ">
                              {request.property_type}
                            </span>
                          )}
                          {request.bedrooms != null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 ">
                              <BedDouble size={11} />
                              {request.bedrooms} bd
                            </span>
                          )}
                          {request.bathrooms != null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 ">
                              <Bath size={11} />
                              {request.bathrooms} ba
                            </span>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {request.location && (
                            <div className="flex items-start gap-2">
                              <MapPin size={13} className="mt-0.5 shrink-0 text-slate-400" />
                              <p className="min-w-0 truncate text-sm text-slate-700">
                                {request.location}
                              </p>
                            </div>
                          )}
                          {request.budget_min != null && (
                            <div className="flex items-start gap-2">
                              <DollarSign size={13} className="mt-0.5 shrink-0 text-slate-400" />
                              <p className="min-w-0 truncate text-sm font-medium text-slate-700">
                                {formatJMD(request.budget_min)} –{' '}
                                {formatJMD(request.budget_max)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        Request details unavailable.
                      </div>
                    )}

                    {/* Agent plan */}
                    {agent?.payment_status && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-slate-500">
                          <Briefcase size={12} />
                          Plan
                        </span>
                        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 font-semibold capitalize text-accent">
                          {agent.payment_status}
                        </span>
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={11} />
                        Applied {new Date(app.applied_at).toLocaleString()}
                      </span>
                      {app.reviewed_at && (
                        <span className="inline-flex items-center gap-1.5">
                          <CheckCircle2 size={11} />
                          Reviewed {new Date(app.reviewed_at).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    {app.status === 'pending' && (
                      <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(app.id, 'approved')}
                          disabled={isUpdating}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <CheckCircle2 size={15} />
                          {isUpdating ? 'Updating…' : 'Approve application'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(app.id, 'rejected')}
                          disabled={isUpdating}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          <XCircle size={15} />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}