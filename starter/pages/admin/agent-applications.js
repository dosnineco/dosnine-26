import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';

export default function AgentApplicationsPage() {
  const { user } = useUser();
  const [applications, setApplications] = useState([]);
  const [requests, setRequests] = useState({});
  const [agents, setAgents] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [updateLoading, setUpdateLoading] = useState(null);

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
        fetchApplications();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    } catch (err) {
      console.error('Admin check error:', err);
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      // Fetch agent request applications
      const { data: appData, error: appError } = await supabase
        .from('agent_request_applications')
        .select(`
          id,
          request_id,
          agent_id,
          status,
          applied_at,
          reviewed_at,
          notes
        `)
        .order('applied_at', { ascending: false });

      if (appError) throw appError;

      // Fetch all related service requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('service_requests')
        .select('id, client_name, client_email, property_type, location, budget_min, budget_max, bedrooms, bathrooms, request_type, created_at')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch all agents with their info
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select(`
          id,
          business_name,
          payment_status,
          access_expiry,
          user_id,
          users:user_id(full_name, email)
        `);

      if (agentsError) throw agentsError;

      // Build lookup maps
      const requestsMap = {};
      requestsData?.forEach(r => {
        requestsMap[r.id] = r;
      });

      const agentsMap = {};
      agentsData?.forEach(a => {
        agentsMap[a.id] = {
          id: a.id,
          business_name: a.business_name,
          payment_status: a.payment_status,
          access_expiry: a.access_expiry,
          full_name: a.users?.full_name || a.business_name,
          email: a.users?.email
        };
      });

      setApplications(appData || []);
      setRequests(requestsMap);
      setAgents(agentsMap);
    } catch (err) {
      console.error('Error fetching applications:', err);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appId, newStatus) => {
    setUpdateLoading(appId);
    try {
      const { error } = await supabase
        .from('agent_request_applications')
        .update({ status: newStatus, reviewed_at: new Date().toISOString() })
        .eq('id', appId);

      if (error) throw error;
      toast.success(`Application ${newStatus}`);
      fetchApplications();
    } catch (err) {
      console.error('Error updating application:', err);
      toast.error('Failed to update application');
    } finally {
      setUpdateLoading(null);
    }
  };

  const filteredApplications = applications.filter(app => {
    if (filterStatus === 'all') return true;
    return app.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <div className="min-h-screen bg-gray-50 p-6">Access denied</div>;
  }

  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    approved: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
  };

  return (
    <>
      <Head>
        <title>Agent Applications - Admin</title>
      </Head>

      <AdminLayout />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Filter */}
          <div className="mb-6 flex gap-2">
            {['all', 'pending', 'approved', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === status
                    ? 'bg-accent text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} ({filteredApplications.filter(a => status === 'all' || a.status === status).length})
              </button>
            ))}
          </div>

          {/* Applications List */}
          {filteredApplications.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
              <p className="text-gray-600">No applications found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map(app => {
                const request = requests[app.request_id];
                const agent = agents[app.agent_id];
                const statusInfo = statusConfig[app.status];
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={app.id}
                    className={`rounded-lg border p-6 ${statusInfo.bg} ${statusInfo.border}`}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-[250px]">
                        <div className="flex items-center gap-3 mb-3">
                          <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color} bg-white border ${statusInfo.border}`}>
                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </span>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div>
                            <h3 className="font-semibold text-gray-900">Request</h3>
                            <p className="text-sm text-gray-600">
                              {request?.request_type?.toUpperCase()} • {request?.property_type} • {request?.bedrooms}bd {request?.bathrooms}ba
                            </p>
                            <p className="text-sm text-gray-600">📍 {request?.location}</p>
                            {request?.budget_min && (
                              <p className="text-sm font-medium text-gray-700">
                                💰 J${request.budget_min?.toLocaleString()} - J${request.budget_max?.toLocaleString()}
                              </p>
                            )}
                          </div>

                          <div>
                            <h4 className="font-semibold text-gray-900 mt-4">Agent</h4>
                            <p className="text-sm text-gray-600">{agent?.full_name}</p>
                            <p className="text-sm text-gray-600">{agent?.email}</p>
                            <p className="text-sm text-gray-600">
                              Plan: <span className="font-medium">{agent?.payment_status}</span>
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">
                              Applied: {new Date(app.applied_at).toLocaleString()}
                              {app.reviewed_at && ` • Reviewed: ${new Date(app.reviewed_at).toLocaleString()}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {app.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateStatus(app.id, 'approved')}
                            disabled={updateLoading === app.id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(app.id, 'rejected')}
                            disabled={updateLoading === app.id}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
