import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import { useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { formatJMD } from '../../lib/formatMoney';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  BedDouble,
  MapPin,
  Home,
  Clock,
  BarChart3,
  RefreshCw,
  AlertCircle,
  ShieldX,
  Search,
  Zap,
  Building2,
  Calendar,
} from 'lucide-react';

/* ----------------------------------------------------------
 * Tokens
 * ---------------------------------------------------------- */
const TONE_STYLES = {
  accent: { bg: 'bg-accent/10', text: 'text-accent' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  red: { bg: 'bg-red-50', text: 'text-red-600' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

/* ============================================================
 * Page
 * ============================================================ */

export default function AdminMarketIntelligence() {
  const { user, isLoaded } = useUser();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchMetrics = async (options = {}) => {
    const { silent = false } = options;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const response = await fetch('/api/admin/market-intelligence');
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load market intelligence');
      }
      setMetrics(payload.metrics || {});
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed fetching market intelligence:', error);
      toast.error('Could not load market intelligence');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    const verifyAdmin = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/admin/verify-admin');
        const payload = await response.json();

        if (!response.ok || !payload?.isAdmin) {
          toast.error('Access denied: Admin only');
          setIsAdmin(false);
          return;
        }

        if (!payload.email || !payload.name) {
          toast.error('Access denied: Admin account incomplete');
          setIsAdmin(false);
          return;
        }

        setIsAdmin(true);
        fetchMetrics();
      } catch (error) {
        console.error('Market intelligence auth error:', error);
        setIsAdmin(false);
      }
    };

    verifyAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoaded]);

  /* ----------------------------------------------------------
   * Derived
   * ---------------------------------------------------------- */
  const growth = useMemo(() => {
    const rate = Number(metrics?.growthRate || 0);
    return {
      rate,
      positive: rate >= 0,
      label: `${rate >= 0 ? '+' : ''}${rate}%`,
    };
  }, [metrics]);

  const buyRentTotal = useMemo(() => {
    return (metrics?.buyRentShare || []).reduce((sum, item) => sum + Number(item.count || 0), 0);
  }, [metrics]);

  const urgencyTotal = useMemo(() => {
    return Object.values(metrics?.urgencyCounts || {}).reduce(
      (sum, count) => sum + Number(count || 0),
      0
    );
  }, [metrics]);

  const monthlyMax = useMemo(() => {
    return Math.max(
      1,
      ...(metrics?.monthlyTrend || []).map((item) => Number(item.count || 0))
    );
  }, [metrics]);

  const budgetMax = useMemo(() => {
    const values = [
      ...(metrics?.rentBudgets || []).map((b) => Number(b.count || 0)),
      ...(metrics?.purchaseBudgets || []).map((b) => Number(b.count || 0)),
    ];
    return Math.max(1, ...values);
  }, [metrics]);

  /* ----------------------------------------------------------
   * Access states
   * ---------------------------------------------------------- */
  if (!isAdmin && !loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <ShieldX className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            Admin access only
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            You must be signed in as an admin to view market intelligence.
          </p>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------
   * Render
   * ---------------------------------------------------------- */
  return (
    <>
      <Head>
        <title>Market Intelligence — Admin</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Market Intelligence
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              What Jamaica is searching for
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Anonymous service request analytics for demand, parishes, budgets,
              bedroom mix, urgency, and emerging search signals.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start">
            {lastUpdated && (
              <span className="hidden text-xs text-slate-500 sm:inline">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={() => fetchMetrics({ silent: true })}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : !metrics ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              No market intelligence data available
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Metrics will appear as soon as service requests come in.
            </p>
          </div>
        ) : (
          <>
            {/* ============================================================
                Primary KPIs
                ============================================================ */}
            <section>
              <SectionLabel icon={BarChart3} label="Overview" />
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  icon={Users}
                  tone="accent"
                  label="Total requests"
                  value={(metrics.totalRequests ?? 0).toLocaleString()}
                />
                <StatCard
                  icon={Calendar}
                  tone="blue"
                  label="This month"
                  value={(metrics.requestsThisMonth ?? 0).toLocaleString()}
                  sub={metrics.currentMonthLabel || ''}
                />
                <StatCard
                  icon={DollarSign}
                  tone="emerald"
                  label="Average budget"
                  value={
                    metrics.averageBudget ? formatJMD(metrics.averageBudget) : '—'
                  }
                />
                <StatCard
                  icon={BedDouble}
                  tone="violet"
                  label="Avg. bedrooms"
                  value={
                    metrics.averageBedrooms != null
                      ? metrics.averageBedrooms
                      : '—'
                  }
                  trend={growth}
                />
              </div>
            </section>

            {/* ============================================================
                Demand signals
                ============================================================ */}
            <section>
              <SectionLabel icon={Zap} label="Demand signals" />
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <HighlightCard
                  icon={MapPin}
                  tone="accent"
                  label="Top parish"
                  value={metrics.mostRequestedParish || '—'}
                />
                <HighlightCard
                  icon={Building2}
                  tone="blue"
                  label="Top property type"
                  value={metrics.mostRequestedProperty || '—'}
                />
                <HighlightCard
                  icon={growth.positive ? TrendingUp : TrendingDown}
                  tone={growth.positive ? 'emerald' : 'red'}
                  label="Demand vs last month"
                  value={growth.label}
                  sub={metrics.currentMonthLabel || ''}
                />
              </div>
            </section>

            {/* ============================================================
                Buy / Rent + Urgency
                ============================================================ */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel
                title="Buy / Rent mix"
                subtitle={`${buyRentTotal} request${buyRentTotal === 1 ? '' : 's'}`}
              >
                {(metrics.buyRentShare || []).length === 0 ? (
                  <EmptyRow />
                ) : (
                  <div className="space-y-3">
                    {metrics.buyRentShare.map((item) => {
                      const percentage = Number(item.percentage || 0);
                      return (
                        <ProgressRow
                          key={item.type}
                          label={item.type}
                          value={`${item.count} · ${percentage.toFixed(0)}%`}
                          percent={percentage}
                          tone={
                            item.type === 'buy'
                              ? 'accent'
                              : item.type === 'rent'
                              ? 'blue'
                              : 'slate'
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </Panel>

              <Panel
                title="Urgency"
                subtitle={`${urgencyTotal} request${urgencyTotal === 1 ? '' : 's'}`}
              >
                {Object.keys(metrics.urgencyCounts || {}).length === 0 ? (
                  <EmptyRow />
                ) : (
                  <div className="space-y-3">
                    {Object.entries(metrics.urgencyCounts).map(
                      ([urgency, count]) => {
                        const percentage =
                          urgencyTotal > 0
                            ? (Number(count) / urgencyTotal) * 100
                            : 0;
                        return (
                          <ProgressRow
                            key={urgency}
                            label={urgency}
                            value={count}
                            percent={percentage}
                            tone={
                              urgency.toLowerCase() === 'urgent'
                                ? 'red'
                                : 'slate'
                            }
                          />
                        );
                      }
                    )}
                  </div>
                )}
              </Panel>
            </div>

            {/* ============================================================
                Parishes + Bedroom
                ============================================================ */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel
                title="Top parishes"
                subtitle={`${(metrics.parishDemand || []).length} total`}
              >
                {(metrics.parishDemand || []).length === 0 ? (
                  <EmptyRow />
                ) : (
                  <div className="space-y-2">
                    {(metrics.parishDemand || []).slice(0, 8).map((item, idx) => (
                      <RankRow
                        key={item.parish}
                        rank={idx + 1}
                        label={item.parish}
                        value={item.count}
                      />
                    ))}
                  </div>
                )}
              </Panel>

              <Panel
                title="Bedroom demand"
                subtitle={`${(metrics.bedroomDemand || []).length} tier${
                  (metrics.bedroomDemand || []).length === 1 ? '' : 's'
                }`}
              >
                {(metrics.bedroomDemand || []).length === 0 ? (
                  <EmptyRow />
                ) : (
                  <div className="space-y-2">
                    {metrics.bedroomDemand.map((item) => (
                      <RankRow
                        key={item.bedrooms}
                        label={item.bedrooms}
                        value={item.count}
                      />
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            {/* ============================================================
                Budgets
                ============================================================ */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel title="Rent budget ranges" subtitle="Monthly">
                {(metrics.rentBudgets || []).length === 0 ? (
                  <EmptyRow />
                ) : (
                  <div className="space-y-3">
                    {metrics.rentBudgets.map((item) => {
                      const percent =
                        budgetMax > 0 ? (Number(item.count) / budgetMax) * 100 : 0;
                      return (
                        <ProgressRow
                          key={item.label}
                          label={item.label}
                          value={item.count}
                          percent={percent}
                          tone="blue"
                        />
                      );
                    })}
                  </div>
                )}
              </Panel>

              <Panel title="Purchase budget ranges" subtitle="One-time">
                {(metrics.purchaseBudgets || []).length === 0 ? (
                  <EmptyRow />
                ) : (
                  <div className="space-y-3">
                    {metrics.purchaseBudgets.map((item) => {
                      const percent =
                        budgetMax > 0 ? (Number(item.count) / budgetMax) * 100 : 0;
                      return (
                        <ProgressRow
                          key={item.label}
                          label={item.label}
                          value={item.count}
                          percent={percent}
                          tone="violet"
                        />
                      );
                    })}
                  </div>
                )}
              </Panel>
            </div>

            {/* ============================================================
                Property type + Trending searches
                ============================================================ */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel
                title="Property type demand"
                subtitle={`${(metrics.propertyTypeDemand || []).length} categories`}
              >
                {(metrics.propertyTypeDemand || []).length === 0 ? (
                  <EmptyRow />
                ) : (
                  <div className="space-y-2">
                    {metrics.propertyTypeDemand.map((item, idx) => (
                      <RankRow
                        key={item.type}
                        rank={idx + 1}
                        label={item.type}
                        value={item.count}
                      />
                    ))}
                  </div>
                )}
              </Panel>

              <Panel
                title="Trending searches"
                subtitle={`${(metrics.trendingSearches || []).length} signals`}
              >
                {(metrics.trendingSearches || []).length === 0 ? (
                  <EmptyRow />
                ) : (
                  <div className="space-y-2">
                    {metrics.trendingSearches.map((item) => (
                      <div
                        key={item.phrase}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                          <Search size={12} className="shrink-0 text-slate-400" />
                          <span className="truncate">{item.phrase}</span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-slate-900">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            {/* ============================================================
                Monthly trend
                ============================================================ */}
            <Panel
              title="Last 12 months"
              subtitle={`${(metrics.monthlyTrend || []).length} months`}
            >
              {(metrics.monthlyTrend || []).length === 0 ? (
                <EmptyRow />
              ) : (
                <div className="space-y-2.5">
                  {metrics.monthlyTrend.map((item) => {
                    const percent =
                      monthlyMax > 0 ? (Number(item.count) / monthlyMax) * 100 : 0;
                    return (
                      <div key={item.month} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700">
                            {item.month}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {item.count}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-accent transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </>
  );
}

/* ============================================================
 * Sub-components
 * ============================================================ */

function SectionLabel({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500">
        <Icon size={12} />
      </span>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
    </div>
  );
}

function StatCard({ icon: Icon, tone = 'accent', label, value, sub, trend }) {
  const style = TONE_STYLES[tone] || TONE_STYLES.accent;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
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
      {sub ? <p className="mt-1 truncate text-xs text-slate-500">{sub}</p> : null}
      {trend ? (
        <p
          className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold ${
            trend.positive ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          {trend.positive ? (
            <TrendingUp size={11} />
          ) : (
            <TrendingDown size={11} />
          )}
          {trend.label}
        </p>
      ) : null}
    </div>
  );
}

function HighlightCard({ icon: Icon, tone = 'accent', label, value, sub }) {
  const style = TONE_STYLES[tone] || TONE_STYLES.accent;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.bg} ${style.text}`}
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-0.5 truncate text-base font-bold capitalize text-slate-900">
            {value}
          </p>
          {sub ? <p className="text-xs text-slate-500">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {subtitle ? (
          <span className="shrink-0 text-xs text-slate-500">{subtitle}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ProgressRow({ label, value, percent, tone = 'accent' }) {
  const toneClass = {
    accent: 'bg-accent',
    blue: 'bg-blue-500',
    violet: 'bg-violet-500',
    emerald: 'bg-emerald-500',
    red: 'bg-red-500',
    slate: 'bg-slate-500',
    amber: 'bg-amber-500',
  }[tone] || 'bg-accent';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate capitalize text-slate-700">{label}</span>
        <span className="shrink-0 font-semibold text-slate-900">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${toneClass}`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}

function RankRow({ rank, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      {rank ? (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-bold text-slate-500">
          {rank}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate text-sm capitalize text-slate-700">
        {label}
      </span>
      <span className="shrink-0 text-sm font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}

function EmptyRow() {
  return (
    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-6 text-center text-xs text-slate-500">
      No data yet
    </p>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
          />
        ))}
      </div>
    </div>
  );
}