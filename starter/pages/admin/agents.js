import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Shield, CheckCircle, XCircle, Clock, Eye, FileText, Phone, Mail, Calendar, Building2, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AdminAgents() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [documentUrls, setDocumentUrls] = useState({});
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    if (!user) return;
    verifyAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchAgents();
    }
  }, [isAdmin, filterStatus]);

  async function verifyAdminAccess() {
    try {
      const response = await axios.get('/api/admin/verify-admin', {
        params: {
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
        }
      });

      if (response.data.isAdmin) {
        setIsAdmin(true);
      } else {
        toast.error('Access denied - Admin only');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Admin verification failed:', error);
      toast.error('Access denied');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAgents() {
    setLoading(true);
    try {
      console.log('Fetching agents with:', { 
        clerkId: user.id, 
        status: filterStatus 
      });

      const response = await axios.get('/api/admin/agents/list', {
        params: {
          clerkId: user.id,
          status: filterStatus,
        }
      });

      console.log('API Response:', response.data);

      const agentData = response.data.agents || [];
      setAgents(agentData);
      
      // Log data for debugging
      console.log('✅ Loaded agents:', agentData.length);
      if (agentData.length > 0) {
        console.log('Sample agent:', agentData[0]);
      } else {
        console.log('⚠️ No agents found in database');
        toast.info('No agents found. Create a test agent at /agent/signup');
      }
    } catch (error) {
      console.error('❌ Failed to fetch agents:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }

  async function updateAgentStatus(agentId, status, notes = '') {
    if (!confirm(`Are you sure you want to ${status} this agent?`)) {
      return;
    }

    setVerifying(true);
    try {
      const response = await axios.post('/api/admin/agents/update-status', {
        clerkId: user.id,
        agentId,
        status,
        notes,
      });

      toast.success(response.data.message);
      fetchAgents(); // Refresh list
      setSelectedAgent(null); // Close modal
    } catch (error) {
      console.error('Failed to update agent:', error);
      toast.error(error.response?.data?.error || 'Failed to update agent');
    } finally {
      setVerifying(false);
    }
  }

  async function togglePaymentStatus(agentId, currentStatus) {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    if (!confirm(`Mark agent as ${newStatus}?`)) {
      return;
    }

    try {
      // Update payment status directly in Supabase
      const updateData = {
        payment_status: newStatus,
      };
      
      // If marking as paid, set payment_date
      if (newStatus === 'paid') {
        updateData.payment_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('agents')
        .update(updateData)
        .eq('id', agentId);

      if (error) {
        throw error;
      }

      toast.success(`Payment status updated to ${newStatus}`);
      fetchAgents(); // Refresh list
    } catch (error) {
      console.error('Failed to update payment:', error);
      toast.error(error.message || 'Failed to update payment status');
    }
  }

  function viewDocuments(agent) {
    setSelectedAgent(agent);
    loadDocumentUrls(agent);
  }

  async function loadDocumentUrls(agent) {
    if (!agent.license_file_url && !agent.registration_file_url) {
      return;
    }

    setLoadingDocs(true);
    const urls = {};

    try {
      // Load license document
      if (agent.license_file_url) {
        // Extract path from URL if it's a full URL
        let path = agent.license_file_url;
        if (path.includes('agent-documents/')) {
          path = path.split('agent-documents/')[1].split('?')[0];
        }
        
        try {
          const response = await axios.get('/api/admin/agents/get-document', {
            params: { clerkId: user.id, path }
          });
          urls.license = response.data.signedUrl;
        } catch (err) {
          console.error('Failed to load license:', err);
          urls.license = agent.license_file_url; // Fallback to original URL
        }
      }

      // Load registration document
      if (agent.registration_file_url) {
        let path = agent.registration_file_url;
        if (path.includes('agent-documents/')) {
          path = path.split('agent-documents/')[1].split('?')[0];
        }
        
        try {
          const response = await axios.get('/api/admin/agents/get-document', {
            params: { clerkId: user.id, path }
          });
          urls.registration = response.data.signedUrl;
        } catch (err) {
          console.error('Failed to load registration:', err);
          urls.registration = agent.registration_file_url; // Fallback
        }
      }

      setDocumentUrls(urls);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoadingDocs(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  const stats = {
    pending: agents.filter(a => a.verification_status === 'pending').length,
    approved: agents.filter(a => a.verification_status === 'approved').length,
    rejected: agents.filter(a => a.verification_status === 'rejected').length,
    total: agents.length,
  };

  const filteredAgents = filterStatus === 'all' 
    ? agents 
    : agents.filter(a => a.verification_status === filterStatus);

  return (
    <>
      <Head>
        <title>Agent Management - Admin Dashboard</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Agent Management</h1>
                  <p className="text-sm text-gray-500">Admin Dashboard</p>
                </div>
              </div>
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Agents</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Building2 className="w-10 h-10 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Review</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                </div>
                <Clock className="w-10 h-10 text-orange-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Filter:</span>
              {['all', 'pending', 'approved', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Agents List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading agents...</p>
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No agents found</p>
                <p className="text-sm text-gray-400">
                  {filterStatus !== 'all' 
                    ? `No ${filterStatus} agents` 
                    : 'Create a test agent at /agent/signup'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Experience</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAgents.map((agent) => (
                      <tr key={agent.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{agent.user?.full_name}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {agent.user?.email}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {agent.user?.phone}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{agent.business_name}</p>
                          <p className="text-xs text-gray-500">License: {agent.license_number || 'N/A'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {agent.years_experience} years
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            agent.verification_status === 'approved' 
                              ? 'bg-green-100 text-green-800'
                              : agent.verification_status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {agent.verification_status === 'approved' && <CheckCircle className="w-3 h-3" />}
                            {agent.verification_status === 'rejected' && <XCircle className="w-3 h-3" />}
                            {agent.verification_status === 'pending' && <Clock className="w-3 h-3" />}
                            {agent.verification_status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => togglePaymentStatus(agent.id, agent.payment_status)}
                            disabled={agent.verification_status !== 'approved'}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                              agent.payment_status === 'paid'
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                            title={agent.verification_status !== 'approved' ? 'Agent must be approved first' : 'Toggle payment status'}
                          >
                            {agent.payment_status === 'paid' ? '✓ Paid' : 'Unpaid'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(agent.verification_submitted_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => viewDocuments(agent)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {agent.verification_status === 'pending' && (
                              <>
                                <button
                                  onClick={() => updateAgentStatus(agent.id, 'approved')}
                                  disabled={verifying}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                                  title="Approve"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => updateAgentStatus(agent.id, 'rejected')}
                                  disabled={verifying}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                  title="Reject"
                                >
                                  <XCircle className="w-4 h-4" />
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
      </div>

      {/* Agent Details Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Agent Details</h2>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="font-medium">{selectedAgent.user?.full_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium">{selectedAgent.user?.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <p className="font-medium">{selectedAgent.user?.phone}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <p className="font-medium capitalize">{selectedAgent.verification_status}</p>
                  </div>
                </div>
              </div>

              {/* Business Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Business Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Business Name:</span>
                    <p className="font-medium">{selectedAgent.business_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Years Experience:</span>
                    <p className="font-medium">{selectedAgent.years_experience} years</p>
                  </div>
                  <div>
                    <span className="text-gray-500">License Number:</span>
                    <p className="font-medium">{selectedAgent.license_number || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Deals Closed:</span>
                    <p className="font-medium">{selectedAgent.deals_closed_count}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Service Areas:</span>
                    <p className="font-medium">{selectedAgent.service_areas || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Specializations:</span>
                    <p className="font-medium">
                      {Array.isArray(selectedAgent.specializations) 
                        ? selectedAgent.specializations.join(', ')
                        : selectedAgent.specializations || 'N/A'}
                    </p>
                  </div>
                  {selectedAgent.about_me && (
                    <div className="col-span-2">
                      <span className="text-gray-500">About:</span>
                      <p className="font-medium">{selectedAgent.about_me}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Documents */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Verification Documents</h3>
                
                {loadingDocs ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading documents...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(documentUrls.license || selectedAgent.license_file_url) && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Agent License</p>
                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                          <img
                            src={documentUrls.license || selectedAgent.license_file_url}
                            alt="Agent License"
                            className="w-full h-auto object-contain"
                            onError={(e) => {
                              console.error('Failed to load license image');
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="hidden items-center justify-center h-64 bg-gray-100">
                            <div className="text-center text-gray-500">
                              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                              <p className="text-sm">Unable to load document</p>
                              <a 
                                href={documentUrls.license || selectedAgent.license_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-xs mt-1 inline-block"
                              >
                                Try opening directly
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {(documentUrls.registration || selectedAgent.registration_file_url) && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Business Registration / Gov ID</p>
                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                          <img
                            src={documentUrls.registration || selectedAgent.registration_file_url}
                            alt="Business Registration"
                            className="w-full h-auto object-contain"
                            onError={(e) => {
                              console.error('Failed to load registration image');
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="hidden items-center justify-center h-64 bg-gray-100">
                            <div className="text-center text-gray-500">
                              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                              <p className="text-sm">Unable to load document</p>
                              <a 
                                href={documentUrls.registration || selectedAgent.registration_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-xs mt-1 inline-block"
                              >
                                Try opening directly
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {!selectedAgent.license_file_url && !selectedAgent.registration_file_url && (
                      <div className="col-span-2 text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>No verification documents uploaded</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Verification Notes */}
              {selectedAgent.verification_notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Admin Notes</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedAgent.verification_notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              {selectedAgent.verification_status === 'pending' && (
                <div className="flex items-center gap-3 pt-4 border-t">
                  <button
                    onClick={() => updateAgentStatus(selectedAgent.id, 'approved', 'Documents verified and approved')}
                    disabled={verifying}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve Agent
                  </button>
                  <button
                    onClick={() => {
                      const notes = prompt('Reason for rejection:');
                      if (notes) updateAgentStatus(selectedAgent.id, 'rejected', notes);
                    }}
                    disabled={verifying}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject Agent
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
