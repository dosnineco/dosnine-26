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
import { 
  Home, Users, Mail, Phone, MapPin, DollarSign, 
  Bed, Bath, Calendar, Filter, CheckCircle, XCircle,
  AlertCircle, Clock, Plus, RotateCcw, Trash2
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
  const [showPaymentRequired, setShowPaymentRequired] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (initialUserData) {
      console.log('Agent Dashboard - User Data:', initialUserData);
      console.log('Agent Dashboard - Agent Data:', initialUserData.agent);
      console.log('Agent Dashboard - Verification Status:', initialUserData.agent?.verification_status);
      console.log('Agent Dashboard - Payment Status:', initialUserData.agent?.payment_status);
      
      setAgentData(initialUserData.agent);
      if (initialUserData.agent?.payment_status !== 'paid') {
        setShowPaymentRequired(true);
        setLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, [initialUserData]);

  useEffect(() => {
    if (agentData?.payment_status === 'paid') {
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
      console.error('Failed to fetch requests:', error);
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
      console.error('Failed to update request:', error);
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
      {agentData?.payment_status === 'paid' && <RequestNotificationPopup />}

      <div className="min-h-screen bg-gray-50">
        {/* Payment Required Block */}
        {showPaymentRequired && (
          <div className="bg-white border-b border-accent/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="text-center max-w-2xl mx-auto">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 rounded-full mb-4">
                  <AlertCircle className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Unlock Client Requests</h2>
                <p className="text-gray-600 mb-6">
                  Your agent profile is verified! To access client requests and start connecting with potential customers, 
                  complete a one-time payment of <span className="font-bold text-accent">$50 USD</span>.
                </p>
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold mb-3">What You'll Get:</h3>
                  <ul className="text-left space-y-2 text-gray-700">
                    <li>✅ Access to all client requests</li>
                    <li>✅ Direct client contact information</li>
                    <li>✅ Unlimited property postings</li>
                    <li>✅ Real-time request notifications</li>
                  </ul>
                </div>
                <button
                  onClick={() => router.push('/agent/payment')}
                  className="btn-primary btn-lg"
                >
                  Unlock Access - $50 USD
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-accent" />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">Agent Dashboard</h1>
                    <VerifiedBadge size="md" />
                  </div>
                  <p className="text-sm text-gray-500">
                    {agentData?.payment_status === 'paid' ? 'Client Requests' : 'Verified Agent - Payment Required'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {agentData?.payment_status === 'paid' && (
                  <Link
                    href="/properties/new"
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Post Property
                  </Link>
                )}
           
              </div>
            </div>
          </div>
        </div>

        {showPaymentRequired ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-green-50 border-l-4 border-green-400 rounded-lg p-8 mb-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-green-900 mb-2">
                    🎉 Congratulations! You're Verified
                  </h3>
                  <p className="text-green-800 text-lg mb-4">
                    Your agent application has been approved. You're now a verified agent on our platform!
                  </p>
                  <div className="bg-white rounded-lg p-6 mb-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      One More Step: Unlock Full Access
                    </h4>
                    <p className="text-gray-700 mb-4">
                      To start receiving client requests and post unlimited properties, complete the one-time $50 USD payment.
                    </p>
                    <button
                      onClick={() => router.push('/agent/payment')}
                      className="w-full btn-primary btn-lg flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Unlock Access Now - $50 USD
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Users className="w-10 h-10 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Open</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
                </div>
                <AlertCircle className="w-10 h-10 text-blue-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.assigned}</p>
                </div>
                <Clock className="w-10 h-10 text-orange-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter:</span>
              {['all', 'open', 'assigned', 'in_progress', 'completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
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
                  <div key={request.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
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

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
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
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(request.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        {request.description && (
                          <p className="text-sm text-gray-700 mb-3">{request.description}</p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {request.client_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {request.client_email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {request.client_phone}
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 flex flex-col gap-2">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="btn-primary btn-sm whitespace-nowrap"
                        >
                          View Details
                        </button>
                        {request.status !== 'completed' && (
                          <div className="flex gap-2">
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
        </div>
        )}
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
                      <CheckCircle className="w-4 h-4" />
                      Mark Complete
                    </button>
                    <button
                      onClick={() => handleRequestAction(selectedRequest.id, 'release')}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Release
                    </button>
                    <button
                      onClick={() => handleRequestAction(selectedRequest.id, 'remove')}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
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
