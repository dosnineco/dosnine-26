import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import Head from 'next/head';
import toast from 'react-hot-toast';

export default function RequestsManagementPage() {
  const { isSignedIn, user } = useUser();
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
        const userEmail = user.emailAddresses?.[0]?.emailAddress;
        
        // Query database to check if user is admin
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('email', userEmail)
          .single();

        if (error || !data) {
          console.error('Error fetching user role:', error);
          toast.error('You do not have admin access');
          router.push('/');
          return;
        }

        if (data.role !== 'admin') {
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
      fetchAgents();
    }
  }, [isAdmin, loading]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      toast.error('Failed to load requests');
    }
  };

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('id, name, email')
        .order('name');

      if (error) throw error;
      setAgents(data || []);
    } catch (err) {
      console.error('Error fetching agents:', err);
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
      const updates = Array.from(selectedRequests).map(id => ({
        id,
        assigned_agent_id: selectedAgent,
        status: 'assigned',
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        await supabase
          .from('service_requests')
          .update(update)
          .eq('id', update.id);
      }

      toast.success(`Assigned ${updates.length} requests to agent`);
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
      const updates = Array.from(selectedRequests).map(id => ({
        id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        await supabase
          .from('service_requests')
          .update(update)
          .eq('id', update.id);
      }

      toast.success(`Marked ${updates.length} requests as completed`);
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
      const updates = Array.from(selectedRequests).map(id => ({
        id,
        status: 'open',
        completed_at: null,
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        await supabase
          .from('service_requests')
          .update(update)
          .eq('id', update.id);
      }

      toast.success(`Marked ${updates.length} requests as incomplete`);
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
      const updates = Array.from(selectedRequests).map(id => ({
        id,
        assigned_agent_id: null,
        status: 'open',
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        await supabase
          .from('service_requests')
          .update(update)
          .eq('id', update.id);
      }

      toast.success(`Unassigned ${updates.length} requests to queue`);
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
      const updates = Array.from(selectedRequests).map(id => ({
        id,
        status: 'open',
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        await supabase
          .from('service_requests')
          .update(update)
          .eq('id', update.id);
      }

      toast.success(`Reactivated ${updates.length} requests`);
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
      for (const id of selectedRequests) {
        await supabase
          .from('service_requests')
          .delete()
          .eq('id', id);
      }

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
      const updates = Array.from(selectedRequests).map(id => ({
        id,
        contacted: true,
        contacted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        await supabase
          .from('service_requests')
          .update(update)
          .eq('id', update.id);
      }

      toast.success(`Marked ${updates.length} requests as contacted`);
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
      const updates = Array.from(selectedRequests).map(id => ({
        id,
        contacted: false,
        contacted_at: null,
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        await supabase
          .from('service_requests')
          .update(update)
          .eq('id', update.id);
      }

      toast.success(`Marked ${updates.length} requests as uncontacted`);
      setSelectedRequests(new Set());
      fetchRequests();
    } catch (err) {
      console.error('Error marking uncontacted:', err);
      toast.error('Failed to update requests');
    } finally {
      setBulkActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
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

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">Service Requests Management</h1>
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Back to Admin
              </button>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Date</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(filterDate || searchQuery || statusFilter !== 'all') && (
              <div className="mt-3">
                <button
                  onClick={() => {
                    setFilterDate('');
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Bulk Actions Bar */}
          {selectedCount > 0 && (
            <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm font-medium text-gray-900">
                  {selectedCount} request{selectedCount !== 1 ? 's' : ''} selected
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setShowAssignModal(true)}
                    disabled={bulkActionLoading}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Assign to Agent
                  </button>

                  <button
                    onClick={bulkMarkCompleted}
                    disabled={bulkActionLoading}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Mark Completed
                  </button>

                  <button
                    onClick={bulkMarkIncomplete}
                    disabled={bulkActionLoading}
                    className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                  >
                    Mark Incomplete
                  </button>

                  <button
                    onClick={bulkUnassignToQueue}
                    disabled={bulkActionLoading}
                    className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    title="Admin only: unassign to queue"
                  >
                    Unassign to Queue
                  </button>

                  <button
                    onClick={bulkReactivate}
                    disabled={bulkActionLoading}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Reactivate
                  </button>

                  <button
                    onClick={bulkMarkContacted}
                    disabled={bulkActionLoading}
                    className="px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                  >
                    Mark Contacted
                  </button>

                  <button
                    onClick={bulkMarkUncontacted}
                    disabled={bulkActionLoading}
                    className="px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50"
                  >
                    Mark Uncontacted
                  </button>

                  <button
                    onClick={bulkDelete}
                    disabled={bulkActionLoading}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>

                  <button
                    onClick={() => setSelectedRequests(new Set())}
                    disabled={bulkActionLoading}
                    className="px-4 py-2 bg-gray-300 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-400 disabled:opacity-50"
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
              <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Assign to Agent</h2>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Agent
                  </label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={bulkAssignAgent}
                    disabled={!selectedAgent || bulkActionLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
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
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500 text-lg">No requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
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
                          request.contacted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {request.contacted ? '✓ Contacted' : '✗ Not Contacted'}
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
    </>
  );
}
