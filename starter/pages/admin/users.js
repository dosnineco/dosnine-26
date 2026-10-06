import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import axios from 'axios';
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
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Building2,
} from 'lucide-react';

/* ----------------------------------------------------------
 * Dosnine UI tokens
 * ---------------------------------------------------------- */
const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/10';
const labelClass =
  'block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5';

const DEFAULT_AGENT_PLAN_PRICES = {
  '7-day': 1499,
  '30-day': 4999,
  '90-day': 14999,
  free: 0,
};

const ROLE_STYLES = {
  admin: { label: 'Admin', badge: 'bg-slate-900 text-white border-slate-900' },
  regular: { label: 'Regular', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  homeowner: { label: 'Homeowner', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  tenant: { label: 'Tenant', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  advertiser: { label: 'Advertiser', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  agent: { label: 'Agent', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const STATUS_STYLES = {
  active: {
    label: 'Active',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  flagged: {
    label: 'Flagged',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  deactivated: {
    label: 'Deactivated',
    badge: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
};

const ID_VERIFICATION_STYLES = {
  approved: { label: 'Verified', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Pending', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  rejected: { label: 'Rejected', badge: 'bg-red-50 text-red-700 border-red-200' },
  unverified: { label: 'Unverified', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const getAccountType = (user) => {
  if (['regular', 'advertiser', 'agent'].includes(user.account_type)) {
    return user.account_type;
  }
  return user.user_type === 'agent' ? 'agent' : 'regular';
};
const getProfileIntent = (user) => {
  if (['homeowner', 'tenant'].includes(user.profile_intent)) {
    return user.profile_intent;
  }
  return user.user_type === 'tenant' || user.role === 'tenant' ? 'tenant' : 'homeowner';
};
const hasAdminAccess = (user) => user.role === 'admin';
const getRoleStyle = (role) => ROLE_STYLES[role] || ROLE_STYLES.regular;
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
  const { getToken, isLoaded: authLoaded, userId } = useAuth();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [activeTab, setActiveTab] = useState('users');

  /* -------------------- Shared auth helpers -------------------- */
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

  const getAuthConfig = async () => {
    if (!authLoaded || !userId) {
      throw new Error('Session expired. Please sign in again.');
    }
    const token = await getToken();
    return {
      withCredentials: true,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    };
  };

  const handleAuthFailure = (error) => {
    if (
      error?.response?.status === 401 ||
      error?.message === 'Session expired. Please sign in again.'
    ) {
      toast.error('Session expired. Please sign in again.');
      router.push('/sign-in');
      return true;
    }
    return false;
  };

  /* ============================================================
   * USERS TAB STATE
   * ============================================================ */
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [refreshingUsers, setRefreshingUsers] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const [manageUser, setManageUser] = useState(null);
  const [docsUser, setDocsUser] = useState(null);
  const [userDocumentUrls, setUserDocumentUrls] = useState({});
  const [loadingUserDocs, setLoadingUserDocs] = useState(false);
  const [copied, setCopied] = useState('');
  const [pendingUserId, setPendingUserId] = useState(null);

  /* ============================================================
   * AGENTS TAB STATE
   * ============================================================ */
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [verifyingAgent, setVerifyingAgent] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentFilterStatus, setAgentFilterStatus] = useState('all');
  const [agentDocumentUrls, setAgentDocumentUrls] = useState({});
  const [loadingAgentDocs, setLoadingAgentDocs] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState({});
  const [agentPlanPrices, setAgentPlanPrices] = useState(DEFAULT_AGENT_PLAN_PRICES);
  const [agentPlanPricesDraft, setAgentPlanPricesDraft] = useState(DEFAULT_AGENT_PLAN_PRICES);
  const [savingAgentPlanPrices, setSavingAgentPlanPrices] = useState(false);

  useEffect(() => {
    if (router.pathname !== '/admin/users') return;
    setActiveTab(router.query.tab === 'agents' ? 'agents' : 'users');
  }, [router.pathname, router.query.tab]);

  /* ----------------------------------------------------------
   * Admin check (once)
   * ---------------------------------------------------------- */
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
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      } finally {
        setLoadingAdmin(false);
      }
    };
    checkAdminAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* ----------------------------------------------------------
   * Fetch users
   * ---------------------------------------------------------- */
  const fetchUsers = async ({ silent = false } = {}) => {
    try {
      if (!silent) setRefreshingUsers(true);
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
      setLoadingUsers(false);
      setRefreshingUsers(false);
    }
  };

  /* ----------------------------------------------------------
   * Fetch agents
   * ---------------------------------------------------------- */
  const fetchAgents = async ({ silent = false } = {}) => {
    if (!silent) setLoadingAgents(true);
    try {
      const authConfig = await getAuthConfig();
      const response = await axios.get('/api/admin/agents/list', {
        ...authConfig,
        params: { status: agentFilterStatus },
      });
      setAgents(response.data.agents || []);
    } catch (error) {
      if (handleAuthFailure(error)) return;
      toast.error(error.response?.data?.error || 'Failed to load agents');
    } finally {
      if (!silent) setLoadingAgents(false);
    }
  };

  const fetchAgentPlanPrices = async () => {
    try {
      const authConfig = await getAuthConfig();
      const response = await axios.get('/api/admin/agents/plan-prices', authConfig);
      const prices = response.data?.planPrices || DEFAULT_AGENT_PLAN_PRICES;
      setAgentPlanPrices(prices);
      setAgentPlanPricesDraft(prices);
    } catch (error) {
      if (handleAuthFailure(error)) return;
      toast.error(error.response?.data?.error || 'Failed to load agent plan prices');
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'users' && loadingUsers) fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'agents') fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, activeTab, agentFilterStatus]);

  useEffect(() => {
    if (isAdmin && activeTab === 'agents') fetchAgentPlanPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'agents') return;
    const timer = setInterval(() => fetchAgents({ silent: true }), 20000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, activeTab, agentFilterStatus]);

  useEffect(() => {
    const validPlans = ['free', '7-day', '30-day', '90-day'];
    const next = {};
    agents.forEach((a) => {
      next[a.id] = validPlans.includes(a.payment_status) ? a.payment_status : '7-day';
    });
    setSelectedPlans(next);
  }, [agents]);

  const saveAgentPlanPrices = async () => {
    setSavingAgentPlanPrices(true);
    try {
      const authConfig = await getAuthConfig();
      const prices = Object.fromEntries(
        Object.entries(DEFAULT_AGENT_PLAN_PRICES).map(([plan, fallback]) => [
          plan,
          plan === 'free' ? 0 : Number(agentPlanPricesDraft[plan] ?? fallback),
        ])
      );
      const response = await axios.patch(
        '/api/admin/agents/plan-prices',
        { planPrices: prices },
        authConfig
      );
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to save agent plan prices');
      }
      setAgentPlanPrices(response.data.planPrices);
      setAgentPlanPricesDraft(response.data.planPrices);
      toast.success('Agent plan prices updated');
    } catch (error) {
      if (handleAuthFailure(error)) return;
      toast.error(error.response?.data?.error || error.message || 'Failed to save agent plan prices');
    } finally {
      setSavingAgentPlanPrices(false);
    }
  };

  /* ============================================================
   * USER ACTIONS (logic unchanged)
   * ============================================================ */
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
    await fetchUsers({ silent: true });
  };

  const setUserStatus = async (userId, status) => {
    setPendingUserId(userId);
    try {
      await runUserPatch({ id: userId, account_status: status }, `User ${status}`);
      setManageUser((current) =>
        current && current.id === userId
          ? { ...current, account_status: status }
          : current
      );
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setPendingUserId(null);
    }
  };

  const setIdVerificationStatus = async (userId, status) => {
    setPendingUserId(userId);
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
      setPendingUserId(null);
    }
  };

  const setPremiumStatus = async (userToUpdate, enabled) => {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    setPendingUserId(userToUpdate.id);
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
      setPendingUserId(null);
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

    setPendingUserId(formData.id);
    try {
      await runUserPatch(
        {
          id: formData.id,
          full_name: trimmedName,
          email: trimmedEmail,
          phone: formData.phone?.trim() || null,
          account_type: formData.account_type,
          profile_intent: formData.account_type === 'regular' ? formData.profile_intent : null,
          is_admin: formData.is_admin,
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
      setPendingUserId(null);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;

    setPendingUserId(userId);
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
      await fetchUsers({ silent: true });
    } catch (err) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setPendingUserId(null);
    }
  };

  const resolveUserDocumentUrl = async (rawPath) => {
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

  const viewUserDocuments = async (u) => {
    setDocsUser(u);
    if (!u.verification_front_url && !u.verification_back_url) return;

    setLoadingUserDocs(true);
    const urls = {};
    try {
      if (u.verification_front_url) {
        try {
          urls.front = await resolveUserDocumentUrl(u.verification_front_url);
        } catch {
          urls.front = u.verification_front_url;
        }
      }
      if (u.verification_back_url) {
        try {
          urls.back = await resolveUserDocumentUrl(u.verification_back_url);
        } catch {
          urls.back = u.verification_back_url;
        }
      }
      setUserDocumentUrls(urls);
    } finally {
      setLoadingUserDocs(false);
    }
  };

  const closeUserDocs = () => {
    setDocsUser(null);
    setUserDocumentUrls({});
  };

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

  /* ============================================================
   * AGENT ACTIONS (logic unchanged)
   * ============================================================ */
  const updateAgentStatus = async (agentId, status, notes = '') => {
    if (!confirm(`Are you sure you want to ${status} this agent?`)) return;

    setVerifyingAgent(true);
    try {
      const authConfig = await getAuthConfig();
      const response = await axios.post(
        '/api/admin/agents/update-status',
        { agentId, status, notes },
        authConfig
      );
      toast.success(response.data.message);
      if (response.data.emailWarning) toast.error(response.data.emailWarning);
      fetchAgents({ silent: true });
      setSelectedAgent(null);
    } catch (error) {
      if (handleAuthFailure(error)) return;
      toast.error(error.response?.data?.error || 'Failed to update agent');
    } finally {
      setVerifyingAgent(false);
    }
  };

  const setPaymentPlan = async (agentId, plan, agent) => {
    const validPlans = ['free', '7-day', '30-day', '90-day'];
    if (!validPlans.includes(plan)) {
      toast.error('Invalid access plan');
      return;
    }
    if (agent.verification_status !== 'approved') {
      toast.error('Agent must be approved first');
      return;
    }

    try {
      const authConfig = await getAuthConfig();
      let expiryDate = null;
      const now = new Date();

      if (plan === '7-day') expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      else if (plan === '30-day') expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      else if (plan === '90-day') expiryDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const response = await axios.post(
        '/api/admin/agents/payment-plan',
        {
          agentId,
          plan,
          accessExpiry: expiryDate ? expiryDate.toISOString() : null,
        },
        authConfig
      );
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to set access plan');
      }

      toast.success(`Access plan set to ${plan}`);
      if (response.data.emailWarning) toast.error(response.data.emailWarning);
      fetchAgents({ silent: true });
      return true;
    } catch (error) {
      if (handleAuthFailure(error)) return;
      toast.error(error.message || 'Failed to set access plan');
      return false;
    }
  };

  const confirmAgentPayment = async (agent) => {
    if (agent.payment_receipt_status !== 'pending') {
      toast.error('This receipt is no longer awaiting verification.');
      return;
    }
    const plan = agent.payment_receipt_plan;
    if (!['7-day', '30-day', '90-day'].includes(plan)) {
      toast.error('The submitted receipt does not have a valid paid plan.');
      return;
    }
    if (!confirm(`Confirm the J$${Number(agent.payment_receipt_amount).toLocaleString()} transfer and activate ${plan} access for ${agent.user?.full_name || 'this agent'}?`)) {
      return;
    }

    const confirmed = await setPaymentPlan(agent.id, plan, agent);
    if (confirmed) setSelectedAgent(null);
  };

  const rejectAgentPaymentReceipt = async (agent) => {
    if (agent.payment_receipt_status !== 'pending') {
      toast.error('This receipt is no longer awaiting verification.');
      return;
    }
    if (!confirm(`Reject the payment receipt submitted by ${agent.user?.full_name || 'this agent'}?`)) {
      return;
    }

    try {
      const authConfig = await getAuthConfig();
      const response = await axios.patch(
        '/api/admin/agents/payment-receipt',
        { agentId: agent.id, action: 'reject' },
        authConfig
      );
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to reject receipt');
      }
      toast.success('Payment receipt rejected');
      setSelectedAgent(null);
      fetchAgents({ silent: true });
    } catch (error) {
      if (handleAuthFailure(error)) return;
      toast.error(error.response?.data?.error || 'Failed to reject receipt');
    }
  };

  const viewAgentDocuments = (agent) => {
    setSelectedAgent(agent);
    loadAgentDocumentUrls(agent);
  };

  const loadAgentDocumentUrls = async (agent) => {
    if (!agent.license_file_url && !agent.registration_file_url) return;

    setLoadingAgentDocs(true);
    const urls = {};
    try {
      if (agent.license_file_url) {
        let path = agent.license_file_url;
        if (path.includes('agent-documents/')) {
          path = path.split('agent-documents/')[1].split('?')[0];
        }
        try {
          const authConfig = await getAuthConfig();
          const response = await axios.get('/api/admin/agents/get-document', {
            ...authConfig,
            params: { path },
          });
          urls.license = response.data.signedUrl;
        } catch {
          urls.license = agent.license_file_url;
        }
      }

      if (agent.registration_file_url) {
        let path = agent.registration_file_url;
        if (path.includes('agent-documents/')) {
          path = path.split('agent-documents/')[1].split('?')[0];
        }
        try {
          const authConfig = await getAuthConfig();
          const response = await axios.get('/api/admin/agents/get-document', {
            ...authConfig,
            params: { path },
          });
          urls.registration = response.data.signedUrl;
        } catch {
          urls.registration = agent.registration_file_url;
        }
      }

      setAgentDocumentUrls(urls);
    } finally {
      setLoadingAgentDocs(false);
    }
  };

  /* ============================================================
   * DERIVED
   * ============================================================ */
  const summary = useMemo(() => {
    const total = users.length;
    const admins = users.filter(hasAdminAccess).length;
    const homeowners = users.filter((u) => getAccountType(u) === 'regular' && getProfileIntent(u) === 'homeowner').length;
    const tenants = users.filter((u) => getAccountType(u) === 'regular' && getProfileIntent(u) === 'tenant').length;
    const regular = users.filter((u) => getAccountType(u) === 'regular').length;
    const advertisers = users.filter((u) => getAccountType(u) === 'advertiser').length;
    const agents = users.filter((u) => getAccountType(u) === 'agent').length;
    const paid = users.filter(isPremiumActive).length;
    return { total, admins, homeowners, tenants, regular, advertisers, agents, paid };
  }, [users]);

  const filteredUsers = useMemo(() => {
    let result = [...users];
    if (filterRole !== 'all') {
      result = result.filter((u) => {
        if (filterRole === 'admin') return hasAdminAccess(u);
        if (filterRole === 'homeowner' || filterRole === 'tenant') {
          return getAccountType(u) === 'regular' && getProfileIntent(u) === filterRole;
        }
        return getAccountType(u) === filterRole;
      });
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

  const agentStats = useMemo(() => {
    return {
      pending: agents.filter((a) => a.verification_status === 'pending').length,
      approved: agents.filter((a) => a.verification_status === 'approved').length,
      rejected: agents.filter((a) => a.verification_status === 'rejected').length,
      total: agents.length,
      totalProfit: agents
        .filter((a) => a.payment_amount && a.payment_amount > 0)
        .reduce((sum, a) => sum + (Number(a.payment_amount) || 0), 0),
    };
  }, [agents]);

  const filteredAgents = useMemo(() => {
    return agentFilterStatus === 'all'
      ? agents
      : agents.filter((a) => a.verification_status === agentFilterStatus);
  }, [agents, agentFilterStatus]);

  /* ----------------------------------------------------------
   * Access states
   * ---------------------------------------------------------- */
  if (loadingAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <ShieldX className="mx-auto h-12 w-12 text-red-600" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Access denied</h1>
          <p className="mt-2 text-sm text-slate-600">
            Admin access is required to view this page.
          </p>
        </div>
      </div>
    );
  }

  /* ============================================================
   * Render
   * ============================================================ */
  return (
    <>
      <Head>
        <title>Users & Agents — Admin</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Admin
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Users & Agents
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage user accounts, roles, verification, and agent approvals.
            </p>
          </div>

          {activeTab === 'users' ? (
            <button
              type="button"
              onClick={() => fetchUsers()}
              disabled={refreshingUsers}
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshingUsers ? 'animate-spin' : ''} />
              Refresh
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fetchAgents()}
              disabled={loadingAgents}
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={14} className={loadingAgents ? 'animate-spin' : ''} />
              Refresh
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="inline-flex w-full rounded-full bg-slate-100 p-1 sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('users');
              router.replace('/admin/users', undefined, { shallow: true });
            }}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition sm:flex-none sm:px-5 ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Users
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === 'users'
                  ? 'bg-accent/10 text-accent'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {summary.total}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('agents');
              router.replace('/admin/users?tab=agents', undefined, { shallow: true });
            }}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition sm:flex-none sm:px-5 ${
              activeTab === 'agents'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Agents
            {agentStats.pending > 0 ? (
              <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-amber-900">
                {agentStats.pending}
              </span>
            ) : (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeTab === 'agents'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {agentStats.total}
              </span>
            )}
          </button>
        </div>

        {/* ============================================================
            USERS TAB
           ============================================================ */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
                label="Regular accounts"
                value={summary.regular}
                icon={UsersIcon}
                tone="blue"
                onClick={() => setFilterRole('regular')}
              />
              <StatCard
                label="Homeowners"
                value={summary.homeowners}
                icon={UsersIcon}
                tone="violet"
                onClick={() => setFilterRole('homeowner')}
              />
              <StatCard
                label="Tenants"
                value={summary.tenants}
                icon={UsersIcon}
                tone="blue"
                onClick={() => setFilterRole('tenant')}
              />
              <StatCard
                label="Advertisers"
                value={summary.advertisers}
                icon={UsersIcon}
                tone="amber"
                onClick={() => setFilterRole('advertiser')}
              />
              <StatCard
                label="Agents"
                value={summary.agents}
                icon={Building2}
                tone="emerald"
                onClick={() => setFilterRole('agent')}
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
                    <p className={labelClass}>Account type and access</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'all', label: 'All' },
                        { value: 'regular', label: 'Regular' },
                        { value: 'homeowner', label: 'Homeowners' },
                        { value: 'tenant', label: 'Tenants' },
                        { value: 'advertiser', label: 'Advertisers' },
                        { value: 'agent', label: 'Agents' },
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
            {!loadingUsers && (
              <p className="text-sm text-slate-500">
                Showing{' '}
                <strong className="text-slate-900">{filteredUsers.length}</strong> of{' '}
                {users.length} user{users.length === 1 ? '' : 's'}
              </p>
            )}

            {/* User list */}
            {loadingUsers ? (
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
                    pending={pendingUserId === u.id}
                    onCopy={copyToClipboard}
                    copied={copied}
                    onTogglePremium={() => setPremiumStatus(u, !isPremiumActive(u))}
                    onManage={() => setManageUser(u)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            AGENTS TAB
           ============================================================ */}
        {activeTab === 'agents' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <AgentStatCard
                label="Total agents"
                value={agentStats.total}
                icon={Building2}
                tone="accent"
              />
              <AgentStatCard
                label="Pending review"
                value={agentStats.pending}
                icon={Clock}
                tone="amber"
              />
              <AgentStatCard
                label="Approved"
                value={agentStats.approved}
                icon={CheckCircle2}
                tone="emerald"
              />
              <AgentStatCard
                label="Rejected"
                value={agentStats.rejected}
                icon={XCircle}
                tone="red"
              />
              <AgentStatCard
                label="Total profit"
                value={`J$${agentStats.totalProfit.toLocaleString()}`}
                icon={DollarSign}
                tone="emerald"
              />
            </div>

            {/* Plan pricing */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Agent plan pricing
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Prices appear on the agent upgrade page and are recorded when a plan is activated.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={saveAgentPlanPrices}
                  disabled={savingAgentPlanPrices}
                  className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60"
                >
                  {savingAgentPlanPrices ? 'Saving…' : 'Save prices'}
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ['7-day', '7-Day Access'],
                  ['30-day', '1 Month Access'],
                  ['90-day', '3 Month Access'],
                  ['free', 'Free Access'],
                ].map(([plan, label]) => (
                  <label key={plan} className="block">
                    <span className={labelClass}>{label} · JMD</span>
                    <input
                      type="number"
                      min={plan === 'free' ? 0 : 1}
                      step="1"
                      value={agentPlanPricesDraft[plan] ?? 0}
                      onChange={(event) =>
                        setAgentPlanPricesDraft((current) => ({
                          ...current,
                          [plan]: event.target.value,
                        }))
                      }
                      disabled={plan === 'free' || savingAgentPlanPrices}
                      className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-500`}
                    />
                  </label>
                ))}
              </div>
            </section>

            {/* Filter */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={labelClass + ' mb-0 mr-2'}>Filter</span>
                {['all', 'pending', 'approved', 'rejected'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setAgentFilterStatus(status)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                      agentFilterStatus === status
                        ? 'border-accent bg-accent text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-accent'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Agents table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {loadingAgents ? (
                <div className="space-y-3 p-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-xl border border-slate-100 bg-slate-50"
                    />
                  ))}
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="py-16 text-center">
                  <Building2 className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No agents found
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {agentFilterStatus !== 'all'
                      ? `No ${agentFilterStatus} agents`
                      : 'Create a test agent at /agent/signup'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Agent
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Business
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Experience
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Status
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Payment
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Submitted
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {filteredAgents.map((agent) => (
                        <tr
                          key={agent.id}
                          className={
                            agent.payment_receipt_status === 'pending'
                              ? 'border-b border-slate-100 bg-amber-50/60 hover:bg-amber-50'
                              : 'border-b border-slate-100 hover:bg-slate-50'
                          }
                        >
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {agent.user?.full_name}
                              </p>
                              <p className="flex items-center gap-1 text-xs text-slate-500">
                                <Mail className="h-3 w-3" />
                                {agent.user?.email}
                              </p>
                              <p className="flex items-center gap-1 text-xs text-slate-500">
                                <Phone className="h-3 w-3" />
                                {agent.user?.phone}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-900">
                              {agent.business_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              License: {agent.license_number || 'N/A'}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {agent.years_experience} years
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                agent.verification_status === 'approved'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : agent.verification_status === 'rejected'
                                  ? 'border-red-200 bg-red-50 text-red-700'
                                  : 'border-amber-200 bg-amber-50 text-amber-700'
                              }`}
                            >
                              {agent.verification_status === 'approved' && (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              {agent.verification_status === 'rejected' && (
                                <XCircle className="h-3 w-3" />
                              )}
                              {agent.verification_status === 'pending' && (
                                <Clock className="h-3 w-3" />
                              )}
                              {agent.verification_status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {agent.payment_receipt_status === 'pending' ? (
                              <div className="min-w-52 rounded-xl border border-amber-200 bg-amber-50 p-3">
                                <div className="flex items-center gap-2 text-amber-700">
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white">
                                    <Clock className="h-4 w-4" />
                                  </span>
                                  <span className="text-xs font-extrabold uppercase tracking-wider">
                                    Payment pending
                                  </span>
                                </div>
                                <p className="mt-2 text-sm font-bold text-slate-900">
                                  {agent.payment_receipt_plan === '7-day'
                                    ? '7-Day Access'
                                    : agent.payment_receipt_plan === '30-day'
                                    ? '1 Month Access'
                                    : agent.payment_receipt_plan === '90-day'
                                    ? '3 Month Access'
                                    : 'Paid access plan'}
                                  {agent.payment_receipt_amount != null &&
                                    ` · J$${Number(agent.payment_receipt_amount).toLocaleString()}`}
                                </p>
                                {agent.payment_receipt_submitted_at && (
                                  <p className="mt-1 text-[11px] text-amber-700">
                                    Submitted {new Date(agent.payment_receipt_submitted_at).toLocaleString()}
                                  </p>
                                )}
                                <button
                                  type="button"
                                  onClick={() => viewAgentDocuments(agent)}
                                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Review payment
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-wrap items-center gap-2">
                                  <select
                                    value={selectedPlans[agent.id] || '7-day'}
                                    onChange={(e) =>
                                      setSelectedPlans((prev) => ({
                                        ...prev,
                                        [agent.id]: e.target.value,
                                      }))
                                    }
                                    disabled={agent.verification_status !== 'approved'}
                                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:bg-slate-50 disabled:text-slate-500"
                                    title={
                                      agent.verification_status !== 'approved'
                                        ? 'Agent must be approved first'
                                        : 'Choose access plan'
                                    }
                                  >
                                    <option value="free">Free</option>
                                    <option value="7-day">7-Day</option>
                                    <option value="30-day">30-Day</option>
                                    <option value="90-day">90-Day</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPaymentPlan(
                                        agent.id,
                                        selectedPlans[agent.id] || '7-day',
                                        agent
                                      )
                                    }
                                    disabled={agent.verification_status !== 'approved'}
                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    title={
                                      agent.verification_status !== 'approved'
                                        ? 'Agent must be approved first'
                                        : 'Apply selected plan'
                                    }
                                  >
                                    Set Plan
                                  </button>
                                </div>
                                {agent.payment_amount && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Paid J${agent.payment_amount?.toLocaleString()}
                                  </p>
                                )}
                                {selectedPlans[agent.id] !== 'free' && (
                                  <p className="mt-1 text-xs font-medium text-slate-600">
                                    Plan price: J${Number(agentPlanPrices[selectedPlans[agent.id]] || 0).toLocaleString()}
                                  </p>
                                )}
                              </>
                            )}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {agent.verification_submitted_at
                                ? new Date(
                                    agent.verification_submitted_at
                                  ).toLocaleDateString()
                                : '—'}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => viewAgentDocuments(agent)}
                                className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {agent.verification_status === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateAgentStatus(agent.id, 'approved')
                                    }
                                    disabled={verifyingAgent}
                                    className="rounded-full p-2 text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                                    title="Approve"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateAgentStatus(agent.id, 'rejected')
                                    }
                                    disabled={verifyingAgent}
                                    className="rounded-full p-2 text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                                    title="Reject"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Manage user modal */}
      {manageUser && (
        <ManageUserModal
          user={manageUser}
          isPremiumActive={isPremiumActive(manageUser)}
          pending={pendingUserId === manageUser.id}
          onClose={() => setManageUser(null)}
          onSetStatus={(status) => setUserStatus(manageUser.id, status)}
          onSetIdVerification={(status) =>
            setIdVerificationStatus(manageUser.id, status)
          }
          onTogglePremium={() =>
            setPremiumStatus(manageUser, !isPremiumActive(manageUser))
          }
          onViewDocuments={() => viewUserDocuments(manageUser)}
          onSave={handleSaveUser}
          onDelete={() => handleDeleteUser(manageUser.id, manageUser.full_name)}
        />
      )}

      {/* ID documents modal (users) */}
      {docsUser && (
        <IdDocumentsModal
          user={docsUser}
          urls={userDocumentUrls}
          loading={loadingUserDocs}
          onClose={closeUserDocs}
          onApprove={() => {
            setIdVerificationStatus(docsUser.id, 'approved');
            closeUserDocs();
          }}
          onReject={() => {
            setIdVerificationStatus(docsUser.id, 'rejected');
            closeUserDocs();
          }}
        />
      )}

      {/* Agent Details modal */}
      {selectedAgent && (
        <AgentDetailsModal
          agent={selectedAgent}
          documentUrls={agentDocumentUrls}
          loadingDocs={loadingAgentDocs}
          verifying={verifyingAgent}
          onConfirmPayment={() => confirmAgentPayment(selectedAgent)}
          onRejectPayment={() => rejectAgentPaymentReceipt(selectedAgent)}
          onClose={() => {
            setSelectedAgent(null);
            setAgentDocumentUrls({});
          }}
          onApprove={() =>
            updateAgentStatus(
              selectedAgent.id,
              'approved',
              'Documents verified and approved'
            )
          }
          onReject={() => {
            const notes = prompt('Reason for rejection:');
            if (notes) updateAgentStatus(selectedAgent.id, 'rejected', notes);
          }}
        />
      )}
    </>
  );
}

/* ============================================================
 * Shared sub-components
 * ============================================================ */

const TONE_STYLES = {
  accent: { bg: 'bg-accent/10', text: 'text-accent' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600' },
  red: { bg: 'bg-red-50', text: 'text-red-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
};

function StatCard({ label, value, icon: Icon, tone = 'accent', onClick }) {
  const style = TONE_STYLES[tone] || TONE_STYLES.accent;
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-2xl border border-slate-200 bg-white p-5 text-left transition ${
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

function AgentStatCard({ label, value, icon: Icon, tone = 'accent' }) {
  const style = TONE_STYLES[tone] || TONE_STYLES.accent;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
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
    </div>
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
  const accountType = getAccountType(user);
  const role = getRoleStyle(accountType);
  const profileIntent = getProfileIntent(user);
  const status = getStatusStyle(user.account_status);
  const idVerification = getIdVerificationStyle(user.id_verification_status);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300">
      <div className="flex flex-col gap-4 p-5 sm:flex-row">
        <div className="flex shrink-0 items-start gap-3 sm:flex-col sm:items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
            {getInitials(user.full_name)}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-slate-900">
              {user.full_name || 'Unnamed user'}
            </h3>
            {hasAdminAccess(user) && (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getRoleStyle('admin').badge}`}>
                Admin
              </span>
            )}
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${role.badge}`}>
              {role.label}
            </span>
            {accountType === 'regular' && (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getRoleStyle(profileIntent).badge}`}>
                {getRoleStyle(profileIntent).label}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            {isPremiumActive && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <DollarSign size={10} />
                Paid
              </span>
            )}
          </div>

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

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
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
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
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
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
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
    account_type: getAccountType(user),
    profile_intent: getProfileIntent(user),
    is_admin: hasAdminAccess(user),
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
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
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
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <section>
            <p className={labelClass}>Account status</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSetStatus('active')}
                disabled={pending || currentStatus === 'active'}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                  currentStatus === 'active'
                    ? 'border-emerald-600 bg-emerald-600 text-white'
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
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                  currentStatus === 'flagged'
                    ? 'border-amber-600 bg-amber-600 text-white'
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
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                  currentStatus === 'deactivated'
                    ? 'border-red-600 bg-red-600 text-white'
                    : 'border-slate-200 bg-white text-red-700 hover:bg-red-50'
                }`}
              >
                <UserX size={12} />
                Deactivate
              </button>
            </div>
          </section>

          <section>
            <p className={labelClass}>Premium payment</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onTogglePremium}
                disabled={pending}
                className={`inline-flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                  isPremiumActive
                    ? 'border-red-200 text-red-700 hover:bg-red-50'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
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
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                  currentIdVerification === 'approved'
                    ? 'border-emerald-600 bg-emerald-600 text-white'
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
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                  currentIdVerification === 'rejected'
                    ? 'border-red-600 bg-red-600 text-white'
                    : 'border-slate-200 bg-white text-red-700 hover:bg-red-50'
                }`}
              >
                <Ban size={12} />
                Reject
              </button>
            </div>
          </section>

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
              <label className={labelClass}>Account type</label>
              <select
                value={form.account_type}
                onChange={(e) => setForm({ ...form, account_type: e.target.value })}
                className={inputClass}
              >
                <option value="regular">Regular</option>
                <option value="advertiser">Advertiser</option>
                <option value="agent">Agent</option>
              </select>
            </div>

            {form.account_type === 'regular' && (
              <div>
                <label className={labelClass}>Regular profile</label>
                <select
                  value={form.profile_intent}
                  onChange={(e) => setForm({ ...form, profile_intent: e.target.value })}
                  className={inputClass}
                >
                  <option value="homeowner">Homeowner</option>
                  <option value="tenant">Tenant</option>
                </select>
              </div>
            )}

            <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.is_admin}
                onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
              />
              Admin access (in addition to account type)
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60"
              >
                {pending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>

          <div className="border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
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
 * ID documents modal (users)
 * ============================================================ */

function IdDocumentsModal({ user, urls, loading, onClose, onApprove, onReject }) {
  const hasAny = urls.front || urls.back;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white sm:max-w-3xl sm:rounded-2xl"
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
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
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
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
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

/* ============================================================
 * Agent Details modal
 * ============================================================ */

function AgentDetailsModal({
  agent,
  documentUrls,
  loadingDocs,
  verifying,
  onConfirmPayment,
  onRejectPayment,
  onClose,
  onApprove,
  onReject,
}) {
  const serviceAreas = agent.service_areas?.toLowerCase() || '';
  const isPremiumParish = [
    'kingston',
    'st. andrew',
    'st andrew',
    'st. catherine',
    'st catherine',
  ].some((parish) => serviceAreas.includes(parish));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white sm:max-w-4xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">Agent Details</h2>
            <p className="mt-0.5 truncate text-sm text-slate-600">
              {agent.user?.full_name || agent.user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          {/* Personal Info */}
          <section>
            <h3 className="mb-3 text-sm font-bold text-slate-900">
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Name:</span>
                <p className="font-medium text-slate-900">
                  {agent.user?.full_name}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Email:</span>
                <p className="font-medium text-slate-900">
                  {agent.user?.email}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Phone:</span>
                <p className="font-medium text-slate-900">
                  {agent.user?.phone}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Status:</span>
                <p className="font-medium capitalize text-slate-900">
                  {agent.verification_status}
                </p>
              </div>
            </div>
          </section>

          {/* Business Info */}
          <section>
            <h3 className="mb-3 text-sm font-bold text-slate-900">
              Business Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Business Name:</span>
                <p className="font-medium text-slate-900">{agent.business_name}</p>
              </div>
              <div>
                <span className="text-slate-500">Years Experience:</span>
                <p className="font-medium text-slate-900">
                  {agent.years_experience} years
                </p>
              </div>
              <div>
                <span className="text-slate-500">License Number:</span>
                <p className="font-medium text-slate-900">
                  {agent.license_number || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Deals Closed:</span>
                <p className="font-medium text-slate-900">
                  {agent.deals_closed_count}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Service Areas:</span>
                <p className="font-medium text-slate-900">
                  {agent.service_areas || 'N/A'}
                  {isPremiumParish && (
                    <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      Premium Parish
                    </span>
                  )}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Specializations:</span>
                <p className="font-medium text-slate-900">
                  {Array.isArray(agent.specializations)
                    ? agent.specializations.join(', ')
                    : agent.specializations || 'N/A'}
                </p>
              </div>
              {agent.about_me && (
                <div className="col-span-2">
                  <span className="text-slate-500">About:</span>
                  <p className="font-medium text-slate-900">{agent.about_me}</p>
                </div>
              )}
            </div>
          </section>

          {/* Payment Information */}
          <section>
            <h3 className="mb-3 text-sm font-bold text-slate-900">
              Payment & Access
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Access Plan:</span>
                <p className="font-medium text-slate-900">
                  {agent.payment_status === 'free' && '🆓 Free Access'}
                  {agent.payment_status === '7-day' && '⚡ 7-Day Access'}
                  {agent.payment_status === '30-day' && '🔁 30-Day Access'}
                  {agent.payment_status === '90-day' && '🔒 90-Day Access'}
                  {!['free', '7-day', '30-day', '90-day'].includes(
                    agent.payment_status
                  ) && (agent.payment_status || 'None')}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Amount Paid:</span>
                <p className="font-medium text-slate-900">
                  {agent.payment_amount
                    ? `J$${agent.payment_amount.toLocaleString()}`
                    : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Payment Date:</span>
                <p className="font-medium text-slate-900">
                  {agent.payment_date
                    ? new Date(agent.payment_date).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Access Expires:</span>
                <p className="font-medium text-slate-900">
                  {agent.access_expiry
                    ? new Date(agent.access_expiry).toLocaleDateString()
                    : agent.payment_status === 'free'
                    ? 'Never (Free Tier)'
                    : 'N/A'}
                </p>
              </div>
              {agent.payment_receipt_submitted_at && (
                <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">
                    Payment receipt · {agent.payment_receipt_status || 'pending'}
                  </p>
                  <p className="mt-1 text-slate-600">
                    {agent.payment_receipt_plan || 'Plan not recorded'}
                    {agent.payment_receipt_amount != null &&
                      ` · J$${Number(agent.payment_receipt_amount).toLocaleString()}`}
                    {` · submitted ${new Date(agent.payment_receipt_submitted_at).toLocaleString()}`}
                  </p>
                  {agent.payment_receipt_url ? (
                    <a
                      href={agent.payment_receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block"
                    >
                      <img
                        src={agent.payment_receipt_url}
                        alt="Agent bank transfer receipt"
                        className="max-h-80 w-full rounded-xl border border-slate-200 bg-white object-contain"
                      />
                      <span className="mt-2 inline-block text-xs font-semibold text-accent">
                        Open receipt image
                      </span>
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-red-700">
                      Receipt image is unavailable. Refresh the agent list or check the private storage bucket.
                    </p>
                  )}
                  {agent.payment_receipt_status === 'pending' && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={onConfirmPayment}
                        disabled={verifying}
                        className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
                      >
                        Confirm payment &amp; activate plan
                      </button>
                      <button
                        type="button"
                        onClick={onRejectPayment}
                        disabled={verifying}
                        className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                      >
                        Reject receipt
                      </button>
                    </div>
                  )}
                </div>
              )}
              {agent.last_request_assigned_at && (
                <div className="col-span-2">
                  <span className="text-slate-500">Last Request Assigned:</span>
                  <p className="font-medium text-slate-900">
                    {new Date(agent.last_request_assigned_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Documents */}
          <section>
            <h3 className="mb-3 text-sm font-bold text-slate-900">
              Verification Documents
            </h3>

            {loadingDocs ? (
              <div className="py-8 text-center">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                <p className="mt-2 text-sm text-slate-500">Loading documents…</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {(documentUrls.license || agent.license_file_url) && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      Agent License
                    </p>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <img
                        src={documentUrls.license || agent.license_file_url}
                        alt="Agent License"
                        className="h-auto w-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden h-64 items-center justify-center bg-slate-100">
                        <div className="text-center text-slate-500">
                          <FileText className="mx-auto mb-2 h-12 w-12 text-slate-400" />
                          <p className="text-sm">Unable to load document</p>
                          <a
                            href={
                              documentUrls.license || agent.license_file_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs font-semibold text-accent hover:underline"
                          >
                            Try opening directly
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {(documentUrls.registration || agent.registration_file_url) && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      Business Registration / Gov ID
                    </p>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <img
                        src={documentUrls.registration || agent.registration_file_url}
                        alt="Business Registration"
                        className="h-auto w-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden h-64 items-center justify-center bg-slate-100">
                        <div className="text-center text-slate-500">
                          <FileText className="mx-auto mb-2 h-12 w-12 text-slate-400" />
                          <p className="text-sm">Unable to load document</p>
                          <a
                            href={
                              documentUrls.registration ||
                              agent.registration_file_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs font-semibold text-accent hover:underline"
                          >
                            Try opening directly
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {!agent.license_file_url && !agent.registration_file_url && (
                  <div className="col-span-2 py-8 text-center text-slate-500">
                    <FileText className="mx-auto mb-2 h-12 w-12 text-slate-400" />
                    <p>No verification documents uploaded</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {agent.verification_notes && (
            <section>
              <h3 className="mb-3 text-sm font-bold text-slate-900">
                Admin Notes
              </h3>
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {agent.verification_notes}
              </p>
            </section>
          )}

          {agent.verification_status === 'pending' && (
            <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onApprove}
                disabled={verifying}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
              >
                <CheckCircle2 className="h-5 w-5" />
                Approve Agent
              </button>
              <button
                type="button"
                onClick={onReject}
                disabled={verifying}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              >
                <XCircle className="h-5 w-5" />
                Reject Agent
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}