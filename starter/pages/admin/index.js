import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { formatJMD } from '@/lib/formatMoney';
import {
  Users,
  FileText,
  Building2,
  Megaphone,
  Home,
  DollarSign,
  TrendingUp,
  Clock,
  XCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Mail,
  Package,
  Briefcase,
  MapPin,
} from 'lucide-react';

/* -------------------- helpers -------------------- */

const formatNumber = (value) => Number(value || 0).toLocaleString();

/**
 * Pricing for sponsor submission plans (JMD).
 * Matches the current Advertise page plans; falls back to the legacy
 * featured/standard rates if plan_id isn't present.
 */
const AD_PRICING = {
  '7-day': 11999,
  '14-day': 17999,
  '30-day': 52499,
};

const LEGACY_FEATURED_PRICE = 14970;
const LEGACY_STANDARD_PRICE = 8970;

const getSubmissionRevenue = (sub) => {
  if (!sub) return 0;
  const planId = sub.plan_id && String(sub.plan_id);
  if (planId && AD_PRICING[planId] != null) return AD_PRICING[planId];
  return sub.is_featured ? LEGACY_FEATURED_PRICE : LEGACY_STANDARD_PRICE;
};

/**
 * Fetch JSON safely — never throws. Returns null on any failure
 * so one broken endpoint can't take down the whole dashboard.
 */
const safeFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, { credentials: 'include', ...options });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) return null;
    return payload;
  } catch {
    return null;
  }
};

/* -------------------- main component -------------------- */

export default function AdminDashboardIndex() {
  const { user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [data, setData] = useState({
    requests: null,
    agents: null,
    applications: null,
    users: null,
    properties: null,
    market: null,
    htvOrders: null,
    investors: null,
    newsletter: null,
    adsActive: 0,
    adsPending: 0,
    approvedSubmissions: [],
  });

  /* -------------------- admin gate -------------------- */
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setAuthChecked(true);
      return;
    }
    const verify = async () => {
      const payload = await safeFetch('/api/admin/verify-admin');
      if (payload?.isAdmin) setIsAdmin(true);
      setAuthChecked(true);
    };
    verify();
  }, [user, isLoaded]);

  /* -------------------- fetch everything in parallel -------------------- */
  const loadAll = useCallback(async () => {
    setLoading(true);

    const [
      requestsRes,
      agentsRes,
      applicationsRes,
      usersRes,
      propertiesRes,
      marketRes,
      htvOrdersRes,
      investorsRes,
      newsletterRes,
    ] = await Promise.all([
      safeFetch('/api/admin/requests'),
      safeFetch('/api/admin/agents/list?status=all'),
      safeFetch('/api/admin/agent-applications'),
      safeFetch('/api/admin/users'),
      safeFetch('/api/admin/properties'),
      safeFetch('/api/admin/market-intelligence'),
      safeFetch('/api/admin/htv-orders'),
      safeFetch('/api/admin/hill-lot-investors'),
      safeFetch('/api/newsletter/summary'),
    ]);

    // Advertisements + sponsor submissions live in Supabase.
    // We fetch only aggregate data: counts and the fields needed to compute revenue.
    let adsActive = 0;
    let adsPending = 0;
    let approvedSubmissions = [];
    try {
      const { count: activeCount } = await supabase
        .from('advertisements')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      adsActive = activeCount || 0;

      const { count: pendingCount } = await supabase
        .from('sponsor_submissions')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'pending_payment']);
      adsPending = pendingCount || 0;

      // Fetch only the fields we need for revenue computation.
      const { data: approvedData } = await supabase
        .from('sponsor_submissions')
        .select('is_featured, plan_id')
        .eq('status', 'approved');
      approvedSubmissions = approvedData || [];
    } catch {
      /* silent — dashboard still works without ads */
    }

    setData({
      requests: requestsRes,
      agents: agentsRes,
      applications: applicationsRes,
      users: usersRes,
      properties: propertiesRes,
      market: marketRes,
      htvOrders: htvOrdersRes,
      investors: investorsRes,
      newsletter: newsletterRes,
      adsActive,
      adsPending,
      approvedSubmissions,
    });
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin, loadAll]);

  /* -------------------- derived metrics -------------------- */
  const metrics = useMemo(() => {
    const users = data.users?.users || [];
    const requests = data.requests?.requests || [];
    const agents = data.agents?.agents || [];
    const applications = data.applications?.applications || [];
    const properties = data.properties?.properties || [];
    const orders = data.htvOrders?.orders || [];
    const investors = data.investors?.items || [];
    const newsletter = data.newsletter || {};

    const openRequests = requests.filter((r) => r.status === 'open').length;
    const assignedRequests = requests.filter(
      (r) => r.status === 'assigned' || r.status === 'in_progress'
    ).length;
    const completedRequests = requests.filter((r) => r.status === 'completed').length;

    const approvedAgents = agents.filter(
      (a) => a.verification_status === 'approved'
    ).length;
    const pendingAgents = agents.filter(
      (a) => a.verification_status === 'pending'
    ).length;

    const agentRevenue = agents.reduce(
      (sum, a) => sum + (Number(a.payment_amount) || 0),
      0
    );

    const pendingApplications = applications.filter(
      (a) => a.status === 'pending'
    ).length;

    const activeProperties = properties.filter((p) => p.is_active !== false).length;

    // HTV: revenue / expenses / profit from completed orders only.
    let htvRevenue = 0;
    let htvExpenses = 0;
    let htvProfit = 0;
    orders
      .filter((o) => o.status === 'completed')
      .forEach((o) => {
        const rev = Number(o.revenue || o.total || 0);
        const exp = Number(
          o.expenses ||
            Number(o.raw_material_cost || 0) +
              Number(o.labor_cost || 0) +
              Number(o.other_expenses || 0)
        );
        htvRevenue += rev;
        htvExpenses += exp;
        htvProfit += rev - exp;
      });

    const investorCapital = investors.reduce(
      (sum, i) => sum + Number(i.amount_value || 0),
      0
    );

    return {
      users: {
        total: users.length,
        admins: users.filter((u) => u.role === 'admin').length,
        paid: users.filter(
          (u) =>
            u.premium_service_request &&
            u.premium_service_request_expires &&
            new Date(u.premium_service_request_expires) > new Date()
        ).length,
      },
      requests: {
        total: requests.length,
        open: openRequests,
        assigned: assignedRequests,
        completed: completedRequests,
      },
      agents: {
        total: agents.length,
        approved: approvedAgents,
        pending: pendingAgents,
        revenue: agentRevenue,
      },
      applications: {
        pending: pendingApplications,
      },
      properties: {
        total: properties.length,
        active: activeProperties,
      },
      ads: {
        active: data.adsActive,
        pending: data.adsPending,
        approved: (data.approvedSubmissions || []).length,
        revenue: (data.approvedSubmissions || []).reduce(
          (sum, sub) => sum + getSubmissionRevenue(sub),
          0
        ),
      },
      htv: {
        revenue: htvRevenue,
        expenses: htvExpenses,
        profit: htvProfit,
      },
      investors: {
        total: investors.length,
        capital: investorCapital,
      },
      newsletter: {
        reach:
          Number(newsletter.visitorCount || 0) + Number(newsletter.optedInCount || 0),
        optedIn: Number(newsletter.optedInCount || 0),
      },
      market: {
        totalRequests: data.market?.metrics?.totalRequests || 0,
        requestsThisMonth: data.market?.metrics?.requestsThisMonth || 0,
        averageBudget: data.market?.metrics?.averageBudget || 0,
        topParish: data.market?.metrics?.mostRequestedParish || '—',
      },
    };
  }, [data]);

  /* -------------------- loading / access states -------------------- */
  if (!isLoaded || !authChecked) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-accent" />
          <p className="mt-4 text-sm text-slate-600">Checking access…</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            Access denied
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Admin access is required to view this dashboard.
          </p>
        </div>
      </div>
    );
  }

  const totalPlatformRevenue =
    Number(metrics.agents.revenue || 0) + Number(metrics.ads.revenue || 0);

  /* -------------------- render -------------------- */
  return (
    <>
      <Head>
        <title>Dashboard — Dosnine Admin</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Overview
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Dosnine Limited
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              A single view of users, requests, agents, revenue, and market signals.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-slate-500">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={loadAll}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Primary KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Users"
            value={formatNumber(metrics.users.total)}
            icon={Users}
            tone="accent"
            sub={`${metrics.users.paid} paid · ${metrics.users.admins} admins`}
            href="/admin/users"
          />
          <KpiCard
            label="Service Requests"
            value={formatNumber(metrics.requests.total)}
            icon={FileText}
            tone="blue"
            sub={`${metrics.requests.open} open · ${metrics.requests.assigned} assigned`}
            href="/admin/requests"
          />
          <KpiCard
            label="Agents"
            value={formatNumber(metrics.agents.total)}
            icon={Briefcase}
            tone="emerald"
            sub={`${metrics.agents.approved} approved · ${metrics.agents.pending} pending`}
            href="/admin/agents"
          />
          <KpiCard
            label="Properties"
            value={formatNumber(metrics.properties.total)}
            icon={Home}
            tone="violet"
            sub={`${metrics.properties.active} active`}
            href="/admin/properties"
          />
        </div>

        {/* Money & Reach KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Agent Revenue"
            value={formatJMD(metrics.agents.revenue)}
            icon={DollarSign}
            tone="emerald"
            sub="Total from paid plans"
            href="/admin/agents"
          />
          <KpiCard
            label="Ad Revenue"
            value={formatJMD(metrics.ads.revenue)}
            icon={Megaphone}
            tone="accent"
            sub={`${metrics.ads.approved} approved · ${metrics.ads.pending} pending`}
            href="/admin/advertisements"
          />
          <KpiCard
            label="HTV Profit"
            value={formatJMD(metrics.htv.profit)}
            icon={TrendingUp}
            tone={metrics.htv.profit >= 0 ? 'emerald' : 'red'}
            sub={`${formatJMD(metrics.htv.revenue)} revenue · ${formatJMD(metrics.htv.expenses)} exp.`}
            href="/admin/htv"
          />
          <KpiCard
            label="Hill Lot Capital"
            value={`USD ${formatNumber(metrics.investors.capital)}`}
            icon={Building2}
            tone="violet"
            sub={`${metrics.investors.total} investors`}
            href="/admin/hill-lot-investors"
          />
          <KpiCard
            label="Newsletter Reach"
            value={formatNumber(metrics.newsletter.reach)}
            icon={Mail}
            tone="accent"
            sub={`${metrics.newsletter.optedIn} opted-in`}
            href="/admin/newsletter"
          />
        </div>

        {/* Total platform revenue */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Total platform revenue
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {formatJMD(totalPlatformRevenue)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Agent subscriptions + approved ad plans.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Agent plans
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {formatJMD(metrics.agents.revenue)}
                </p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Ad plans
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {formatJMD(metrics.ads.revenue)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action needed */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ActionCard
            title="Pending agents"
            count={metrics.agents.pending}
            icon={Clock}
            href="/admin/agents"
            tone="amber"
            description="Awaiting document review"
          />
          <ActionCard
            title="Pending applications"
            count={metrics.applications.pending}
            icon={AlertCircle}
            href="/admin/agent-applications"
            tone="blue"
            description="Request applications to review"
          />
          <ActionCard
            title="Pending ad submissions"
            count={metrics.ads.pending}
            icon={Megaphone}
            href="/admin/advertisements"
            tone="violet"
            description="Awaiting approval or payment"
          />
        </div>

        {/* Ads + market intelligence */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <KpiCard
            label="Active Advertisements"
            value={formatNumber(metrics.ads.active)}
            icon={Megaphone}
            tone="accent"
            sub="Currently displayed"
            href="/admin/advertisements"
          />
          <KpiCard
            label="Top Parish"
            value={metrics.market.topParish}
            icon={MapPin}
            tone="blue"
            sub={`${formatNumber(metrics.market.totalRequests)} total requests`}
            href="/admin/market-intelligence"
          />
          <KpiCard
            label="Average Budget"
            value={formatJMD(metrics.market.averageBudget)}
            icon={DollarSign}
            tone="emerald"
            sub={`${formatNumber(metrics.market.requestsThisMonth)} this month`}
            href="/admin/market-intelligence"
          />
        </div>

        {/* Request breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Request status breakdown
            </h2>
            <Link
              href="/admin/requests"
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent/80"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatusPill label="Total" value={metrics.requests.total} tone="slate" />
            <StatusPill label="Open" value={metrics.requests.open} tone="amber" />
            <StatusPill label="Assigned" value={metrics.requests.assigned} tone="blue" />
            <StatusPill label="Completed" value={metrics.requests.completed} tone="emerald" />
          </div>
        </div>

        {/* Quick links */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Quick links
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {[
              { href: '/admin/requests', label: 'Requests', icon: FileText },
              { href: '/admin/requests-management', label: 'Manage Requests', icon: FileText },
              { href: '/admin/agent-applications', label: 'Applications', icon: AlertCircle },
              { href: '/admin/agents', label: 'Agents', icon: Briefcase },
              { href: '/admin/advertisements', label: 'Advertisements', icon: Megaphone },
              { href: '/admin/newsletter', label: 'Newsletter', icon: Mail },
              { href: '/admin/market-intelligence', label: 'Market Intel', icon: TrendingUp },
              { href: '/admin/allocation', label: 'Allocation', icon: Users },
              { href: '/admin/hill-lot-investors', label: 'Investors', icon: Building2 },
              { href: '/admin/htv', label: 'HTV Orders', icon: Package },
              { href: '/admin/users', label: 'Users', icon: Users },
              { href: '/admin/properties', label: 'Properties', icon: Home },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-accent hover:bg-white hover:text-accent"
              >
                <Icon
                  size={16}
                  className="shrink-0 text-slate-400 transition group-hover:text-accent"
                />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* -------------------- styles -------------------- */

const TONE_STYLES = {
  accent: { bg: 'bg-accent/10', text: 'text-accent' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  red: { bg: 'bg-red-50', text: 'text-red-600' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-700' },
};

/* -------------------- sub-components -------------------- */

function KpiCard({ label, value, icon: Icon, tone = 'accent', sub, href }) {
  const style = TONE_STYLES[tone] || TONE_STYLES.accent;
  const card = (
    <div className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300">
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
      <p className="mt-3 truncate text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
      {href ? (
        <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition group-hover:text-accent">
          View <ArrowRight size={11} />
        </span>
      ) : null}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function ActionCard({
  title,
  count,
  icon: Icon,
  href,
  tone = 'amber',
  description,
}) {
  const style = TONE_STYLES[tone] || TONE_STYLES.amber;
  const hasItems = count > 0;
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-2xl border p-5 transition ${
        hasItems
          ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.bg} ${style.text}`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{description}</p>
      </div>
      <div className="text-right">
        <p
          className={`text-2xl font-bold ${
            hasItems ? 'text-slate-900' : 'text-slate-400'
          }`}
        >
          {count}
        </p>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition group-hover:text-accent">
          Review <ArrowRight size={11} />
        </span>
      </div>
    </Link>
  );
}

function StatusPill({ label, value, tone = 'slate' }) {
  const style = TONE_STYLES[tone] || TONE_STYLES.slate;
  return (
    <div className={`rounded-xl ${style.bg} p-4`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${style.text}`}>{value}</p>
    </div>
  );
}