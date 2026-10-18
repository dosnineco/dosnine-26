import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import {
  FiGrid,
  FiUsers,
  FiZap,
  FiTrendingUp,
  FiPackage,
  FiMail,
  FiDollarSign,
  FiMenu,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiHome,
  FiExternalLink,
  FiUser,
} from 'react-icons/fi';

const SIDEBAR_STATE_KEY = 'admin-sidebar-collapsed';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const path = router.pathname;

  const [counts, setCounts] = useState({
    requests: 0,
    applications: 0,
    advertisements: 0,
    users: 0,
    agents: 0,
    htv: 0,
    buyerPrequalifications: 0,
  });

  // Desktop: collapsed = icon-only rail. Mobile: whether drawer is open.
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* -------------------- Persist desktop collapse -------------------- */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(SIDEBAR_STATE_KEY);
    if (saved === '1') setCollapsed(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  /* -------------------- Close mobile drawer on route change -------------------- */
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  /* -------------------- Lock body scroll while drawer is open -------------------- */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  /* -------------------- Close drawer with ESC -------------------- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* -------------------- Fetch unresolved-work badge counts -------------------- */
  const fetchCounts = useCallback(async () => {
    try {
      const [requestsRes, applicationsRes, advertisementsRes, accountsRes, agentsRes, htvRes, buyerPrequalificationsRes] =
        await Promise.all([
          fetch('/api/admin/requests', { credentials: 'include' }),
          fetch('/api/admin/agent-applications', { credentials: 'include' }),
          fetch('/api/admin/advertisements', { credentials: 'include' }),
          fetch('/api/admin/users', { credentials: 'include' }),
          fetch('/api/admin/agents/notifications?pending=true', { credentials: 'include' }),
          fetch('/api/admin/htv-orders', { credentials: 'include' }),
          fetch('/api/admin/buyer-prequalifications?summary=true', { credentials: 'include' }),
        ]);

      const [requestsPayload, applicationsPayload, advertisementsPayload, accountsPayload, agentsPayload, htvPayload, buyerPrequalificationsPayload] =
        await Promise.all([
            requestsRes.json().catch(() => null),
            applicationsRes.json().catch(() => null),
            advertisementsRes.json().catch(() => null),
            accountsRes.json().catch(() => null),
            agentsRes.json().catch(() => null),
            htvRes.json().catch(() => null),
            buyerPrequalificationsRes.json().catch(() => null),
          ]);

      setCounts((current) => ({
        requests: requestsRes.ok && Array.isArray(requestsPayload?.requests)
          ? requestsPayload.requests.filter((item) => item?.status === 'open').length
          : current.requests,
        applications: applicationsRes.ok && Array.isArray(applicationsPayload?.applications)
          ? applicationsPayload.applications.filter(
              (item) => String(item?.status || '').toLowerCase() === 'pending'
            ).length
          : current.applications,
        advertisements: advertisementsRes.ok && Array.isArray(advertisementsPayload?.submissions)
          ? advertisementsPayload.submissions.filter((item) =>
              ['pending', 'pending_payment', 'pending_review'].includes(
                String(item?.status || '').trim().toLowerCase()
              )
            ).length
          : current.advertisements,
        users: accountsRes.ok && Array.isArray(accountsPayload?.users)
          ? accountsPayload.users.filter(
              (item) => String(item?.id_verification_status || '').toLowerCase() === 'pending'
            ).length
          : current.users,
        agents: agentsRes.ok && agentsPayload?.success
          ? Number(agentsPayload.count) || 0
          : current.agents,
        htv: htvRes.ok && Array.isArray(htvPayload?.orders)
          ? htvPayload.orders.filter(
              (item) => String(item?.status || 'pending').toLowerCase() !== 'completed'
            ).length
          : current.htv,
        buyerPrequalifications: buyerPrequalificationsRes.ok && buyerPrequalificationsPayload?.success
          ? Number(buyerPrequalificationsPayload.pendingReviewCount) || 0
          : current.buyerPrequalifications,
      }));
    } catch (error) {
      console.error('Failed to refresh admin action counts:', error);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    const onFocus = () => fetchCounts();
    window.addEventListener('focus', onFocus);
    router.events.on('routeChangeComplete', fetchCounts);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      router.events.off('routeChangeComplete', fetchCounts);
    };
  }, [fetchCounts, router.events]);

  /* -------------------- Nav items -------------------- */
  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: FiHome },
    { href: '/admin/submitted-visitors', label: 'Submitted Visitors', icon: FiMail },
    {
      href: '/admin/requests',
      label: 'Requests',
      icon: FiGrid,
      badge: counts.requests,
    },
    {
      href: '/admin/buyer-prequalifications',
      label: 'Buyer Prequalifications',
      icon: FiUser,
      badge: counts.buyerPrequalifications,
    },
    {
      href: '/admin/agent-applications',
      label: 'Request Applications',
      icon: FiZap,
      badge: counts.applications,
    },

    { href: '/admin/htv', label: 'HTV', icon: FiPackage, badge: counts.htv },
    {
      href: '/admin/advertisements',
      label: 'Advertisements',
      icon: FiUsers,
      badge: counts.advertisements,
    },
    { href: '/admin/newsletter', label: 'Newsletter', icon: FiMail },
    {
      href: '/admin/market-intelligence',
      label: 'Market Intelligence',
      icon: FiTrendingUp,
    },
    { href: '/admin/users', label: 'Users & Agents', icon: FiUsers, badge: counts.users + counts.agents },
   
    { href: '/admin/properties', label: 'Properties', icon: FiUsers },
    { href: '/admin/api-smoke', label: 'API Smoke', icon: FiGrid },
  ];

  /* -------------------- External nav (leave admin) -------------------- */
  const externalNavItems = [
    { href: '/', label: 'Home', icon: FiExternalLink },
    { href: '/dashboard', label: 'Dashboard', icon: FiUser },
  ];

  const isActive = (href) => {
    if (href === '/admin/users') {
      return path === href && router.query.tab !== 'agents';
    }
    if (href === '/admin/users?tab=agents') {
      return path === '/admin/users' && router.query.tab === 'agents';
    }
    return path === href;
  };

  const renderBadge = (count) => {
    if (!count) return null;
    return (
      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-semibold text-white">
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ==================== Mobile top bar ==================== */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          aria-label="Open menu"
        >
          <FiMenu size={18} />
          Menu
        </button>
        <span className="text-sm font-semibold text-slate-900">Admin</span>
        <div className="w-[72px]" aria-hidden />
      </header>

      {/* ==================== Mobile drawer overlay ==================== */}
      <div
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!mobileOpen}
      />

      {/* ==================== Mobile drawer ==================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Admin navigation
          </span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close menu"
          >
            <FiX size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map(({ href, label, icon: Icon, badge }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? 'bg-accent/10 text-accent'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="flex-1 truncate">{label}</span>
                    {renderBadge(badge)}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* External links */}
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Leave admin
            </p>
            <ul className="space-y-1">
              {externalNavItems.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="flex-1 truncate">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </aside>

      {/* ==================== Desktop sidebar ==================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-200 bg-white transition-[width] duration-300 ease-in-out lg:flex ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Header */}
        <div
          className={`flex h-16 items-center border-b border-slate-100 px-4 ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          {!collapsed && (
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Admin
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1">
            {navItems.map(({ href, label, icon: Icon, badge }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      collapsed ? 'justify-center' : ''
                    } ${
                      active
                        ? 'bg-accent/10 text-accent'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={18} className="shrink-0" />

                    {!collapsed && <span className="flex-1 truncate">{label}</span>}
                    {!collapsed && renderBadge(badge)}

                    {/* Collapsed: badge dot */}
                    {collapsed && badge ? (
                      <span className="absolute right-2 top-2 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    ) : null}

                    {/* Collapsed: tooltip on hover */}
                    {collapsed && (
                      <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        {label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* External links */}
          <div className="mt-4 border-t border-slate-100 pt-4">
            {!collapsed && (
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Leave admin
              </p>
            )}
            <ul className="space-y-1">
              {externalNavItems.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!collapsed && <span className="flex-1 truncate">{label}</span>}

                    {collapsed && (
                      <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        {label}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Footer hint */}
        <div className="border-t border-slate-100 p-3">
          {!collapsed && (
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              Click chevron to hide
            </p>
          )}
        </div>
      </aside>

      {/* ==================== Content ==================== */}
      <main
        className={`transition-[padding] duration-300 ease-in-out ${
          collapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}