import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import AdminLayout from '../../components/AdminLayout';
import toast from 'react-hot-toast';
import { FiEdit2, FiTrash2, FiRefreshCw, FiX } from 'react-icons/fi';
import { Users as UsersIcon, ShieldCheck, Flag, Ban, IdCard, Download, Settings } from 'lucide-react';

export default function AdminUsersPage() {
  const { user } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [docsUser, setDocsUser] = useState(null);
  const [documentUrls, setDocumentUrls] = useState({});
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'tenant'
  });

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const buildAuthHeaders = () => {
    const headers = {};
    if (user?.id) headers['x-clerk-user-id'] = user.id;
    const primaryEmail = user?.emailAddresses?.[0]?.emailAddress || user?.primaryEmailAddress?.emailAddress || '';
    if (primaryEmail) headers['x-clerk-user-email'] = primaryEmail;
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    if (fullName) headers['x-clerk-user-name'] = fullName;
    return headers;
  };

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
        fetchUsers();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
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
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (userToEdit) => {
    if (!userToEdit) return;

    setEditingUser(userToEdit);
    setFormData({
      full_name: userToEdit.full_name || '',
      email: userToEdit.email || '',
      phone: userToEdit.phone || '',
      role: userToEdit.role || 'tenant'
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      role: 'tenant'
    });
  };

  const setUserStatus = async (userId, status) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({ id: userId, account_status: status }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to update status');
      toast.success(`User ${status}`);
      await fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const setIdVerificationStatus = async (userId, status) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({ id: userId, id_verification_status: status }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to update ID verification');
      toast.success(`ID verification ${status}`);
      await fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to update ID verification');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // SECURITY FIX: Validate all required fields
    const trimmedName = formData.full_name?.trim() || '';
    const trimmedEmail = formData.email?.trim() || '';

    if (!trimmedName) {
      toast.error('User name is required and cannot be empty');
      return;
    }

    if (!trimmedEmail) {
      toast.error('Email address is required and cannot be empty');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      if (editingUser) {
        const response = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
          credentials: 'include',
          body: JSON.stringify({
            id: editingUser.id,
            full_name: trimmedName,
            email: trimmedEmail,
            phone: formData.phone?.trim() || null,
            role: formData.role,
          }),
        });
        const payload = await response.json();

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to update user');
        }

        toast.success('User updated successfully!');
      } else {
        // SECURITY FIX: Creating users manually should not be allowed
        // Users should only be created through Clerk authentication
        toast.error('❌ Manual user creation is disabled for security. Users must sign up through authentication.');
        return;
      }

      handleCloseModal();
      await fetchUsers();
    } catch (err) {
      console.error('User save error:', err);
      
      // Check for specific database errors
      if (err.message?.includes('duplicate') || err.message?.includes('email')) {
        toast.error('❌ Email already exists. Please use a different email address.');
      } else if (err.message?.includes('not-null')) {
        toast.error('❌ Name and email cannot be empty');
      } else {
        toast.error(err.message || 'Failed to save user');
      }
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!confirm(`⚠️ DELETE user "${userName}"?\n\nThis action cannot be undone!`)) return;

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

      toast.success('User deleted successfully!');
      await fetchUsers();
    } catch (err) {
      toast.error(err?.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter((u) => {
    const statusMatch = filterStatus === 'all' || (u.account_status || 'active') === filterStatus;
    const roleMatch = filterRole === 'all' || (u.role || 'tenant') === filterRole;
    return statusMatch && roleMatch;
  });

  function isPremiumActive(u) {
    return Boolean(u.premium_service_request) && u.premium_service_request_expires && new Date(u.premium_service_request_expires) > new Date();
  }

  const viewIdDocuments = (u) => {
    setDocsUser(u);
    loadIdDocumentUrls(u);
  };

  const resolveDocumentUrl = async (rawPath) => {
    let path = rawPath;
    if (path.includes('agent-documents/')) {
      path = path.split('agent-documents/')[1].split('?')[0];
    }
    const response = await fetch(`/api/admin/agents/get-document?path=${encodeURIComponent(path)}`, {
      headers: buildAuthHeaders(),
      credentials: 'include',
    });
    const payload = await response.json();
    if (!response.ok || !payload?.signedUrl) throw new Error(payload?.error || 'Failed to load document');
    return payload.signedUrl;
  };

  const loadIdDocumentUrls = async (u) => {
    if (!u.verification_front_url && !u.verification_back_url) return;

    setLoadingDocs(true);
    const urls = {};

    try {
      if (u.verification_front_url) {
        try {
          urls.front = await resolveDocumentUrl(u.verification_front_url);
        } catch (err) {
          urls.front = u.verification_front_url;
        }
      }
      if (u.verification_back_url) {
        try {
          urls.back = await resolveDocumentUrl(u.verification_back_url);
        } catch (err) {
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

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Users — Admin Dashboard</title>
      </Head>
      <AdminLayout />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
                <UsersIcon className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg border p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Admins</p>
                  <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'admin').length}</p>
                </div>
                <ShieldCheck className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFilterRole('landlord')}
              className="bg-white rounded-lg border p-5 text-left hover:border-accent transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Homeowners</p>
                  <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'landlord').length}</p>
                </div>
                <UsersIcon className="w-8 h-8 text-gray-400" />
              </div>
            </button>

            <div className="bg-white rounded-lg border p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Tenants</p>
                  <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'tenant').length}</p>
                </div>
                <UsersIcon className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-green-50 rounded-lg border border-green-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Paid J$6,000 Fee</p>
                  <p className="text-2xl font-bold text-green-900">
                    {users.filter(u => isPremiumActive(u)).length}
                  </p>
                </div>
                <ShieldCheck className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border p-3 mb-6 flex items-center justify-between flex-wrap gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-gray-700">Role:</span>
                {[
                  { value: 'all', label: 'All' },
                  { value: 'landlord', label: 'Homeowners' },
                  { value: 'tenant', label: 'Tenants' },
                  { value: 'admin', label: 'Admins' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setFilterRole(value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      filterRole === value
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                {['all', 'active', 'flagged', 'deactivated'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition capitalize ${
                      filterStatus === status
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={fetchUsers}
              className="flex items-center gap-2 px-4 py-2 btn-accent text-white rounded-lg transition-colors"
            >
              <FiRefreshCw size={18} />
              Refresh
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg border overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Account Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ID Verification</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Payment</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Joined</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900">{u.full_name || 'No name'}</p>
                          <p className="text-sm text-gray-500">{u.email}</p>
                          {u.phone && <p className="text-sm text-gray-500">{u.phone}</p>}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            u.role === 'admin' ? 'bg-gray-800 text-white' :
                            u.role === 'landlord' ? 'bg-gray-200 text-gray-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            (u.account_status || 'active') === 'deactivated' ? 'bg-red-100 text-red-800' :
                            (u.account_status || 'active') === 'flagged' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {(u.account_status || 'active').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700 capitalize">
                          {(u.id_verification_status || 'unverified').replace(/_/g, ' ')}
                        </td>
                        <td className="px-5 py-4">
                          {isPremiumActive(u) ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Paid J$6,000
                              </span>
                              <p className="text-xs text-gray-500 mt-1">
                                Expires {new Date(u.premium_service_request_expires).toLocaleDateString()}
                              </p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              Not paid
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => handleOpenModal(u)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-gray-900 text-white hover:bg-black"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ID Documents Modal */}
      {docsUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">ID Uploads</h2>
                <p className="text-sm text-gray-500">{docsUser.full_name || docsUser.email}</p>
              </div>
              <button onClick={closeDocsModal} className="text-gray-400 hover:text-gray-600">
                <FiX size={24} />
              </button>
            </div>

            <div className="p-6">
              {loadingDocs ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading documents...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'front', label: 'Front of ID' },
                    { key: 'back', label: 'Back of ID' },
                  ].map(({ key, label }) => {
                    const url = documentUrls[key];
                    if (!url) return null;
                    return (
                      <div key={key}>
                        <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                          <img src={url} alt={label} className="w-full h-auto object-contain" />
                        </div>
                        <a
                          href={url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent/80"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                      </div>
                    );
                  })}
                  {!documentUrls.front && !documentUrls.back && (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                      <IdCard className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No ID documents uploaded</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {docsUser.id_verification_status === 'pending' && (
              <div className="flex items-center gap-3 p-6 border-t">
                <button
                  onClick={() => {
                    setIdVerificationStatus(docsUser.id, 'approved');
                    closeDocsModal();
                  }}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-medium"
                >
                  <ShieldCheck className="w-5 h-5" />
                  Approve ID
                </button>
                <button
                  onClick={() => {
                    setIdVerificationStatus(docsUser.id, 'rejected');
                    closeDocsModal();
                  }}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 font-medium"
                >
                  <Ban className="w-5 h-5" />
                  Reject ID
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Manage User
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={24} />
              </button>
            </div>

            {editingUser && (
              <div className="mb-5 space-y-4 border-b pb-5">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Account Status</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setUserStatus(editingUser.id, 'active')}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200"
                    >
                      Activate
                    </button>
                    <button
                      onClick={() => setUserStatus(editingUser.id, 'flagged')}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                    >
                      Flag
                    </button>
                    <button
                      onClick={() => setUserStatus(editingUser.id, 'deactivated')}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    ID Verification ({(editingUser.id_verification_status || 'unverified').replace(/_/g, ' ')})
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(editingUser.verification_front_url || editingUser.verification_back_url) && (
                      <button
                        onClick={() => viewIdDocuments(editingUser)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20"
                      >
                        <IdCard className="w-3.5 h-3.5" />
                        View ID
                      </button>
                    )}
                    <button
                      onClick={() => setIdVerificationStatus(editingUser.id, 'approved')}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setIdVerificationStatus(editingUser.id, 'rejected')}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  required
                >
                  <option value="tenant">Tenant</option>
                  <option value="landlord">Landlord</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 btn-accent text-white rounded-lg font-medium"
                >
                  Update
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleCloseModal();
                  handleDelete(editingUser.id, editingUser.full_name);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium"
              >
                <FiTrash2 size={16} />
                Delete User
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
