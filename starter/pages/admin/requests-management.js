import React, { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';

export default function RequestsManagementPage() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data and UI State
  const [requests, setRequests] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedRequests, setSelectedRequests] = useState(new Set());
  const [filterDate, setFilterDate] = useState('');
  const [sortBy, setSortBy] = useState('edited-desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  /* Check admin access via database */
  useEffect(() => {
    const checkAdmin = async () => {
      if (!isSignedIn || !user) {
        router.push('/');
        return;
      }

      try {
        const verifyResponse = await fetch('/api/admin/verify-admin');
        const verifyPayload = await verifyResponse.json();

        if (!verifyResponse.ok || !verifyPayload?.isAdmin) {
          toast.error('You do not have admin access');
          router.push('/');
          return;
        }

        setIsAdmin(true);
        setLoading(false);
      } catch (err) {
        console.error('Admin check error:', err);
        toast.error('Failed to verify admin access');
        router.push('/');
      }
    };

    checkAdmin();
  }, [isSignedIn, user]);

  /* Fetch requests and agents */
  useEffect(() => {
    if (isAdmin && !loading) {
      fetchRequests();
    }
  }, [isAdmin, loading]);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/admin/requests-management');
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load requests');
      }

      setRequests(payload.requests || []);
      setAgents(payload.agents || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      toast.error('Failed to load requests');
    }
  };

  const runBulkAction = async (action, extra = {}) => {
    const token = await getToken();
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const ids = Array.from(selectedRequests);
    const response = await fetch('/api/admin/requests-management', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ action, ids, ...extra }),
    });
    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || 'Bulk action failed');
    }
  };



  /* Filter and Sort Logic */
  const getFilteredRequests = () => {
    let filtered = [...requests];

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(r => r.status !== 'deleted' && r.status !== 'completed');
    } else if (statusFilter === 'completed') {
      filtered = filtered.filter(r => r.status === 'completed');
    } else if (statusFilter === 'open') {
      filtered = filtered.filter(r => r.status === 'open');
    }

    // Date filter - compare date strings (YYYY-MM-DD format)
    if (filterDate) {
      filtered = filtered.filter(r => {
        if (!r.updated_at) return false;
        const requestDateStr = r.updated_at.split('T')[0]; // Get YYYY-MM-DD
        return requestDateStr === filterDate;
      });
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.client_name?.toLowerCase().includes(q) ||
        r.client_email?.toLowerCase().includes(q) ||
        r.client_phone?.includes(q) ||
        r.location?.toLowerCase().includes(q)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'edited-desc':
          return new Date(b.updated_at) - new Date(a.updated_at);
        case 'edited-asc':
          return new Date(a.updated_at) - new Date(b.updated_at);
        case 'created-desc':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'created-asc':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'name':
          return (a.client_name || '').localeCompare(b.client_name || '');
        default:
          return 0;
      }
    });

    return filtered;
  };

  /* Selection Handlers */
  const toggleSelectRequest = (id) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRequests(newSelected);
  };

  const toggleSelectAll = () => {
    const filtered = getFilteredRequests();
    if (selectedRequests.size === filtered.length && filtered.length > 0) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(filtered.map(r => r.id)));
    }
  };

  /* Bulk Actions */
  const bulkAssignAgent = async () => {
    if (!selectedAgent) {
      toast.error('Please select an agent');
      return;
    }

    setBulkActionLoading(true);
    try {
      await runBulkAction('assign', { agentId: selectedAgent });

      toast.success(`Assigned ${selectedRequests.size} requests to agent`);
      setSelectedRequests(new Set());
      setShowAssignModal(false);
      setSelectedAgent('');
      fetchRequests();
    } catch (err) {
      console.error('Error assigning:', err);
      toast.error('Failed to assign requests');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkMarkCompleted = async () => {
    setBulkActionLoading(true);
    try {
      await runBulkAction('complete');

      toast.success(`Marked ${selectedRequests.size} requests as completed`);
      setSelectedRequests(new Set());
      fetchRequests();
    } catch (err) {
      console.error('Error marking completed:', err);
      toast.error('Failed to update requests');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkMarkIncomplete = async () => {
    setBulkActionLoading(true);
    try {
      await runBulkAction('incomplete');

      toast.success(`Marked ${selectedRequests.size} requests as incomplete`);
      setSelectedRequests(new Set());
      fetchRequests();
    } catch (err) {
      console.error('Error marking incomplete:', err);
      toast.error('Failed to update requests');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkUnassignToQueue = async () => {
    setBulkActionLoading(true);
    try {
      await runBulkAction('unassign');

      toast.success(`Unassigned ${selectedRequests.size} requests to queue`);
      setSelectedRequests(new Set());
      fetchRequests();
    } catch (err) {
      console.error('Error unassigning:', err);
      toast.error('Failed to unassign requests');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkReactivate = async () => {
    setBulkActionLoading(true);
    try {
      await runBulkAction('reactivate');

      toast.success(`Reactivated ${selectedRequests.size} requests`);
      setSelectedRequests(new Set());
      fetchRequests();
    } catch (err) {
      console.error('Error reactivating:', err);
      toast.error('Failed to reactivate requests');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedRequests.size} requests? This cannot be undone.`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      await runBulkAction('delete');

      toast.success(`Deleted ${selectedRequests.size} requests`);
      setSelectedRequests(new Set());
      fetchRequests();
    } catch (err) {
      console.error('Error deleting:', err);
      toast.error('Failed to delete requests');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkMarkContacted = async () => {
    setBulkActionLoading(true);
    try {
      await runBulkAction('contacted');

      toast.success(`Marked ${selectedRequests.size} requests as contacted`);
      setSelectedRequests(new Set());
      fetchRequests();
    } catch (err) {
      console.error('Error marking contacted:', err);
      toast.error('Failed to update requests');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkMarkUncontacted = async () => {
    setBulkActionLoading(true);
    try {
      await runBulkAction('uncontacted');

      toast.success(`Marked ${selectedRequests.size} requests as uncontacted`);
      setSelectedRequests(new Set());
      fetchRequests();
    } catch (err) {
      console.error('Error marking uncontacted:', err);
      toast.error('Failed to update requests');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkRemoveComments = async () => {
    if (!window.confirm(`Remove comments from ${selectedRequests.size} requests?`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      await runBulkAction('remove-comments');

      toast.success(`Removed comments from ${selectedRequests.size} requests`);
      setSelectedRequests(new Set());
      fetchRequests();
    } catch (err) {
      console.error('Error removing comments:', err);
      toast.error('Failed to remove comments');
    } finally {
      setBulkActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const filteredRequests = getFilteredRequests();
  const selectedCount = selectedRequests.size;

  return (
    <>
      <Head>
        <title>Requests Management - DoSnine Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-100 pb-8">
        <AdminLayout />
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-xl p-4 sm:p-6">
            <div className="mb-4">
              <h1 className="text-xl font-bold text-gray-900">Manage Requests</h1>
              <p className="text-sm text-gray-600">Bulk manage request status, contact state, and assignment.</p>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name, email, phone, location..."
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Date</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  <option value="edited-desc">Edited (Newest)</option>
                  <option value="edited-asc">Edited (Oldest)</option>
                  <option value="created-desc">Created (Newest)</option>
                  <option value="created-asc">Created (Oldest)</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>



          {/* Bulk Actions Bar */}
            {selectedCount > 0 && (
            <div className="mt-6 mb-6 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm font-medium text-gray-900">
                  {selectedCount} request{selectedCount !== 1 ? 's' : ''} selected
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setShowAssignModal(true)}
                    disabled={bulkActionLoading || agents.length === 0}
                    className="btn-primary btn-sm disabled:opacity-50"
                  >
                    Assign Agent
                  </button>

                  <button
                    onClick={bulkMarkCompleted}
                    disabled={bulkActionLoading}
                    className="btn-secondary btn-sm disabled:opacity-50"
                  >
                    Mark Completed
                  </button>

                  <button
                    onClick={bulkMarkIncomplete}
                    disabled={bulkActionLoading}
                    className="btn-secondary btn-sm disabled:opacity-50"
                  >
                    Mark Incomplete
                  </button>

                  <button
                    onClick={bulkUnassignToQueue}
                    disabled={bulkActionLoading}
                    className="btn-secondary btn-sm disabled:opacity-50"
                    title="Admin only: unassign to queue"
                  >
                    Unassign to Queue
                  </button>

                  <button
                    onClick={bulkReactivate}
                    disabled={bulkActionLoading}
                    className="btn-secondary btn-sm disabled:opacity-50"
                  >
                    Reactivate
                  </button>

                  <button
                    onClick={bulkMarkContacted}
                    disabled={bulkActionLoading}
                    className="btn-secondary btn-sm disabled:opacity-50"
                  >
                    Mark Contacted
                  </button>

                  <button
                    onClick={bulkMarkUncontacted}
                    disabled={bulkActionLoading}
                    className="btn-secondary btn-sm disabled:opacity-50"
                  >
                    Mark Uncontacted
                  </button>

                  <button
                    onClick={bulkRemoveComments}
                    disabled={bulkActionLoading}
                    className="btn-secondary btn-sm disabled:opacity-50"
                  >
                    Remove Comments
                  </button>

                  <button
                    onClick={bulkDelete}
                    disabled={bulkActionLoading}
                    className="btn-primary btn-sm disabled:opacity-50"
                  >
                    Delete
                  </button>

                  <button
                    onClick={() => setSelectedRequests(new Set())}
                    disabled={bulkActionLoading}
                    className="btn-secondary btn-sm disabled:opacity-50"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Assign Modal */}
          {showAssignModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-100 rounded-lg max-w-md w-full p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Assign to Agent</h2>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Agent
                  </label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    <option value="">-- Select an agent --</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={bulkAssignAgent}
                    disabled={!selectedAgent || bulkActionLoading}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {bulkActionLoading ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="text-sm text-gray-600 mb-4">
            Showing {filteredRequests.length} of {requests.length} requests
          </div>

          {/* Requests Table */}
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-lg">No requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-gray-50 rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-100">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedCount === filteredRequests.length && filteredRequests.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Client</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Request Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Location</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Contacted</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Agent</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Edited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRequests.has(request.id)}
                          onChange={() => toggleSelectRequest(request.id)}
                          className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">{request.client_name}</div>
                        <div className="text-gray-500 text-xs">{request.request_type}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="text-gray-900">{request.client_email}</div>
                        <div className="text-gray-500">{request.client_phone}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {request.request_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{request.location}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          request.status === 'completed' ? 'bg-green-100 text-green-800' :
                          request.status === 'assigned' ? 'bg-purple-100 text-purple-800' :
                          request.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          request.is_contacted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {request.is_contacted ? '✓ Contacted' : '✗ Not Contacted'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {request.assigned_agent_id ? (
                          <span className="text-blue-600">Assigned</span>
                        ) : (
                          <span className="text-gray-500">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(request.updated_at).toLocaleDateString()}
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
    </>
    
  );
}
