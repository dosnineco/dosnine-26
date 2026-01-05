import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { FiTrash2 } from 'react-icons/fi';

export default function AdminRequestsPage() {
  const { user } = useUser();
  const [requests, setRequests] = useState([]);
  const [agents, setAgents] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) return;
    
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('clerk_id', user.id)
        .single();

      if (error) throw error;

      if (userData?.role === 'admin') {
        setIsAdmin(true);
        fetchData();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch service requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('service_requests')
        .select(`
          *,
          agent:assigned_agent_id(
            id,
            business_name,
            users:user_id(
              full_name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Flatten the nested structure for easier access
      const flattenedRequests = requestsData?.map(req => ({
        ...req,
        agent: req.agent ? {
          id: req.agent.id,
          business_name: req.agent.business_name,
          full_name: req.agent.users?.full_name || req.agent.business_name || 'Unknown Agent',
          email: req.agent.users?.email || 'No email'
        } : null
      })) || [];

      setRequests(flattenedRequests);

      // Fetch all agents for assignment dropdown
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select(`
          id,
          business_name,
          user_id,
          last_request_assigned_at,
          users:user_id(
            full_name,
            email
          )
        `)
        .eq('verification_status', 'approved')
        .eq('payment_status', 'paid')
        .order('last_request_assigned_at', { ascending: true, nullsFirst: true });

      if (agentsError) throw agentsError;

      // Flatten agents data
      const flattenedAgents = agentsData?.map(agent => ({
        id: agent.id,
        business_name: agent.business_name,
        full_name: agent.users?.full_name || agent.business_name || 'Unnamed Agent',
        email: agent.users?.email || 'No email',
        last_request_assigned_at: agent.last_request_assigned_at
      })) || [];

      setAgents(flattenedAgents);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleManualAssign = async (requestId, agentId) => {
    setAssignLoading(true);
    try {
      const now = new Date().toISOString();

      // Only update assignment-related fields - never touch required fields
      const updatePayload = {
        assigned_agent_id: agentId || null,
        status: agentId ? 'assigned' : 'open',
        assigned_at: agentId ? now : null
      };

      console.log('📤 Updating request:', requestId);
      console.log('📋 Payload:', updatePayload);

      const { error: updateError, data } = await supabase
        .from('service_requests')
        .update(updatePayload)
        .eq('id', requestId)
        .select();

      console.log('📥 Response:', { error: updateError, data });

      if (updateError) {
        console.error('❌ DB Error:', updateError);
        throw new Error(updateError.message || 'Database update failed');
      }

      // Update agent's last assignment timestamp
      if (agentId) {
        const { error: agentError } = await supabase
          .from('agents')
          .update({ last_request_assigned_at: now })
          .eq('id', agentId);

        if (agentError) {
          console.warn(' Agent timestamp update failed:', agentError);
        }
      }

      toast.success(agentId ? 'Request assigned!' : 'Request unassigned!');
      
      // Refresh data after a short delay
      setTimeout(() => fetchData(), 200);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!confirm('DELETE this service request?\n\nThis action cannot be undone!')) return;

    try {

      const { error, data } = await supabase
        .from('service_requests')
        .delete()
        .eq('id', requestId)
        .select();

      console.log('Delete response:', { error, data });

      if (error) throw error;

      toast.success('Request deleted successfully!');
      setTimeout(() => fetchData(), 200);
    } catch (err) {
      console.error(' Delete error:', err);
      toast.error(`Failed to delete: ${err.message}`);
    }
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
        <title>Service Requests — Admin Dashboard</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
       
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Service Requests</h1>
                <p className="text-sm text-gray-500">All submitted client requests with agent assignments</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Filters */}
              <div className="bg-white rounded-lg shadow p-4 mb-6 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Type:</span>
                  {['all', 'buy', 'sell', 'rent'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition whitespace-nowrap ${
                        filterType === type
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Urgency:</span>
                  {['all', 'normal', 'urgent'].map((urgency) => (
                    <button
                      key={urgency}
                      onClick={() => setFilterUrgency(urgency)}
                      className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition whitespace-nowrap ${
                        filterUrgency === urgency
                          ? urgency === 'urgent'
                            ? 'bg-red-500 text-white'
                            : 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-600 mb-1">Open</p>
                  <p className="text-2xl font-bold text-orange-600">{requests.filter(r => r.status === 'open').length}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-600 mb-1">Assigned</p>
                  <p className="text-2xl font-bold text-blue-600">{requests.filter(r => r.status === 'assigned' || r.status === 'in_progress').length}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{requests.filter(r => r.status === 'completed').length}</p>
                </div>
              </div>

              {/* Request List */}
              <div className="space-y-3">
                {requests.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-600">No service requests yet</p>
                  </div>
                ) : (
                  requests.filter(request => {
                    const typeMatch = filterType === 'all' || request.request_type === filterType;
                    const urgencyMatch = filterUrgency === 'all' || request.urgency === filterUrgency;
                    return typeMatch && urgencyMatch;
                  }).map((request) => (
                    <div key={request.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-gray-800 text-lg">
                              {request.request_type.toUpperCase()} - {request.property_type}
                            </h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              request.status === 'open' ? 'bg-orange-100 text-orange-800' :
                              request.status === 'assigned' || request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              request.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.status}
                            </span>
                            {request.urgency === 'urgent' && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Urgent
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                            <div>
                              <span className="font-medium">Client:</span> {request.client_name}
                            </div>
                            <div>
                              <span className="font-medium">Location:</span> {request.location}
                            </div>
                            {request.budget_min && (
                              <div>
                                <span className="font-medium">Budget:</span> ${request.budget_min?.toLocaleString()} - ${request.budget_max?.toLocaleString()}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Date:</span> {new Date(request.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          {request.description && (
                            <p className="text-sm text-gray-700 mb-3 bg-gray-50 p-2 rounded">{request.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
                            <span className="text-gray-600">📧 {request.client_email}</span>
                            <span className="text-gray-600">📞 {request.client_phone}</span>
                          </div>
                        </div>
                      </div>

                      {/* Agent Assignment */}
                      <div className="border-t pt-3 mt-3 bg-gray-50 -mx-4 px-4 -mb-4 pb-4 rounded-b-lg">
                        {request.agent ? (
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Assigned Agent</p>
                              <p className="font-bold text-gray-900 text-lg">{request.agent.full_name}</p>
                              <p className="text-sm text-gray-600">{request.agent.email}</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {request.status !== 'completed' && request.status !== 'cancelled' && (
                                <>
                                  <button
                                    onClick={() => handleManualAssign(request.id, null)}
                                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
                                    disabled={assignLoading}
                                  >
                                    Unassign
                                  </button>
                                  <select
                                    onChange={(e) => e.target.value && handleManualAssign(request.id, e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none text-sm"
                                    disabled={assignLoading}
                                    defaultValue=""
                                  >
                                    <option value="">Reassign to...</option>
                                    {agents.filter(a => a.id !== request.agent_id).map((agent) => (
                                      <option key={agent.id} value={agent.id}>
                                        {agent.full_name}
                                      </option>
                                    ))}
                                  </select>
                                </>
                              )}
                              <button
                                onClick={() => handleDeleteRequest(request.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-1"
                              >
                                <FiTrash2 size={16} />
                                Delete
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold text-orange-600 uppercase">⚠️ Unassigned Request</p>
                            <div className="flex flex-col md:flex-row md:items-center gap-3">
                              <label className="text-sm font-medium text-gray-700">Assign to Agent:</label>
                              <select
                                onChange={(e) => e.target.value && handleManualAssign(request.id, e.target.value)}
                                className="flex-1 px-3 py-2 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-accent outline-none bg-white"
                                disabled={assignLoading}
                                defaultValue=""
                              >
                                <option value="">Select an agent...</option>
                                {agents.map((agent) => (
                                  <option key={agent.id} value={agent.id}>
                                    {agent.full_name} - {agent.email}
                                    {!agent.last_request_assigned_at && ' (Never assigned)'}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleDeleteRequest(request.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-1 justify-center"
                              >
                                <FiTrash2 size={16} />
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
