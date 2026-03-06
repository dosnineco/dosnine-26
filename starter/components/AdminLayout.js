import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { FiGrid, FiUsers, FiZap, FiTrendingUp, FiPackage } from 'react-icons/fi';

export default function AdminLayout() {
  const router = useRouter();
  const path = router.pathname;

  const [counts, setCounts] = useState({
    requests: 0,
    applications: 0,
    advertisements: 0,
  });

  const LAST_SEEN_KEY_PREFIX = 'admin-notification-last-seen:';

  const markGroupAsSeen = (group) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`${LAST_SEEN_KEY_PREFIX}${group}`, String(Date.now()));
    setCounts((prev) => ({ ...prev, [group]: 0 }));
  };

  const getLastSeen = (group) => {
    if (typeof window === 'undefined') return 0;
    const raw = window.localStorage.getItem(`${LAST_SEEN_KEY_PREFIX}${group}`);
    const parsed = Number(raw || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const routeToGroup = useMemo(
    () => ({
      '/admin/requests': 'requests',
      '/admin/requests-management': 'requests',
      '/admin/agent-applications': 'applications',
      '/admin/advertisements': 'advertisements',
    }),
    []
  );

  const isActive = (p) => path === p;

  useEffect(() => {
    const group = routeToGroup[path];
    if (group) {
      markGroupAsSeen(group);
    }
  }, [path, routeToGroup]);

  useEffect(() => {
    let isMounted = true;

    const fetchCounts = async () => {
      try {
        const [requestsRes, applicationsRes, advertisementsRes] = await Promise.all([
          fetch('/api/admin/requests', { credentials: 'include' }),
          fetch('/api/admin/agent-applications', { credentials: 'include' }),
          fetch('/api/admin/advertisements', { credentials: 'include' }),
        ]);

        const [requestsPayload, applicationsPayload, advertisementsPayload] = await Promise.all([
          requestsRes.json().catch(() => null),
          applicationsRes.json().catch(() => null),
          advertisementsRes.json().catch(() => null),
        ]);

        if (!isMounted) return;

        const requestsLastSeen = getLastSeen('requests');
        const applicationsLastSeen = getLastSeen('applications');
        const advertisementsLastSeen = getLastSeen('advertisements');

        const requestCount = (requestsPayload?.requests || []).filter((item) => {
          const createdAt = new Date(item?.created_at || 0).getTime();
          return createdAt > requestsLastSeen;
        }).length;

        const applicationsCount = (applicationsPayload?.applications || []).filter((item) => {
          const appliedAt = new Date(item?.applied_at || 0).getTime();
          const status = String(item?.status || '').toLowerCase();
          return status === 'pending' && appliedAt > applicationsLastSeen;
        }).length;

        const advertisementsCount = (advertisementsPayload?.submissions || []).filter((item) => {
          const submittedAt = new Date(item?.submitted_at || 0).getTime();
          const status = String(item?.status || '').toLowerCase();
          return ['pending', 'pending_payment'].includes(status) && submittedAt > advertisementsLastSeen;
        }).length;

        setCounts({
          requests: requestCount,
          applications: applicationsCount,
          advertisements: advertisementsCount,
        });
      } catch (error) {
        // Keep layout functional even if badge fetch fails.
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const renderCount = (count) => {
    if (!count) return null;

    return (
      <span className="inline-flex min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full bg-accent text-white text-xs font-semibold">
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  const onNavClick = (href) => {
    const group = routeToGroup[href];
    if (group) {
      markGroupAsSeen(group);
    }
  };

  return (
    <div className=" ">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Link href="/admin/requests" onClick={() => onNavClick('/admin/requests')} className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/requests') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiGrid size={14} />
            Requests
            {renderCount(counts.requests)}
          </Link>
          <Link href="/admin/agent-applications" onClick={() => onNavClick('/admin/agent-applications')} className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/agent-applications') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiZap size={14} />
            Request Applications
            {renderCount(counts.applications)}
          </Link>
          <Link href="/admin/requests-management" onClick={() => onNavClick('/admin/requests-management')} className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/requests-management') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiZap size={14} />
            Manage Requests
            {renderCount(counts.requests)}
          </Link>
          <Link href="/admin/agents" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/agents') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiUsers size={14} />
            Agents
          </Link>
          <Link href="/admin/advertisements" onClick={() => onNavClick('/admin/advertisements')} className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/advertisements') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiUsers size={14} />
            Advertisements
            {renderCount(counts.advertisements)}
          </Link>
          <Link href="/admin/allocation" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/allocation') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiTrendingUp size={14} />
            Allocation
          </Link>
          
          <Link href="/admin/users" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/users') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiUsers size={14} />
            Users
          </Link>

           <Link href="/admin/properties" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/users') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiUsers size={14} />
            Properties
          </Link>

          <Link href="/admin/api-smoke" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/api-smoke') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiGrid size={14} />
            API Smoke
          </Link>

        </div>
      </div>
    </div>
  );
}
