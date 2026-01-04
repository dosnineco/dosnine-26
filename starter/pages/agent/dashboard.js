import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import RequestNotificationPopup from '../../components/RequestNotificationPopup';
import AgentFeedbackPopup from '../../components/AgentFeedbackPopup';
import VerifiedBadge from '../../components/VerifiedBadge';
import { useRoleProtection } from '../../lib/useRoleProtection';
import { isVerifiedAgent } from '../../lib/rbac';
import { supabase } from '../../lib/supabase';
import { 
  Home, Users, Mail, Phone, MapPin, DollarSign, 
  Bed, Bath, Calendar, Filter, CheckCircle, XCircle,
  AlertCircle, Clock, Plus, RotateCcw, Trash2, BellDot
} from 'lucide-react';

export default function AgentDashboard() {
  // Protect route - only verified agents can access
  const { loading: authLoading, userData: initialUserData } = useRoleProtection({
    checkAccess: isVerifiedAgent,
    redirectTo: '/dashboard',
    message: 'Agent verification required'
  });

  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [agentData, setAgentData] = useState(initialUserData?.agent || null);
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [queueCount, setQueueCount] = useState(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [paidAgentCount, setPaidAgentCount] = useState(null);
  const [paidAgentLoading, setPaidAgentLoading] = useState(true);

  useEffect(() => {
    if (initialUserData) {
      
      setAgentData(initialUserData.agent);
      
      // Redirect unpaid agents to main dashboard
      if (initialUserData.agent?.payment_status !== 'paid') {
        router.replace('/dashboard');
        return;
      }
      
      setLoading(false);
    }
  }, [initialUserData, router]);

  // Fetch queue count for unpaid agents
  useEffect(() => {
    const fetchQueueCount = async () => {
      try {
        const { count, error } = await supabase
          .from('service_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open');
        
        if (error) throw error;
        setQueueCount(count);
      } catch (error) {
        console.error('Error fetching queue count:', error);
        setQueueCount(null);
      } finally {
        setQueueLoading(false);
      }
    };

    fetchQueueCount();
  }, []);

  // Fetch paid agents count
  useEffect(() => {
    const fetchPaidAgentCount = async () => {
      try {
        const { count, error } = await supabase
          .from('agents')
          .select('*', { count: 'exact', head: true })
          .eq('payment_status', 'paid');
        
        if (error) throw error;
        setPaidAgentCount(count);
      } catch (error) {
        console.error('Error fetching paid agents count:', error);
        setPaidAgentCount(null);
      } finally {
        setPaidAgentLoading(false);
      }
    };

    fetchPaidAgentCount();
  }, []);

  useEffect(() => {
    if (agentData) {
      fetchRequests();
    }
  }, [filterStatus, agentData]);

  async function fetchRequests() {
    setLoading(true);
    try {
      const response = await axios.get('/api/agent/requests', {
        params: {
          clerkId: user.id,
          status: filterStatus,
        }
      });
      setRequests(response.data.requests || []);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Agent verification required');
        router.push('/agent/signup');
      } else if (error.response?.status === 404) {
        // Service requests table doesn't exist yet
        console.log('Service requests not set up yet');
        setRequests([]);
        toast.info('Service requests coming soon!');
      } else {
        toast.error('Failed to load requests');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestAction(requestId, action) {
    if (!user?.id) return;
    
    const actionLabels = {
      complete: 'Mark as Complete',
      release: 'Release to Next Agent',
      remove: 'Remove from Dashboard',
    };

    if (!confirm(`Are you sure you want to ${actionLabels[action]}?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await axios.post('/api/agent/update-request', {
        clerkId: user.id,
        requestId,
        action,
      });

      toast.success(response.data.message);
      
      // Refresh requests list
      await fetchRequests();
      
      // Close modal if open
      setSelectedRequest(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update request');
    } finally {
      setActionLoading(false);
    }
  }

  const stats = {
    open: requests.filter(r => r.status === 'open').length,
    assigned: requests.filter(r => r.status === 'assigned' || r.status === 'in_progress').length,
    completed: requests.filter(r => r.status === 'completed').length,
    total: requests.length,
  };

  const filteredRequests = filterStatus === 'all' 
    ? requests 
    : requests.filter(r => r.status === filterStatus);

  return (
    <>
      <Head>
        <title>Agent Dashboard - Client Requests</title>
      </Head>

      {/* Notification Popup for new requests */}
      <RequestNotificationPopup />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Actions */}
          <div className="mb-6 flex gap-3 flex-wrap">
            <Link 
              href="/properties/my-listings"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              My Properties
            </Link>
            <Link 
              href="/properties/bulk-create"
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Bulk Create Listings
            </Link>
          </div>

          {/* Unpaid Agent Payment Prompt */}
          {agentData?.payment_status !== 'paid' && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-orange-400 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-4">
               
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-orange-900 mb-3">
                    Clients Are Waiting
                  </h3>
                  <div className="text-orange-800 space-y-2 mb-4">
                    {!queueLoading && queueCount !== null && (
                      <p><strong>{queueCount}</strong> people are looking for an agent right now.</p>
                    )}
                    {queueLoading && <p>Loading live requests...</p>}
                    {!paidAgentLoading && paidAgentCount !== null && (
                      <p>Only <strong>{20 - paidAgentCount}</strong> paid {20 - paidAgentCount === 1 ? 'spot' : 'spots'} left.</p>
                    )}
                  </div>
                  <Link
                    href="/agent/payment"
                    className="inline-block px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition flex items-center gap-2 w-fit"
                  >
                    <DollarSign className="w-5 h-5" />
                    Claim Your Paid Slot
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          {agentData?.payment_status === 'paid' && (
            <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-500">Total Requests</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 md:w-10 md:h-10 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-500">Open</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-600">{stats.open}</p>
                </div>
                <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-blue-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-500">In Progress</p>
                  <p className="text-xl md:text-2xl font-bold text-orange-600">{stats.assigned}</p>
                </div>
                <Clock className="w-8 h-8 md:w-10 md:h-10 text-orange-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-500">Completed</p>
                  <p className="text-xl md:text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-green-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              <Filter className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 flex-shrink-0">Filter:</span>
              {['all', 'open', 'assigned', 'in_progress', 'completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition whitespace-nowrap ${
                    filterStatus === status
                      ? 'bg-accent text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Requests List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No client requests found</p>
                <p className="text-sm text-gray-400">
                  {filterStatus !== 'all' 
                    ? `No ${filterStatus.replace('_', ' ')} requests` 
                    : 'Client requests will appear here'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <div key={request.id} className="p-4 md:p-6 hover:bg-gray-50">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="text-base md:text-lg font-semibold text-gray-900">
                            {request.request_type.charAt(0).toUpperCase() + request.request_type.slice(1)} {request.property_type}
                          </h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            request.status === 'open' 
                              ? 'bg-blue-100 text-blue-800'
                              : request.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {request.status}
                          </span>
                          {request.urgency === 'urgent' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Urgent
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {request.location}
                          </div>
                          {request.budget_min && request.budget_max && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              ${request.budget_min?.toLocaleString()} - ${request.budget_max?.toLocaleString()}
                            </div>
                          )}
                          {request.bedrooms && (
                            <div className="flex items-center gap-2">
                              <Bed className="w-4 h-4" />
                              {request.bedrooms} beds
                            </div>
                          )}
                          {request.bathrooms && (
                            <div className="flex items-center gap-2">
                              <Bath className="w-4 h-4" />
                              {request.bathrooms} baths
                            </div>
                          )}
                      
                        </div>

                        {request.description && (
                          <p className="text-sm text-gray-700 mb-3">{request.description}</p>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs md:text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{request.client_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{request.client_email}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{request.client_phone}</span>
                          </div>
                            <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(request.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex md:flex-col gap-2 w-full md:w-auto md:ml-4">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="btn-primary btn-sm whitespace-nowrap flex-1 md:flex-none"
                        >
                          View Details
                        </button>
                        {request.status !== 'completed' && (
                          <div className="flex gap-2 flex-1 md:flex-none">
                            <button
                              onClick={() => handleRequestAction(request.id, 'complete')}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                              title="Mark as Complete"
                            >
                              <CheckCircle className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleRequestAction(request.id, 'release')}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 disabled:opacity-50 flex items-center gap-1"
                              title="Release to Next Agent"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleRequestAction(request.id, 'remove')}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                              title="Remove from Dashboard"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </div>

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Request Details</h2>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Request Type</h3>
                <p className="text-gray-700">
                  {selectedRequest.request_type.toUpperCase()} - {selectedRequest.property_type}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Client Information</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Name:</strong> {selectedRequest.client_name}</p>
                  <p><strong>Email:</strong> {selectedRequest.client_email}</p>
                  <p><strong>Phone:</strong> {selectedRequest.client_phone}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Property Details</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Location:</strong> {selectedRequest.location}</p>
                  {selectedRequest.budget_min && (
                    <p><strong>Budget:</strong> ${selectedRequest.budget_min?.toLocaleString()} - ${selectedRequest.budget_max?.toLocaleString()}</p>
                  )}
                  {selectedRequest.bedrooms && <p><strong>Bedrooms:</strong> {selectedRequest.bedrooms}</p>}
                  {selectedRequest.bathrooms && <p><strong>Bathrooms:</strong> {selectedRequest.bathrooms}</p>}
                  <p><strong>Urgency:</strong> {selectedRequest.urgency}</p>
                </div>
              </div>

              {selectedRequest.description && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-sm text-gray-700">{selectedRequest.description}</p>
                </div>
              )}

              <div className="pt-4 border-t flex gap-3">
                {selectedRequest.status !== 'completed' && (
                  <>
                    <button
                      onClick={() => handleRequestAction(selectedRequest.id, 'complete')}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Complete
                    </button>
                    <button
                      onClick={() => handleRequestAction(selectedRequest.id, 'release')}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Release
                    </button>
                    <button
                      onClick={() => handleRequestAction(selectedRequest.id, 'remove')}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Feedback Popup */}
      <AgentFeedbackPopup />
    </>
  );
}
