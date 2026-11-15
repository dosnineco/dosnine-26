import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { formatJMD } from '@/lib/formatMoney';
import AdminAnalyticsPanel from '@/components/AdminAnalyticsPanel';

import {
  Users,
  FileText,
  Megaphone,
  Home,
  DollarSign,
  TrendingUp,
  Clock,
  XCircle,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Package,
  Briefcase,
  MapPin,
  Zap,
  Gift,
} from 'lucide-react';

/* -------------------- helpers -------------------- */

const formatNumber = (value) => Number(value || 0).toLocaleString();
const formatUSD = (amount) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(Number(amount) || 0);

const AD_PRICING = {
  '7-day': 11999,
  '14-day': 17999,
  '30-day': 52499,
  pro: 90999,
};

const LEGACY_FEATURED_PRICE = 14970;
const LEGACY_STANDARD_PRICE = 8970;

const getSubmissionRevenue = (sub) => {
  if (!sub) return 0;
  const submittedAmount = Number(sub.amount);
  if (Number.isFinite(submittedAmount) && submittedAmount > 0) return submittedAmount;
  const planId = sub.plan_id && String(sub.plan_id);
  if (planId && AD_PRICING[planId] != null) return AD_PRICING[planId];
  return sub.is_featured ? LEGACY_FEATURED_PRICE : LEGACY_STANDARD_PRICE;
};

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
    buyerPrequalifications: null,
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
      buyerPrequalificationsRes,
    ] = await Promise.all([
      safeFetch('/api/admin/requests'),
      safeFetch('/api/admin/agents/list?status=all'),
      safeFetch('/api/admin/agent-applications'),
      safeFetch('/api/admin/users'),
      safeFetch('/api/admin/properties'),
      safeFetch('/api/admin/market-intelligence'),
      safeFetch('/api/admin/htv-orders'),
      safeFetch('/api/admin/buyer-prequalifications?summary=true'),
    ]);

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
        .in('status', ['pending', 'pending_payment', 'pending_review']);
      adsPending = pendingCount || 0;

      const { data: approvedData } = await supabase
        .from('sponsor_submissions')
        .select('is_featured, plan_id, amount')
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
      buyerPrequalifications: buyerPrequalificationsRes,
      adsActive,
      adsPending,
      approvedSubmissions,
    });
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return undefined;

    loadAll();
    const refreshOnFocus = () => loadAll();
    const interval = setInterval(loadAll, 60000);
    window.addEventListener('focus', refreshOnFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [isAdmin, loadAll]);

  /* -------------------- derived metrics -------------------- */
  const metrics = useMemo(() => {
    const users = data.users?.users || [];
    const requests = data.requests?.requests || [];
    const agents = data.agents?.agents || [];
    const applications = data.applications?.applications || [];
    const properties = data.properties?.properties || [];
    const orders = data.htvOrders?.orders || [];

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
    const pendingAgentPayments = agents.filter(
      (a) => a.payment_receipt_status === 'pending'
    ).length;
    const pendingUserVerifications = users.filter(
      (u) => String(u.id_verification_status || '').toLowerCase() === 'pending'
    ).length;

    const agentRevenue = agents.reduce(
      (sum, a) => sum + (Number(a.payment_amount) || 0),
      0
    );

    const pendingApplications = applications.filter(
      (a) => a.status === 'pending'
    ).length;

    const activeProperties = properties.filter((p) => p.is_active !== false).length;

    let htvRevenue = 0;
    let htvExpenses = 0;
    let htvProfit = 0;
    const pendingHtvOrders = orders.filter(
      (order) => String(order.status || 'pending').toLowerCase() !== 'completed'
    ).length;
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

    return {
      users: {
        total: users.length,
        admins: users.filter((u) => u.role === 'admin').length,
        pendingVerification: pendingUserVerifications,
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
        pendingPayments: pendingAgentPayments,
        revenue: agentRevenue,
      },
      applications: {
        pending: pendingApplications,
      },
      buyerPrequalifications: {
        pending: data.buyerPrequalifications?.pendingReviewCount ?? null,
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
        pending: pendingHtvOrders,
        revenue: htvRevenue,
        expenses: htvExpenses,
        profit: htvProfit,
      },
      market: {
        totalRequests: data.market?.metrics?.totalRequests || 0,
        requestsThisMonth: data.market?.metrics?.requestsThisMonth || 0,
        averageBudget: data.market?.metrics?.averageBudget || 0,
        topParish: data.market?.metrics?.mostRequestedParish || '—',
        intelligence: data.market?.metrics || null,
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
          <XCircle className="mx-auto h-12 w-12 text-red-600" />
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
    Number(metrics.agents.revenue || 0) +
    Number(metrics.ads.revenue || 0) +
    Number(metrics.htv.revenue || 0);

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
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Other dashboard views</h2>
          <p className="mt-1 text-sm text-slate-600">View your own account in another dashboard layout.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard?adminView=regular"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-200"
            >
              Regular / tenant
            </Link>
            <Link
              href="/dashboard?adminView=advertiser"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-200"
            >
              Advertiser
            </Link>
            <Link
              href="/agent/dashboard?adminView=agent"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-200"
            >
              Agent (view only)
            </Link>
          </div>
        </section>

        <AdminAnalyticsPanel />

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
            href="/admin/users?tab=agents"
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            label="Agent Revenue"
            value={formatJMD(metrics.agents.revenue)}
            icon={DollarSign}
            tone="emerald"
            sub="Total from paid plans"
            href="/admin/users?tab=agents"
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
        </div>

        {/* Total platform revenue */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Total platform revenue
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {formatJMD(totalPlatformRevenue)}
              </p>
             
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Agent plans
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {formatJMD(metrics.agents.revenue)}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Ad plans
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {formatJMD(metrics.ads.revenue)}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  HTV orders
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {formatJMD(metrics.htv.revenue)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {metrics.market.intelligence?.monetization ? (
          <RevenueOpportunities
            monetization={metrics.market.intelligence.monetization}
            mostRequestedParish={metrics.market.intelligence.mostRequestedParish}
            mostRequestedProperty={metrics.market.intelligence.mostRequestedProperty}
            growthSignals={{
              requestsThisMonth: metrics.market.intelligence.requestsThisMonth,
              topParishRequests: metrics.market.intelligence.parishDemand?.[0]?.count || 0,
              verifiedBudgetCount: metrics.market.intelligence.verifiedBudgetCount,
              averageVerifiedBudget: metrics.market.intelligence.averageVerifiedBudget,
              urgentRequests: Number(metrics.market.intelligence.urgencyCounts?.high || 0)
                + Number(metrics.market.intelligence.urgencyCounts?.urgent || 0),
            }}
          />
        ) : null}

        <AdminAgentBrief metrics={metrics} />

        <section aria-labelledby="admin-action-items">
          <div className="mb-3">
            <h2 id="admin-action-items" className="text-lg font-semibold text-slate-900">
              Action needed
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              These counts stay visible until the related work is completed.
            </p>
            <Link href="/admin/giveaway" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90">
              <Gift className="h-4 w-4" aria-hidden="true" />
              Manage member giveaway
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ActionCard
              title="User ID verifications"
              count={metrics.users.pendingVerification}
              icon={Users}
              href="/admin/users"
              tone="amber"
              description="Review submitted identity documents"
              loading={loading}
            />
            <ActionCard
              title="Buyer prequalifications"
              count={metrics.buyerPrequalifications.pending}
              icon={ShieldCheck}
              href="/admin/buyer-prequalifications"
              tone="blue"
              description="Review buyer documents and financial readiness"
              loading={loading}
              unavailable={!data.buyerPrequalifications}
            />
            <ActionCard
              title="Agent verification reviews"
              count={metrics.agents.pending}
              icon={Briefcase}
              href="/admin/users?tab=agents"
              tone="amber"
              description="Review agent applications and documents"
              loading={loading}
            />
            <ActionCard
              title="Agent payment receipts"
              count={metrics.agents.pendingPayments}
              icon={DollarSign}
              href="/admin/users?tab=agents"
              tone="blue"
              description="Confirm submitted agent payments"
              loading={loading}
            />
            <ActionCard
              title="Client requests to assign"
              count={metrics.requests.open}
              icon={FileText}
              href="/admin/requests"
              tone="amber"
              description="Open requests waiting for an agent"
              loading={loading}
            />
            <ActionCard
              title="Agent request applications"
              count={metrics.applications.pending}
              icon={AlertCircle}
              href="/admin/agent-applications"
              tone="blue"
              description="Review applications to client requests"
              loading={loading}
            />
            <ActionCard
              title="HTV orders in progress"
              count={metrics.htv.pending}
              icon={Package}
              href="/admin/htv"
              tone="violet"
              description="Orders not yet marked completed"
              loading={loading}
            />
            <ActionCard
              title="Ad and sponsor submissions"
              count={metrics.ads.pending}
              icon={Megaphone}
              href="/admin/advertisements"
              tone="violet"
              description="Pending review, payment, or approval"
              loading={loading}
            />
          </div>
        </section>

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
  slate: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

/* -------------------- sub-components -------------------- */

function KpiCard({ label, value, icon: Icon, tone = 'accent', sub, href }) {
  const style = TONE_STYLES[tone] || TONE_STYLES.accent;
  const card = (
    <div className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.bg} ${style.text}`}
          >
            <Icon size={16} />
          </span>
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
        </div>
        {href ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition group-hover:bg-slate-50 group-hover:text-accent">
            <ArrowRight size={14} />
          </span>
        ) : null}
      </div>
      <p className="mt-3 break-words text-2xl font-bold leading-tight tracking-tight text-slate-900">
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs leading-4 text-slate-600">{sub}</p> : null}
    </div>
  );
  return href ? (
    <Link
      href={href}
      className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      {card}
    </Link>
  ) : card;
}

function ActionCard({
  title,
  count,
  icon: Icon,
  href,
  tone = 'amber',
  description,
  loading = false,
  unavailable = false,
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
            loading || unavailable
              ? 'text-slate-400'
              : hasItems
                ? 'text-slate-900'
                : 'text-emerald-600'
          }`}
        >
          {loading || unavailable ? '—' : count}
        </p>
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
            loading || unavailable ? 'text-slate-400' : hasItems ? 'text-amber-700' : 'text-emerald-700'
          } transition group-hover:text-accent`}
        >
          {loading
            ? 'Loading'
            : unavailable
              ? 'Unable to load'
              : hasItems
                ? 'Needs attention'
                : 'All clear'}
          {!loading && !unavailable && hasItems ? <ArrowRight size={11} /> : null}
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

function RevenueOpportunities({
  monetization,
  mostRequestedParish,
  mostRequestedProperty,
  growthSignals,
}) {
  const current = monetization.currentMonth || {};
  const previous = monetization.previousMonth || {};
  const opportunity = monetization.opportunities || {};
  const currentJmd = current.jmd || {};
  const previousJmd = previous.jmd || {};
  const currentUsd = current.usd || {};
  const previousUsd = previous.usd || {};
  const revenueRows = [
    { label: 'Agent plans', current: currentJmd.agentPlans, previous: previousJmd.agentPlans },
    { label: 'Sponsor advertising', current: currentJmd.sponsorships, previous: previousJmd.sponsorships },
    { label: 'HTV completed orders', current: currentJmd.htvRevenue, previous: previousJmd.htvRevenue },
    { label: 'Paid property searches', current: currentJmd.propertySearches, previous: previousJmd.propertySearches },
  ];
  const usdRows = [
    { label: 'Paid property searches', current: currentUsd.propertySearches, previous: previousUsd.propertySearches },
    { label: 'Priority upgrades', current: currentUsd.urgencyBoosts, previous: previousUsd.urgencyBoosts },
  ];
  const potentialAgentRevenue = Number(opportunity.eligibleAgentRevenueCeiling || 0);
  const monthlyAgentPrice = Number(opportunity.monthlyAgentPrice || 0);
  const monthlyAdPrice = Number(opportunity.monthlyAdPrice || 0);
  const potentialAdRevenue = Number(opportunity.remainingSponsorSlots || 0) * monthlyAdPrice;
  const urgencyPrices = opportunity.urgencyPrices || {};
  const adImpressions = Number(opportunity.advertisementImpressions || 0);
  const adClicks = Number(opportunity.advertisementClicks || 0);
  const adClickRate = adImpressions > 0
    ? `${((adClicks / adImpressions) * 100).toFixed(1)}%`
    : 'Not enough impression data';
  const hasAgentOpportunity = Number(opportunity.eligibleAgents || 0) > 0;
  const hasSponsorOpportunity = Number(opportunity.remainingSponsorSlots || 0) > 0;

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
          Revenue & ways to grow it
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
          Money this month
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Confirmed payments for {monetization.monthLabel}. Compared with the same elapsed
          period last month; USD is kept separate from JMD.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <RevenueSummaryCard
          label="JMD revenue received"
          value={formatJMD(currentJmd.totalRevenue)}
          sub={`Previous period: ${formatJMD(previousJmd.totalRevenue)}`}
        />
        <RevenueSummaryCard
          label="HTV estimated profit"
          value={formatJMD(currentJmd.htvProfit)}
          sub={`After recorded HTV expenses: ${formatJMD(currentJmd.htvExpenses)}`}
        />
        <RevenueSummaryCard
          label="USD add-on revenue"
          value={formatUSD(currentUsd.totalRevenue)}
          sub={`Previous period: ${formatUSD(previousUsd.totalRevenue)}`}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-4">
          <h3 className="text-sm font-bold text-slate-900">Confirmed JMD sales</h3>
          <div className="mt-3 space-y-2">
            {revenueRows.map((row) => (
              <RevenueComparisonRow
                key={row.label}
                label={row.label}
                current={row.current}
                previous={row.previous}
                format={formatJMD}
              />
            ))}
            <RevenueComparisonRow
              label="Total"
              current={currentJmd.totalRevenue}
              previous={previousJmd.totalRevenue}
              format={formatJMD}
              emphasized
            />
          </div>
        </div>
        <div className="rounded-xl bg-white p-4">
          <h3 className="text-sm font-bold text-slate-900">Confirmed USD sales</h3>
          <div className="mt-3 space-y-2">
            {usdRows.map((row) => (
              <RevenueComparisonRow
                key={row.label}
                label={row.label}
                current={row.current}
                previous={row.previous}
                format={formatUSD}
              />
            ))}
            <RevenueComparisonRow
              label="Total"
              current={currentUsd.totalRevenue}
              previous={previousUsd.totalRevenue}
              format={formatUSD}
              emphasized
            />
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-white p-4">
        <h3 className="text-sm font-bold text-slate-900">Monthly sales opportunities</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <OpportunityCard
            title="Agent plans"
            detail={`${Number(opportunity.eligibleAgents || 0)} approved agents have free or expired plans.`}
            value={monthlyAgentPrice > 0
              ? `${formatJMD(monthlyAgentPrice)} per 30 days`
              : 'Plan price unavailable'}
            estimate={potentialAgentRevenue > 0
              ? `Up to ${formatJMD(potentialAgentRevenue)} if all convert`
              : null}
          />
          <OpportunityCard
            title="Sponsor advertising"
            detail={`${Number(opportunity.unpaidSponsors || 0)} unpaid sponsor submissions; ${Number(opportunity.remainingSponsorSlots || 0)} of ${Number(opportunity.sponsorCapacity || 40)} monthly slots remain. ${Number(opportunity.activeAdvertisements || 0)} active ads have ${Number(opportunity.advertisementImpressions || 0).toLocaleString()} impressions and ${Number(opportunity.advertisementClicks || 0).toLocaleString()} clicks.`}
            value={monthlyAdPrice > 0
              ? `${formatJMD(monthlyAdPrice)} per 30 days`
              : '30-day plan price unavailable'}
            estimate={potentialAdRevenue > 0
              ? `Up to ${formatJMD(potentialAdRevenue)} at that plan price`
              : null}
          />
          <OpportunityCard
            title="Sell where demand is"
            detail={`${Number(growthSignals.topParishRequests || 0).toLocaleString()} requests come from the top parish; ${Number(growthSignals.verifiedBudgetCount || 0).toLocaleString()} buyers have verified budgets.`}
            value={`Prioritize ${mostRequestedProperty || 'property'} in ${mostRequestedParish || 'your top parish'}`}
            estimate={Number(growthSignals.averageVerifiedBudget || 0) > 0
              ? `Average verified budget: ${formatJMD(growthSignals.averageVerifiedBudget)}`
              : 'Use the budget ranges below to guide inventory and ad packages.'}
          />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Add-ons currently priced at JMD {Number(opportunity.paidSearchJmdPrice || 0).toLocaleString()}
          {' '}or USD {Number(opportunity.paidSearchUsdPrice || 0).toFixed(2)} for a paid property search.
          {' '}Priority upgrades: high {formatUSD(urgencyPrices.high)} · urgent {formatUSD(urgencyPrices.urgent)}.
        </p>
      </div>

      <div className="mt-5 rounded-xl bg-white p-4">
        <h3 className="text-sm font-bold text-slate-900">Growth actions from these signals</h3>
        <p className="mt-1 text-xs text-slate-500">
          {Number(growthSignals.requestsThisMonth || 0).toLocaleString()} requests have come in this month.
          {' '}Use these steps to turn current demand into paid conversions.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <GrowthAction
            number="1"
            title="Convert eligible agents"
            detail={hasAgentOpportunity
              ? `${Number(opportunity.eligibleAgents).toLocaleString()} approved agents could generate up to ${formatJMD(potentialAgentRevenue)} per 30 days. Contact them with the current plan offer.`
              : 'Review plan renewals and keep approved agents active with a clear monthly value proposition.'}
            href="/admin/users?tab=agents"
            linkLabel="Manage agents"
          />
          <GrowthAction
            number="2"
            title="Close sponsor leads"
            detail={Number(opportunity.unpaidSponsors) > 0
              ? `Follow up with ${Number(opportunity.unpaidSponsors).toLocaleString()} unpaid sponsor submissions; ${Number(opportunity.remainingSponsorSlots).toLocaleString()} monthly slots remain.`
              : hasSponsorOpportunity
                ? `Pitch local advertisers while ${Number(opportunity.remainingSponsorSlots).toLocaleString()} of ${Number(opportunity.sponsorCapacity || 40).toLocaleString()} monthly slots remain. Active ad click-through rate: ${adClickRate}.`
                : 'Review ad performance and prepare next month’s advertiser renewals.'}
            href="/admin/advertisements"
            linkLabel="Review advertising"
          />
          <GrowthAction
            number="3"
            title="Monetize buyer demand"
            detail={`${Number(growthSignals.urgentRequests || 0).toLocaleString()} requests are marked high or urgent. Promote paid search and priority upgrades where they clearly improve buyer results.`}
            href="/admin/market-intelligence"
            linkLabel="Review demand signals"
          />
        </div>
      </div>

      {monetization.unavailableSources?.length ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Some revenue data is unavailable because its database table or column is missing:
          {' '}{monetization.unavailableSources.join(', ')}. Apply the related migration to include it.
        </p>
      ) : null}
      <p className="mt-3 text-xs text-slate-500">
        Opportunity amounts are maximum scenarios, not forecasts. Only recorded paid sales are
        counted as revenue. Unpaid leads, investor interest, and buyer property budgets are not
        income; extra-listing counters lack transaction dates and prices, so they cannot be
        included in monthly revenue.
      </p>
    </section>
  );
}

function AdminAgentBrief({ metrics }) {
  const [sending, setSending] = useState(false);
  const [digestMessage, setDigestMessage] = useState('');
  const market = metrics.market.intelligence;
  const monetization = market?.monetization;
  const opportunities = monetization?.opportunities || {};

  const sendDigest = async () => {
    setSending(true);
    setDigestMessage('');
    try {
      const response = await fetch('/api/admin/operations-digest', {
        method: 'POST',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to send the operations brief.');
      }
      setDigestMessage('Operations brief sent to the configured admin email.');
    } catch (error) {
      console.error('Failed to send operations brief:', error);
      setDigestMessage(error.message || 'Unable to send the operations brief.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
          <Zap size={18} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
            Administrative agent
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            Daily operations brief and review queue
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            An 8:00 AM Jamaica-time email summarizes outstanding work and compares the last 7
            days with the previous week. Payment verification and customer follow-ups remain
            admin-approved.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={sendDigest}
          disabled={sending}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? 'Sending brief…' : 'Send brief now'}
        </button>
        {digestMessage ? (
          <p role="status" className="text-sm text-slate-600">{digestMessage}</p>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AgentWorkflowCard
          title="Verify payments"
          detail={`${formatNumber(metrics.agents.pendingPayments)} agent receipts await review.`}
          action="Review receipts"
          href="/admin/users?tab=agents"
        />
        <AgentWorkflowCard
          title="Process requests"
          detail={`${formatNumber(metrics.requests.open)} requests and ${formatNumber(metrics.applications.pending)} agent applications need attention.`}
          action="Open request queue"
          href="/admin/requests"
        />
        <AgentWorkflowCard
          title="Follow up on leads"
          detail={`${formatNumber(opportunities.unpaidSponsors || 0)} sponsor leads and ${formatNumber(opportunities.eligibleAgents || 0)} agents may need follow-up. Messages are not sent automatically.`}
          action="Review sponsor leads"
          href="/admin/advertisements"
          secondaryAction="Review agents"
          secondaryHref="/admin/users?tab=agents"
        />
        <AgentWorkflowCard
          title="Analyze the market"
          detail={market
            ? `${formatNumber(market.requestsThisMonth)} requests this month; top parish: ${market.mostRequestedParish || '—'}.`
            : 'Market demand and budget signals are loading or unavailable.'}
          action="View market signals"
          href="/admin/market-intelligence"
        />
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Scheduled email requires Vercel Cron, CRON_SECRET, BREVO_API_KEY, and ADMIN_NOTIFICATION_EMAIL
        (or ADMIN_EMAIL). OpenAI analysis, WhatsApp/n8n messaging, and automatic payment confirmation
        are not enabled.
      </p>
    </section>
  );
}

function AgentWorkflowCard({
  title,
  detail,
  action,
  href,
  secondaryAction,
  secondaryHref,
}) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 min-h-10 text-xs leading-5 text-slate-600">{detail}</p>
      <Link
        href={href}
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
      >
        {action}
        <span aria-hidden="true">→</span>
      </Link>
      {secondaryAction && secondaryHref ? (
        <Link
          href={secondaryHref}
          className="ml-4 mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
        >
          {secondaryAction}
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}

function RevenueSummaryCard({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function RevenueComparisonRow({ label, current, previous, format, emphasized = false }) {
  return (
    <div className={`flex items-center justify-between gap-3 text-sm ${emphasized ? 'border-t border-slate-200 pt-2 font-bold' : ''}`}>
      <span className="text-slate-600">{label}</span>
      <span className="shrink-0 text-right">
        <span className="font-semibold text-slate-900">{format(current)}</span>
        <span className="ml-2 text-xs text-slate-500">vs {format(previous)}</span>
      </span>
    </div>
  );
}

function OpportunityCard({ title, detail, value, estimate }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{detail}</p>
      {estimate ? <p className="mt-2 text-xs font-medium text-emerald-700">{estimate}</p> : null}
    </div>
  );
}

function GrowthAction({ number, title, detail, href, linkLabel }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
        {number}. {title}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p>
      <Link
        href={href}
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
      >
        {linkLabel}
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}