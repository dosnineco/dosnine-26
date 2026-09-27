import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import {
  Users as UsersIcon,
  ShieldCheck,
  ShieldX,
  Flag,
  Ban,
  IdCard,
  Download,
  Settings,
  Search,
  X,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  DollarSign,
  Mail,
  Phone,
  Calendar,
  UserCheck,
  UserX,
  Copy,
  Check,
} from 'lucide-react';

/* ----------------------------------------------------------
 * Tokens
 * ---------------------------------------------------------- */
const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20';
const labelClass =
  'block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5';

const ROLE_STYLES = {
  admin: { label: 'Admin', badge: 'bg-slate-900 text-white border-slate-900' },
  landlord: { label: 'Homeowner', badge: 'bg-violet-100 text-violet-800 border-violet-200' },
  tenant: { label: 'Tenant', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const STATUS_STYLES = {
  active: { label: 'Active', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  flagged: { label: 'Flagged', badge: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  deactivated: { label: 'Deactivated', badge: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' },
};

const ID_VERIFICATION_STYLES = {
  approved: { label: 'Verified', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  pending: { label: 'Pending', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  rejected: { label: 'Rejected', badge: 'bg-red-100 text-red-800 border-red-200' },
  unverified: { label: 'Unverified', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const getRoleStyle = (role) => ROLE_STYLES[role] || ROLE_STYLES.tenant;
const getStatusStyle = (status) =>
  STATUS_STYLES[status || 'active'] || STATUS_STYLES.active;
const getIdVerificationStyle = (status) =>
  ID_VERIFICATION_STYLES[status || 'unverified'] || ID_VERIFICATION_STYLES.unverified;

const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

/* ============================================================
 * Page
 * ============================================================ */

export default function AdminUsersPage() {
  const { user } = useUser();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const [manageUser, setManageUser] = useState(null);
  const [docsUser, setDocsUser] = useState(null);
  const [documentUrls, setDocumentUrls] = useState({});
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [copied, setCopied] = useState('');
  const [pendingActionId, setPendingActionId] = useState(null);

  /* ----------------------------------------------------------
   * Auth
   * ---------------------------------------------------------- */
  const buildAuthHeaders = () => {
    const headers = {};
    if (user?.id) headers['x-clerk-user-id'] = user.id;
    const primaryEmail =
      user?.emailAddresses?.[0]?.emailAddress ||
      user?.primaryEmailAddress?.emailAddress ||
      '';
    if (primaryEmail) headers['x-clerk-user-email'] = primaryEmail;
    const fullName = [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (fullName) headers['x-clerk-user-name'] = fullName;
    return headers;
  };

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/admin/verify-admin', {
          headers: buildAuthHeaders(),
          credentials: 'include',
        });
        const payload = await response.json();

        if (response.ok && payload?.isAdmin) {
          setIsAdmin(true);
          await fetchUsers();
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    };
    checkAdminAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchUsers = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/users', {
        headers: buildAuthHeaders(),
        credentials: 'include',
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load users');
      }

      setUsers(payload.users || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* ----------------------------------------------------------
   * User actions
   * ---------------------------------------------------------- */
  const isPremiumActive = (u) =>
    Boolean(u.premium_service_request) &&
    u.premium_service_request_expires &&
    new Date(u.premium_service_request_expires) > new Date();

  const runUserPatch = async (payload, successMsg) => {
    const response = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Update failed');
    }
    toast.success(successMsg);
    await fetchUsers();
  };

  const setUserStatus = async (userId, status) => {
    setPendingActionId(userId);
    try {
      await runUserPatch(
        { id: userId, account_status: status },
        `User ${status}`
      );
      setManageUser((current) =>
        current && current.id === userId
          ? { ...current, account_status: status }
          : current
      );
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setPendingActionId(null);
    }
  };

  const setIdVerificationStatus = async (userId, status) => {
    setPendingActionId(userId);
    try {
      await runUserPatch(
        { id: userId, id_verification_status: status },
        `ID verification ${status}`
      );
      setManageUser((current) =>
        current && current.id === userId
          ? { ...current, id_verification_status: status }
          : current
      );
    } catch (err) {
      toast.error(err.message || 'Failed to update ID verification');
    } finally {
      setPendingActionId(null);
    }
  };

  const setPremiumStatus = async (userToUpdate, enabled) => {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    setPendingActionId(userToUpdate.id);
    try {
      await runUserPatch(
        {
          id: userToUpdate.id,
          premium_service_request: enabled,
          premium_service_request_expires: enabled
            ? expirationDate.toISOString()
            : null,
        },
        enabled ? 'Marked as paid for 30 days' : 'Paid status removed'
      );

      setManageUser((current) =>
        current && current.id === userToUpdate.id
          ? {
              ...current,
              premium_service_request: enabled,
              premium_service_request_expires: enabled
                ? expirationDate.toISOString()
                : null,
            }
          : current
      );
    } catch (err) {
      toast.error(err.message || 'Failed to update payment status');
    } finally {
      setPendingActionId(null);
    }
  };

  const handleSaveUser = async (formData) => {
    const trimmedName = formData.full_name?.trim() || '';
    const trimmedEmail = formData.email?.trim() || '';

    if (!trimmedName) {
      toast.error('Name is required');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('A valid email is required');
      return;
    }

    setPendingActionId(formData.id);
    try {
      await runUserPatch(
        {
          id: formData.id,
          full_name: trimmedName,
          email: trimmedEmail,
          phone: formData.phone?.trim() || null,
          role: formData.role,
        },
        'User updated'
      );
      setManageUser(null);
    } catch (err) {
      if (err.message?.includes('duplicate') || err.message?.includes('email')) {
        toast.error('Email already exists');
      } else {
        toast.error(err.message || 'Failed to save user');
      }
    } finally {
      setPendingActionId(null);
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;

    setPendingActionId(userId);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({ id: userId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to delete user');
      }
      toast.success('User deleted');
      setManageUser(null);
      await fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setPendingActionId(null);
    }
  };

  /* ----------------------------------------------------------
   * ID documents
   * ---------------------------------------------------------- */
  const resolveDocumentUrl = async (rawPath) => {
    let path = rawPath;
    if (path.includes('agent-documents/')) {
      path = path.split('agent-documents/')[1].split('?')[0];
    }
    const response = await fetch(
      `/api/admin/agents/get-document?path=${encodeURIComponent(path)}`,
      { headers: buildAuthHeaders(), credentials: 'include' }
    );
    const payload = await response.json();
    if (!response.ok || !payload?.signedUrl) {
      throw new Error(payload?.error || 'Failed to load document');
    }
    return payload.signedUrl;
  };

  const viewIdDocuments = async (u) => {
    setDocsUser(u);
    if (!u.verification_front_url && !u.verification_back_url) return;

    setLoadingDocs(true);
    const urls = {};
    try {
      if (u.verification_front_url) {
        try {
          urls.front = await resolveDocumentUrl(u.verification_front_url);
        } catch {
          urls.front = u.verification_front_url;
        }
      }
      if (u.verification_back_url) {
        try {
          urls.back = await resolveDocumentUrl(u.verification_back_url);
        } catch {
          urls.back = u.verification_back_url;
        }
      }
      setDocumentUrls(urls);
    } finally {
      setLoadingDocs(false);
    }
  };

  const closeDocsModal = () => {
    setDocsUser(null);
    setDocumentUrls({});
  };

  /* ----------------------------------------------------------
   * Copy helper
   * ---------------------------------------------------------- */
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

  /* ----------------------------------------------------------
   * Derived
   * ---------------------------------------------------------- */
  const summary = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const homeowners = users.filter((u) => u.role === 'landlord').length;
    const tenants = users.filter((u) => u.role === 'tenant').length;
    const paid = users.filter(isPremiumActive).length;
    return { total, admins, homeowners, tenants, paid };
  }, [users]);

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (filterRole !== 'all') {
      result = result.filter((u) => (u.role || 'tenant') === filterRole);
    }
    if (filterStatus !== 'all') {
      result = result.filter(
        (u) => (u.account_status || 'active') === filterStatus
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.includes(q)
      );
    }

    return result;
  }, [users, filterRole, filterStatus, searchQuery]);

  const activeFilterCount = [
    filterRole !== 'all',
    filterStatus !== 'all',
    Boolean(searchQuery.trim()),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery('');
    setFilterRole('all');
    setFilterStatus('all');
  };

  /* ----------------------------------------------------------
   * Access states
   * ---------------------------------------------------------- */
  if (!isAdmin && !loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <ShieldX className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Access denied</h1>
          <p className="mt-2 text-sm text-slate-600">
            Admin access is required to view users.
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
        <title>Users — Admin</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Users
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              User Management
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage roles, account status, ID verification, and premium access.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchUsers}
            disabled={refreshing}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Total users"
            value={summary.total}
            icon={UsersIcon}
            tone="accent"
            onClick={() => {
              setFilterRole('all');
              setFilterStatus('all');
            }}
          />
          <StatCard
            label="Admins"
            value={summary.admins}
            icon={ShieldCheck}
            tone="slate"
            onClick={() => setFilterRole('admin')}
          />
          <StatCard
            label="Homeowners"
            value={summary.homeowners}
            icon={UsersIcon}
            tone="violet"
            onClick={() => setFilterRole('landlord')}
          />
          <StatCard
            label="Tenants"
            value={summary.tenants}
            icon={UsersIcon}
            tone="blue"
            onClick={() => setFilterRole('tenant')}
          />
          <StatCard
            label="Paid J$6,000"
            value={summary.paid}
            icon={DollarSign}
            tone="emerald"
          />
        </div>

        {/* Search + Filters */}
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
                placeholder="Search name, email, phone…"
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
                <UsersIcon size={14} />
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
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <div>
                <p className={labelClass}>Role</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'landlord', label: 'Homeowners' },
                    { value: 'tenant', label: 'Tenants' },
                    { value: 'admin', label: 'Admins' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilterRole(value)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                        filterRole === value
                          ? 'border-accent bg-accent text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-accent'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className={labelClass}>Account status</p>
                <div className="flex flex-wrap gap-2">
                  {['all', 'active', 'flagged', 'deactivated'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setFilterStatus(status)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                        filterStatus === status
                          ? 'border-accent bg-accent text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-accent'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {!loading && (
          <p className="text-sm text-slate-500">
            Showing{' '}
            <strong className="text-slate-900">{filteredUsers.length}</strong> of{' '}
            {users.length} user{users.length === 1 ? '' : 's'}
          </p>
        )}

        {/* User list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
              />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              {users.length === 0
                ? 'No users yet'
                : 'No users match your filters'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {users.length === 0
                ? 'New sign-ups will appear here.'
                : 'Try clearing the filters above.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                isPremiumActive={isPremiumActive(u)}
                pending={pendingActionId === u.id}
                onCopy={copyToClipboard}
                copied={copied}
                onTogglePremium={() => setPremiumStatus(u, !isPremiumActive(u))}
                onManage={() => setManageUser(u)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Manage user modal */}
      {manageUser && (
        <ManageUserModal
          user={manageUser}
          isPremiumActive={isPremiumActive(manageUser)}
          pending={pendingActionId === manageUser.id}
          onClose={() => setManageUser(null)}
          onSetStatus={(status) => setUserStatus(manageUser.id, status)}
          onSetIdVerification={(status) =>
            setIdVerificationStatus(manageUser.id, status)
          }
          onTogglePremium={() =>
            setPremiumStatus(manageUser, !isPremiumActive(manageUser))
          }
          onViewDocuments={() => viewIdDocuments(manageUser)}
          onSave={handleSaveUser}
          onDelete={() => handleDelete(manageUser.id, manageUser.full_name)}
        />
      )}

      {/* ID documents modal */}
      {docsUser && (
        <IdDocumentsModal
          user={docsUser}
          urls={documentUrls}
          loading={loadingDocs}
          onClose={closeDocsModal}
          onApprove={() => {
            setIdVerificationStatus(docsUser.id, 'approved');
            closeDocsModal();
          }}
          onReject={() => {
            setIdVerificationStatus(docsUser.id, 'rejected');
            closeDocsModal();
          }}
        />
      )}
    </>
  );
}

/* ============================================================
 * Sub-components
 * ============================================================ */

const TONE_STYLES = {
  accent: { bg: 'bg-accent/10', text: 'text-accent' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600' },
  red: { bg: 'bg-red-50', text: 'text-red-600' },
};

function StatCard({ label, value, icon: Icon, tone = 'accent', onClick }) {
  const style = TONE_STYLES[tone] || TONE_STYLES.accent;
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-2xl border border-slate-200 bg-white p-4 text-left transition ${
        onClick ? 'hover:border-slate-300 hover:bg-slate-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.bg} ${style.text}`}
        >
          <Icon size={14} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </Wrapper>
  );
}

function UserCard({
  user,
  isPremiumActive,
  pending,
  onCopy,
  copied,
  onTogglePremium,
  onManage,
}) {
  const role = getRoleStyle(user.role);
  const status = getStatusStyle(user.account_status);
  const idVerification = getIdVerificationStyle(user.id_verification_status);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        {/* Avatar */}
        <div className="flex shrink-0 items-start gap-3 sm:flex-col sm:items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
            {getInitials(user.full_name)}
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Name + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-slate-900">
              {user.full_name || 'Unnamed user'}
            </h3>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${role.badge}`}
            >
              {role.label}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            {isPremiumActive && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                <DollarSign size={10} />
                Paid
              </span>
            )}
          </div>

          {/* Contact */}
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
            {user.email && (
              <button
                type="button"
                onClick={() => onCopy(user.email, `${user.id}-email`)}
                className="group inline-flex items-start gap-2 text-left transition hover:text-accent"
              >
                <Mail size={13} className="mt-0.5 shrink-0 text-slate-400" />
                <span className="min-w-0 truncate">{user.email}</span>
                {copied === `${user.id}-email` ? (
                  <Check size={11} className="mt-1 shrink-0 text-emerald-600" />
                ) : (
                  <Copy
                    size={11}
                    className="mt-1 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100"
                  />
                )}
              </button>
            )}
            {user.phone && (
              <a
                href={`tel:${user.phone}`}
                className="inline-flex items-start gap-2 transition hover:text-accent"
              >
                <Phone size={13} className="mt-0.5 shrink-0 text-slate-400" />
                <span className="min-w-0 truncate">{user.phone}</span>
              </a>
            )}
          </div>

          {/* Meta grid */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetaBox
              label="ID verification"
              value={idVerification.label}
              tone={
                user.id_verification_status === 'approved'
                  ? 'emerald'
                  : user.id_verification_status === 'pending'
                  ? 'amber'
                  : 'slate'
              }
            />
            <MetaBox
              label="Payment"
              value={
                isPremiumActive && user.premium_service_request_expires
                  ? `Paid · expires ${new Date(
                      user.premium_service_request_expires
                    ).toLocaleDateString()}`
                  : 'Not paid'
              }
              tone={isPremiumActive ? 'emerald' : 'slate'}
            />
            <MetaBox
              label="Joined"
              value={
                user.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—'
              }
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onTogglePremium}
          disabled={pending}
          className={`inline-flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-2 text-xs font-semibold transition disabled:opacity-50 ${
            isPremiumActive
              ? 'border-red-200 text-red-700 hover:bg-red-50'
              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          <DollarSign size={13} />
          {isPremiumActive ? 'Remove paid' : 'Mark paid'}
        </button>

        <button
          type="button"
          onClick={onManage}
          disabled={pending}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          <Settings size={13} />
          Manage
        </button>
      </div>
    </article>
  );
}

function MetaBox({ label, value, tone = 'slate' }) {
  const toneClass = {
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    slate: 'text-slate-700',
  }[tone];

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-1 truncate text-sm font-semibold ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

/* ============================================================
 * Manage user modal
 * ============================================================ */

function ManageUserModal({
  user,
  isPremiumActive,
  pending,
  onClose,
  onSetStatus,
  onSetIdVerification,
  onTogglePremium,
  onViewDocuments,
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState({
    id: user.id,
    full_name: user.full_name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role || 'tenant',
  });

  const currentStatus = user.account_status || 'active';
  const currentIdVerification = user.id_verification_status || 'unverified';

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">Manage user</h2>
            <p className="mt-0.5 truncate text-sm text-slate-600">
              {user.full_name || user.email}
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

        <div className="space-y-5 px-5 py-5">
          {/* Account status */}
          <section>
            <p className={labelClass}>Account status</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSetStatus('active')}
                disabled={pending || currentStatus === 'active'}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                  currentStatus === 'active'
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-200 bg-white text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <UserCheck size={12} />
                Activate
              </button>
              <button
                type="button"
                onClick={() => onSetStatus('flagged')}
                disabled={pending || currentStatus === 'flagged'}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                  currentStatus === 'flagged'
                    ? 'border-amber-500 bg-amber-500 text-white'
                    : 'border-slate-200 bg-white text-amber-700 hover:bg-amber-50'
                }`}
              >
                <Flag size={12} />
                Flag
              </button>
              <button
                type="button"
                onClick={() => onSetStatus('deactivated')}
                disabled={pending || currentStatus === 'deactivated'}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                  currentStatus === 'deactivated'
                    ? 'border-red-500 bg-red-500 text-white'
                    : 'border-slate-200 bg-white text-red-700 hover:bg-red-50'
                }`}
              >
                <UserX size={12} />
                Deactivate
              </button>
            </div>
          </section>

          {/* Payment */}
          <section>
            <p className={labelClass}>Premium payment</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onTogglePremium}
                disabled={pending}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                  isPremiumActive
                    ? 'border-red-200 bg-white text-red-700 hover:bg-red-50'
                    : 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <DollarSign size={12} />
                {isPremiumActive ? 'Remove paid status' : 'Mark paid for 30 days'}
              </button>
              {isPremiumActive && user.premium_service_request_expires && (
                <span className="text-xs text-slate-500">
                  Expires{' '}
                  {new Date(
                    user.premium_service_request_expires
                  ).toLocaleDateString()}
                </span>
              )}
            </div>
          </section>

          {/* ID verification */}
          <section>
            <p className={labelClass}>
              ID verification ·{' '}
              <span className="text-slate-500 normal-case">
                {currentIdVerification.replace(/_/g, ' ')}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {(user.verification_front_url || user.verification_back_url) && (
                <button
                  type="button"
                  onClick={onViewDocuments}
                  className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20"
                >
                  <IdCard size={12} />
                  View ID
                </button>
              )}
              <button
                type="button"
                onClick={() => onSetIdVerification('approved')}
                disabled={pending || currentIdVerification === 'approved'}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                  currentIdVerification === 'approved'
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-200 bg-white text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <CheckCircle2 size={12} />
                Approve
              </button>
              <button
                type="button"
                onClick={() => onSetIdVerification('rejected')}
                disabled={pending || currentIdVerification === 'rejected'}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                  currentIdVerification === 'rejected'
                    ? 'border-red-500 bg-red-500 text-white'
                    : 'border-slate-200 bg-white text-red-700 hover:bg-red-50'
                }`}
              >
                <Ban size={12} />
                Reject
              </button>
            </div>
          </section>

          {/* Edit form */}
          <form onSubmit={handleSubmit} className="space-y-3 border-t border-slate-100 pt-5">
            <div>
              <label className={labelClass}>Full name *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={inputClass}
              >
                <option value="tenant">Tenant</option>
                <option value="landlord">Homeowner</option>
                <option value="admin">Admin</option>
              </select>
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
                disabled={pending}
                className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
              >
                {pending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>

          {/* Danger zone */}
          <div className="border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 size={14} />
              Delete user
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * ID documents modal
 * ============================================================ */

function IdDocumentsModal({ user, urls, loading, onClose, onApprove, onReject }) {
  const hasAny = urls.front || urls.back;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-3xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">ID Uploads</h2>
            <p className="mt-0.5 truncate text-sm text-slate-600">
              {user.full_name || user.email}
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

        <div className="px-5 py-5">
          {loading ? (
            <div className="space-y-3">
              <div className="h-64 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
              <div className="h-64 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
            </div>
          ) : hasAny ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { key: 'front', label: 'Front of ID' },
                { key: 'back', label: 'Back of ID' },
              ]
                .filter(({ key }) => urls[key])
                .map(({ key, label }) => (
                  <div key={key}>
                    <p className={labelClass}>{label}</p>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <img
                        src={urls[key]}
                        alt={label}
                        className="h-auto w-full object-contain"
                      />
                    </div>
                    <a
                      href={urls[key]}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition hover:text-accent/80"
                    >
                      <Download size={12} />
                      Download
                    </a>
                  </div>
                ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <IdCard className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                No ID documents uploaded
              </p>
            </div>
          )}
        </div>

        {user.id_verification_status === 'pending' && !loading && (
          <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white px-5 py-4">
            <button
              type="button"
              onClick={onApprove}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <CheckCircle2 size={14} />
              Approve ID
            </button>
            <button
              type="button"
              onClick={onReject}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              <Ban size={14} />
              Reject ID
            </button>
          </div>
        )}
      </div>
    </div>
  );
}