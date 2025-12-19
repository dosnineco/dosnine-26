import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, FileText, Phone, Mail, Building, Award, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminAgentApprovals() {
  const { user } = useUser();
  const [pendingAgents, setPendingAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingAgents();
  }, []);

  const fetchPendingAgents = async () => {
    try {
      // Fetch users with pending agent status and their agent data
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('user_type', 'agent')
        .eq('agent_verification_status', 'pending')
        .order('agent_verification_submitted_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch corresponding agent records to get profile images
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('user_id, profile_image_url')
        .in('user_id', usersData?.map(u => u.id) || []);

      if (agentsError) throw agentsError;

      // Merge agent data with user data
      const mergedData = usersData?.map(user => {
        const agentData = agentsData?.find(a => a.user_id === user.id);
        return {
          ...user,
          profile_image_url: agentData?.profile_image_url || null
        };
      }) || [];

      setPendingAgents(mergedData);
    } catch (error) {
      console.error('Error fetching pending agents:', error);
      toast.error('Failed to load pending agents');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (agentId) => {
    if (!confirm('Are you sure you want to approve this agent? They will be able to receive client requests.')) {
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          agent_verification_status: 'approved',
          agent_verified: true,
        })
        .eq('id', agentId);

      if (error) throw error;

      toast.success('Agent approved successfully!');
      setPendingAgents(prev => prev.filter(a => a.id !== agentId));
      setSelectedAgent(null);
    } catch (error) {
      console.error('Error approving agent:', error);
      toast.error('Failed to approve agent');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (agentId) => {
    const reason = prompt('Please provide a reason for rejection (optional):');
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          agent_verification_status: 'rejected',
          agent_verified: false,
        })
        .eq('id', agentId);

      if (error) throw error;

      toast.success('Agent rejected');
      setPendingAgents(prev => prev.filter(a => a.id !== agentId));
      setSelectedAgent(null);
    } catch (error) {
      console.error('Error rejecting agent:', error);
      toast.error('Failed to reject agent');
    } finally {
      setProcessing(false);
    }
  };

  const viewDocument = async (filePath) => {
    if (!filePath) {
      toast.error('No document available');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('agent-documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to load document');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Agent Approval Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Review and approve or reject agent applications
          </p>
          <div className="mt-4 flex gap-4">
            <div className="bg-yellow-100 border border-yellow-400 rounded-lg px-4 py-2">
              <span className="text-yellow-800 font-semibold">Pending: {pendingAgents.length}</span>
            </div>
          </div>
        </div>

        {/* Pending Agents List */}
        {pendingAgents.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">All Caught Up!</h3>
            <p className="text-gray-600">No pending agent applications to review</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {pendingAgents.map(agent => (
              <div
                key={agent.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden"
              >
                {/* Agent Card Header */}
                <div className="bg-blue-600 text-white p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      {agent.profile_image_url && (
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-white/20 flex-shrink-0">
                          <img 
                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/agent-documents/${agent.profile_image_url}`}
                            alt={agent.full_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div>
                        <h3 className="text-2xl font-bold mb-2">{agent.full_name}</h3>
                        <p className="text-blue-100 text-sm">
                          Submitted: {new Date(agent.agent_verification_submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-semibold">
                      PENDING REVIEW
                    </div>
                  </div>
                </div>

                {/* Agent Details */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Contact Information */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <Mail className="w-5 h-5 mr-2 text-blue-600" />
                        Contact Information
                      </h4>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium text-gray-900">{agent.email}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium text-gray-900">{agent.phone || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Business Information */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <Building className="w-5 h-5 mr-2 text-blue-600" />
                        Business Information
                      </h4>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-600">Business Name</p>
                        <p className="font-medium text-gray-900">{agent.agent_business_name || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-600">License Number</p>
                        <p className="font-medium text-gray-900">{agent.agent_license_number || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Professional Details */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <Award className="w-5 h-5 mr-2 text-blue-600" />
                        Professional Details
                      </h4>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-600">Years of Experience</p>
                        <p className="font-medium text-gray-900">{agent.agent_years_experience || 'N/A'} years</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-600">Specializations</p>
                        <p className="font-medium text-gray-900">{agent.agent_specialization || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Documents */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-blue-600" />
                        Verification Documents
                      </h4>
                      <button
                        onClick={() => viewDocument(agent.agent_license_file_url)}
                        disabled={!agent.agent_license_file_url}
                        className={`w-full text-left p-3 rounded flex items-center justify-between ${
                          agent.agent_license_file_url
                            ? 'bg-green-50 hover:bg-green-100 cursor-pointer'
                            : 'bg-gray-100 cursor-not-allowed'
                        }`}
                      >
                        <span className="font-medium text-gray-900">Agent License</span>
                        {agent.agent_license_file_url ? (
                          <span className="text-green-600 text-sm">View →</span>
                        ) : (
                          <span className="text-gray-400 text-sm">Not uploaded</span>
                        )}
                      </button>
                      <button
                        onClick={() => viewDocument(agent.agent_registration_file_url)}
                        disabled={!agent.agent_registration_file_url}
                        className={`w-full text-left p-3 rounded flex items-center justify-between ${
                          agent.agent_registration_file_url
                            ? 'bg-green-50 hover:bg-green-100 cursor-pointer'
                            : 'bg-gray-100 cursor-not-allowed'
                        }`}
                      >
                        <span className="font-medium text-gray-900">Business Registration</span>
                        {agent.agent_registration_file_url ? (
                          <span className="text-green-600 text-sm">View →</span>
                        ) : (
                          <span className="text-gray-400 text-sm">Not uploaded</span>
                        )}
                      </button>
                      <button
                        onClick={() => viewDocument(agent.profile_image_url)}
                        disabled={!agent.profile_image_url}
                        className={`w-full text-left p-3 rounded flex items-center justify-between ${
                          agent.profile_image_url
                            ? 'bg-green-50 hover:bg-green-100 cursor-pointer'
                            : 'bg-gray-100 cursor-not-allowed'
                        }`}
                      >
                        <span className="font-medium text-gray-900">Profile Image</span>
                        {agent.profile_image_url ? (
                          <span className="text-green-600 text-sm">View →</span>
                        ) : (
                          <span className="text-gray-400 text-sm">Not uploaded</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => handleApprove(agent.id)}
                      disabled={processing}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center disabled:opacity-50"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Approve Agent
                    </button>
                    <button
                      onClick={() => handleReject(agent.id)}
                      disabled={processing}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center disabled:opacity-50"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Reject Application
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
