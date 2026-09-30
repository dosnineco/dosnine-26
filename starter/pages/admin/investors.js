import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import {
  Users,
  DollarSign,
  TrendingUp,
  Percent,
  Mail,
  Phone,
  Calendar,
  Search,
  X,
  ArrowUpDown,
  Copy,
  Check,
  AlertCircle,
  Building2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';

const TIER_STYLES = {
  'USD 30K': { label: 'USD 30K', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  'USD 20K': { label: 'USD 20K', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  'USD 10K': { label: 'USD 10K', badge: 'bg-violet-100 text-violet-800 border-violet-200' },
};

const getTierStyle = (amountLabel) =>
  TIER_STYLES[amountLabel] || {
    label: amountLabel || 'Unknown',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  };

const formatUSD = (value) =>
  `USD ${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20';
const labelClass =
  'block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5';

export default function HillLotInvestorsPage() {
  const { user } = useUser();
  const { getToken, isLoaded: authLoaded } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [copied, setCopied] = useState('');

  const [modal, setModal] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  /* ----------------------------------------------------------
   * Authed fetch helper (Bearer token + cookies)
   * ---------------------------------------------------------- */
  const authedFetch = async (url, options = {}) => {
    const token = await getToken();
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });
  };

  /* ----------------------------------------------------------
   * Admin verification
   * ---------------------------------------------------------- */
  useEffect(() => {
    const verify = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      if (!authLoaded) return;

      try {
        const token = await getToken();
        const response = await fetch('/api/admin/verify-admin', {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const payload = await response.json();

        if (!response.ok || !payload?.isAdmin) {
          setIsAdmin(false);
          toast.error('Access denied');
          return;
        }
        setIsAdmin(true);
        fetchData();
      } catch (error) {
        setIsAdmin(false);
        toast.error('Unable to verify admin access');
      } finally {
        setLoading(false);
      }
    };

    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoaded]);

  /* ----------------------------------------------------------
   * Fetch
   * ---------------------------------------------------------- */
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await authedFetch('/api/admin/hill-lot-investors');
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to load investor data');
      }
      setItems(payload.items || []);
    } catch (error) {
      toast.error(error.message || 'Unable to load investor data');
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------
   * CRUD handlers
   * ---------------------------------------------------------- */
  const openCreate = () =>
    setModal({
      mode: 'create',
      item: {
        full_name: '',
        email: '',
        phone: '',
        investment_amount: '',
        stay_type: '',
      },
    });

  const openEdit = (item) =>
    setModal({
      mode: 'edit',
      item: {
        id: item.id,
        full_name: item.full_name || '',
        email: item.email || '',
        phone: item.phone || '',
        investment_amount:
          item.investment_amount !== undefined && item.investment_amount !== null
            ? String(item.investment_amount)
            : '',
        stay_type: item.stay_type || '',
      },
    });

  const closeModal = () => setModal(null);

  const handleSave = async (form) => {
    const isEdit = modal?.mode === 'edit';
    const trimmedName = form.full_name?.trim() || '';

    if (!trimmedName) {
      toast.error('Full name is required');
      return;
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      toast.error('Enter a valid email address');
      return;
    }

    const payloadBody = {
      full_name: trimmedName,
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      investment_amount:
        form.investment_amount === '' ||
        form.investment_amount === null ||
        form.investment_amount === undefined
          ? null
          : Number(form.investment_amount),
      stay_type: form.stay_type?.trim() || null,
    };

    if (isEdit) payloadBody.id = form.id;

    try {
      setPendingId(isEdit ? form.id : 'create');
      const response = await authedFetch('/api/admin/hill-lot-investors', {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(payloadBody),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to save investor');
      }

      toast.success(isEdit ? 'Investor updated' : 'Investor added');
      closeModal();
      await fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save investor');
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (item) => {
    const label = item.full_name || 'this investor';
    if (!confirm(`Delete submission from "${label}"? This cannot be undone.`)) {
      return;
    }

    try {
      setPendingId(item.id);
      const response = await authedFetch('/api/admin/hill-lot-investors', {
        method: 'DELETE',
        body: JSON.stringify({ id: item.id }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to delete investor');
      }
      toast.success('Investor deleted');
      await fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete investor');
    } finally {
      setPendingId(null);
    }
  };

  /* ----------------------------------------------------------
   * Summary metrics
   * ---------------------------------------------------------- */
  const summary = useMemo(() => {
    const totalInvestors = items.length;

    const totalRaised = items.reduce(
      (sum, item) => sum + Number(item.amount_value || 0),
      0
    );

    const estimatedAnnual = items.reduce(
      (sum, item) =>
        sum + Number(item.amount_value || 0) * (item.rate_value || 0),
      0
    );

    const averageInvestment =
      totalInvestors > 0 ? totalRaised / totalInvestors : 0;

    const averageRate =
      totalInvestors > 0
        ? items.reduce((sum, item) => sum + Number(item.rate_value || 0), 0) /
          totalInvestors
        : 0;

    const tierBreakdown = items.reduce((acc, item) => {
      const key = item.amount_label || 'Unknown';
      if (!acc[key]) acc[key] = { count: 0, total: 0 };
      acc[key].count += 1;
      acc[key].total += Number(item.amount_value || 0);
      return acc;
    }, {});

    return {
      totalInvestors,
      totalRaised,
      estimatedAnnual,
      averageInvestment,
      averageRate,
      tierBreakdown,
    };
  }, [items]);

  /* ----------------------------------------------------------
   * Filter + sort
   * ---------------------------------------------------------- */
  const filteredAndSorted = useMemo(() => {
    let result = [...items];

    if (tierFilter !== 'all') {
      result = result.filter((item) => item.amount_label === tierFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.full_name?.toLowerCase().includes(q) ||
          item.email?.toLowerCase().includes(q) ||
          item.phone?.includes(q)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case 'oldest':
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        case 'highest':
          return Number(b.amount_value || 0) - Number(a.amount_value || 0);
        case 'lowest':
          return Number(a.amount_value || 0) - Number(b.amount_value || 0);
        case 'return-high':
          return (
            Number(b.projected_annual || 0) - Number(a.projected_annual || 0)
          );
        case 'name':
          return (a.full_name || '').localeCompare(b.full_name || '');
        default:
          return 0;
      }
    });

    return result;
  }, [items, search, tierFilter, sortBy]);

  const copyToClipboard = async (value, key) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(key);
      toast.success('Copied');
      setTimeout(() => setCopied(''), 1500);
    } catch {
      toast.error('Unable to copy');
    }
  };

  const tierOptions = useMemo(() => {
    const unique = new Set(items.map((i) => i.amount_label).filter(Boolean));
    return ['all', ...Array.from(unique)];
  }, [items]);

  const activeFilterCount = [
    tierFilter !== 'all',
    Boolean(search.trim()),
    sortBy !== 'newest',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch('');
    setTierFilter('all');
    setSortBy('newest');
  };

  /* ----------------------------------------------------------
   * Access denied
   * ---------------------------------------------------------- */
  if (!isAdmin && !loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            Access denied
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Admin access is required to view investor data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Hill Lot Investors — Admin</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Investors
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Hill Lot Investor Interest
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Review submissions, capital commitments, and projected annual
              returns.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 self-start">
            <button
              type="button"
              onClick={openCreate}
              disabled={pendingId === 'create'}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60"
            >
              <Plus size={14} />
              Add investor
            </button>
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <TrendingUp size={14} />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total investors"
            value={summary.totalInvestors.toLocaleString()}
            tone="accent"
          />
          <StatCard
            icon={DollarSign}
            label="Capital committed"
            value={formatUSD(summary.totalRaised)}
            tone="emerald"
          />
          <StatCard
            icon={Percent}
            label="Avg. investment"
            value={formatUSD(summary.averageInvestment)}
            tone="blue"
          />
          <StatCard
            icon={TrendingUp}
            label="Projected annual"
            value={formatUSD(summary.estimatedAnnual)}
            tone="violet"
          />
        </div>

        {/* Tier breakdown */}
        {Object.keys(summary.tierBreakdown).length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tier breakdown
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {Object.entries(summary.tierBreakdown)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([tier, data]) => {
                  const tierStyle = getTierStyle(tier);
                  const percentage =
                    summary.totalRaised > 0
                      ? (data.total / summary.totalRaised) * 100
                      : 0;

                  return (
                    <div
                      key={tier}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tierStyle.badge}`}
                        >
                          {tierStyle.label}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {data.count}{' '}
                          {data.count === 1 ? 'investor' : 'investors'}
                        </span>
                      </div>
                      <p className="mt-3 text-lg font-bold text-slate-900">
                        {formatUSD(data.total)}
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        {percentage.toFixed(1)}% of total capital
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, or phone…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="appearance-none rounded-full border border-slate-200 bg-white py-2.5 pl-4 pr-9 text-sm font-semibold text-slate-700 transition hover:border-slate-300 focus:border-accent focus:outline-none"
                >
                  <option value="all">All tiers</option>
                  {tierOptions
                    .filter((t) => t !== 'all')
                    .map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                </select>
                <ArrowUpDown
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none rounded-full border border-slate-200 bg-white py-2.5 pl-4 pr-9 text-sm font-semibold text-slate-700 transition hover:border-slate-300 focus:border-accent focus:outline-none"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="highest">Highest investment</option>
                  <option value="lowest">Lowest investment</option>
                  <option value="return-high">Highest projected return</option>
                  <option value="name">Name (A–Z)</option>
                </select>
                <ArrowUpDown
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  <X size={12} />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results count */}
        {!loading && items.length > 0 && (
          <p className="text-sm text-slate-500">
            Showing{' '}
            <strong className="text-slate-900">
              {filteredAndSorted.length}
            </strong>{' '}
            of {items.length} investor{items.length === 1 ? '' : 's'}
          </p>
        )}

        {/* Investor list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <Building2 className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              No investor interest yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Submissions from the Hill Lot interest form will appear here.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90"
            >
              <Plus size={14} />
              Add investor
            </button>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              No investors match your filters
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try clearing the search or switching the tier filter.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSorted.map((item) => {
              const tierStyle = getTierStyle(item.amount_label);
              const initials = (item.full_name || '?')
                .split(' ')
                .map((part) => part[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase();

              const isBusy = pendingId === item.id;

              return (
                <article
                  key={item.id}
                  className={`rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 ${
                    isBusy ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                    <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-start">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
                        {initials || '?'}
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tierStyle.badge}`}
                      >
                        {tierStyle.label}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-slate-900">
                        {item.full_name || 'Unnamed investor'}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                        {item.email && (
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(item.email, `${item.id}-email`)
                            }
                            className="group inline-flex items-center gap-1.5 text-slate-600 transition hover:text-accent"
                          >
                            <Mail size={13} className="text-slate-400" />
                            <span className="truncate">{item.email}</span>
                            {copied === `${item.id}-email` ? (
                              <Check size={11} className="text-emerald-600" />
                            ) : (
                              <Copy
                                size={11}
                                className="opacity-0 transition group-hover:opacity-100"
                              />
                            )}
                          </button>
                        )}

                        {item.phone && (
                          <a
                            href={`tel:${item.phone}`}
                            className="inline-flex items-center gap-1.5 text-slate-600 transition hover:text-accent"
                          >
                            <Phone size={13} className="text-slate-400" />
                            {item.phone}
                          </a>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <MetricBox
                          label="Investment"
                          value={formatUSD(item.amount_value)}
                        />
                        <MetricBox
                          label="Rate"
                          value={
                            item.rate_value
                              ? `${(Number(item.rate_value) * 100).toFixed(2)}%`
                              : '—'
                          }
                        />
                        <MetricBox
                          label="Projected annual"
                          value={formatUSD(item.projected_annual)}
                          tone="emerald"
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={11} />
                          Submitted{' '}
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString(
                                'en-US',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                }
                              )
                            : '—'}
                        </span>
                        {item.stay_type && (
                          <span className="inline-flex items-center gap-1.5 capitalize">
                            <Building2 size={11} />
                            {item.stay_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action bar */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={isBusy}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      {modal && (
        <InvestorModal
          mode={modal.mode}
          initial={modal.item}
          saving={pendingId === 'create' || pendingId === modal.item?.id}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </>
  );
}

/* ----------------------------------------------------------
 * Sub-components
 * ---------------------------------------------------------- */

const TONE_STYLES = {
  accent: { bg: 'bg-accent/10', text: 'text-accent' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
};

function StatCard({ icon: Icon, label, value, tone = 'accent' }) {
  const style = TONE_STYLES[tone] || TONE_STYLES.accent;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.bg} ${style.text}`}
        >
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function MetricBox({ label, value, tone }) {
  const valueClass =
    tone === 'emerald' ? 'text-emerald-600' : 'text-slate-900';
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-1 truncate text-sm font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function InvestorModal({ mode, initial, saving, onClose, onSave }) {
  const [form, setForm] = useState({
    id: initial?.id,
    full_name: initial?.full_name || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    investment_amount: initial?.investment_amount ?? '',
    stay_type: initial?.stay_type || '',
  });

  const setField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const isEdit = mode === 'edit';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit ? 'Edit investor' : 'Add investor'}
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {isEdit
                ? 'Update the details for this investor submission.'
                : 'Manually add an investor submission.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div>
            <label className={labelClass}>Full name *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setField('full_name', e.target.value)}
              className={inputClass}
              placeholder="e.g. Jane Doe"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                className={inputClass}
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                className={inputClass}
                placeholder="876-123-4567"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Investment amount (USD)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={form.investment_amount}
                onChange={(e) => setField('investment_amount', e.target.value)}
                className={inputClass}
                placeholder="30000"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Tiers: $10K (3%), $20K (3.25%), $30K+ (4%)
              </p>
            </div>
            <div>
              <label className={labelClass}>Stay type</label>
              <input
                type="text"
                value={form.stay_type}
                onChange={(e) => setField('stay_type', e.target.value)}
                className={inputClass}
                placeholder="e.g. Long-term, Short-term"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add investor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}