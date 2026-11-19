import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { ArrowLeft, Check, Copy, X, Eye, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

async function requestJson(url, options = {}, getToken) {
  const token = await getToken();
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load payments.');
  return payload;
}

async function fetchAdminJson(url, getToken) {
  const token = await getToken();
  const response = await fetch(url, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.json();
}

const formatJMD = (amount) => `J$${Number(amount || 0).toLocaleString('en-JM', { maximumFractionDigits: 2 })}`;
const toDateInput = (date) => date.toISOString().slice(0, 10);

export default function AdminPaymentsPage() {
  const { getToken, isLoaded: authLoaded } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [period, setPeriod] = useState('all');
  const [anchorDate, setAnchorDate] = useState(() => toDateInput(new Date()));
  const [status, setStatus] = useState('pending');
  const [actingId, setActingId] = useState('');
  const [copiedReference, setCopiedReference] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');

  useEffect(() => {
    if (!authLoaded) return;
    async function load() {
      try {
        const admin = await fetchAdminJson('/api/admin/verify-admin', getToken);
        if (!admin.isAdmin) throw new Error('Administrator access is required.');
        setAuthorized(true);
        const payload = await requestJson('/api/admin/payments', {}, getToken);
        setPayments(payload.payments || []);
      } catch (error) {
        toast.error(error.message || 'Unable to load payments.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authLoaded, getToken]);

  const refreshPayments = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshError('');
    try {
      const payload = await requestJson('/api/admin/payments', {}, getToken);
      setPayments(payload.payments || []);
    } catch (error) {
      console.error('Unable to refresh submitted payments:', error);
      setRefreshError(error.message || 'Unable to refresh submitted payments.');
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, getToken]);

  useEffect(() => {
    if (!authorized) return undefined;
    window.addEventListener('focus', refreshPayments);
    return () => window.removeEventListener('focus', refreshPayments);
  }, [authorized, refreshPayments]);

  const filtered = useMemo(() => {
    const anchor = new Date(`${anchorDate}T12:00:00`);
    return payments.filter((payment) => {
      if (status !== 'all' && payment.status !== status) return false;
      if (period === 'all') return true;
      const submitted = new Date(payment.submittedAt);
      if (period === 'day') {
        return submitted.toDateString() === anchor.toDateString();
      }
      if (period === 'week') {
        const start = new Date(anchor);
        start.setDate(anchor.getDate() - anchor.getDay());
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        return submitted >= start && submitted < end;
      }
      if (period === 'month') {
        return submitted.getFullYear() === anchor.getFullYear() && submitted.getMonth() === anchor.getMonth();
      }
      return submitted.getFullYear() === anchor.getFullYear();
    });
  }, [payments, period, anchorDate, status]);

  const totals = useMemo(() => {
    const approved = filtered.filter((payment) => payment.status === 'approved');
    const pending = filtered.filter((payment) => payment.status === 'pending');
    return {
      approved: approved.reduce((sum, payment) => sum + (payment.currency === 'JMD' ? Number(payment.amount) : 0), 0),
      pending: pending.reduce((sum, payment) => sum + (payment.currency === 'JMD' ? Number(payment.amount) : 0), 0),
      count: filtered.length,
    };
  }, [filtered]);

  const moveAnchor = (direction) => {
    const date = new Date(`${anchorDate}T12:00:00`);
    if (period === 'day') date.setDate(date.getDate() + direction);
    if (period === 'week') date.setDate(date.getDate() + direction * 7);
    if (period === 'month') date.setMonth(date.getMonth() + direction);
    if (period === 'year') date.setFullYear(date.getFullYear() + direction);
    setAnchorDate(toDateInput(date));
  };

  const act = async (paymentId, action) => {
    setActingId(paymentId);
    try {
      await requestJson('/api/admin/payments', {
        method: 'PATCH',
        body: JSON.stringify({ paymentId, action }),
      }, getToken);
      toast.success(action === 'approve' ? 'Payment approved.' : 'Payment rejected.');
      const payload = await requestJson('/api/admin/payments', {}, getToken);
      setPayments(payload.payments || []);
    } catch (error) {
      toast.error(error.message || 'Unable to update payment.');
    } finally {
      setActingId('');
    }
  };

  const copyPayerReference = async (payment) => {
    try {
      await navigator.clipboard.writeText(payment.payerReference);
      setCopiedReference(payment.id);
      toast.success('User ID copied.');
      window.setTimeout(() => setCopiedReference(''), 1800);
    } catch (error) {
      console.error('Unable to copy payment user ID:', error);
      toast.error('Unable to copy the user ID.');
    }
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center text-slate-600">Loading payments…</main>;
  if (!authorized) return <main className="mx-auto max-w-xl px-4 py-20 text-center text-slate-700">Administrator access is required.</main>;

  return (
    <>
      <Head><title>Payments — Admin</title></Head>
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <Link href="/admin" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-accent">
          <ArrowLeft size={16} /> Admin dashboard
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Submitted payments</h1>
            <p className="mt-1 text-sm text-slate-600">Review bank-transfer receipts across the platform.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {period !== 'all' && (
              <>
                <button type="button" onClick={() => moveAnchor(-1)} className="rounded-lg bg-slate-100 p-2 text-slate-700" aria-label="Previous period"><ChevronLeft size={18} /></button>
                <input type={period === 'year' ? 'number' : 'date'} value={period === 'year' ? anchorDate.slice(0, 4) : anchorDate} onChange={(event) => setAnchorDate(period === 'year' ? `${event.target.value}-01-01` : event.target.value)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm" />
                <button type="button" onClick={() => moveAnchor(1)} className="rounded-lg bg-slate-100 p-2 text-slate-700" aria-label="Next period"><ChevronRight size={18} /></button>
              </>
            )}
          </div>
          <button type="button" onClick={refreshPayments} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
            {refreshing && <Loader2 size={15} className="animate-spin" />}
            {refreshing ? 'Refreshing…' : 'Refresh payments'}
          </button>
        </div>

        {refreshError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{refreshError}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          {['day', 'week', 'month', 'year', 'all'].map((value) => (
            <button key={value} type="button" onClick={() => setPeriod(value)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${period === value ? 'bg-accent text-white' : 'bg-slate-100 text-slate-700'}`}>
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-100 p-4"><p className="text-xs font-semibold text-slate-500">PAYMENTS</p><p className="mt-1 text-2xl font-bold">{totals.count}</p></div>
          <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-700">APPROVED JMD</p><p className="mt-1 text-2xl font-bold text-emerald-900">{formatJMD(totals.approved)}</p></div>
          <div className="rounded-xl bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-700">PENDING JMD</p><p className="mt-1 text-2xl font-bold text-amber-900">{formatJMD(totals.pending)}</p></div>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No submitted payments match this filter.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((payment) => (
                <div key={payment.id} className="grid gap-4 p-4 md:grid-cols-[1fr_180px_140px] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{payment.payerName}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{payment.source}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{payment.reference}</p>
                    {payment.payerEmail && <p className="text-xs text-slate-500">{payment.payerEmail}</p>}
                    {payment.payerReference && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600">USER ID</span>
                        <code className="rounded bg-slate-100 px-2 py-1 text-sm font-bold tracking-wider text-slate-900">
                          {payment.payerReference}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyPayerReference(payment)}
                          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                          aria-label={`Copy user ID ${payment.payerReference}`}
                        >
                          {copiedReference === payment.id ? <Check size={18} /> : <Copy size={18} />}
                          {copiedReference === payment.id ? 'Copied' : 'Copy ID'}
                        </button>
                      </div>
                    )}
                    <p className="mt-1 text-xs text-slate-500">{new Date(payment.submittedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{payment.currency === 'JMD' ? formatJMD(payment.amount) : `${payment.currency} ${Number(payment.amount).toLocaleString()}`}</p>
                    <p className={`mt-1 text-xs font-semibold ${payment.status === 'approved' ? 'text-emerald-600' : payment.status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>{payment.status}</p>
                    {payment.receiptUrl && (
                      <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"><Eye size={13} /> View receipt</a>
                    )}
                  </div>
                  <div className="flex gap-2 md:justify-end">
                    {payment.status === 'pending' && (
                      <>
                        <button type="button" disabled={actingId === payment.id} onClick={() => act(payment.id, 'approve')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"><Check size={15} /> Approve</button>
                        <button type="button" disabled={actingId === payment.id} onClick={() => act(payment.id, 'reject')} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"><X size={15} /> Reject</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
