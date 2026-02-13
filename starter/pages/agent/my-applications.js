import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { useRoleProtection } from '../../lib/useRoleProtection';
import { isVerifiedAgent } from '../../lib/rbac';

export default function MyApplicationsPage() {
  const { loading: authLoading, userData: initialUserData } = useRoleProtection({ checkAccess: isVerifiedAgent, redirectTo: '/agent/signup' });
  const { user } = useUser();

  const [applications, setApplications] = useState([]);
  const [requests, setRequests] = useState({});
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState(null);

  useEffect(() => {
    if (initialUserData?.agent?.id) {
      setAgentId(initialUserData.agent.id);
    }
  }, [initialUserData]);

  useEffect(() => {
    if (agentId) {
      fetchApplications();
    }
  }, [agentId]);

  const fetchApplications = async () => {
    try {
      // Fetch agent's applications
      const { data: appData, error: appError } = await supabase
        .from('agent_request_applications')
        .select('id, request_id, status, applied_at, reviewed_at, notes')
        .eq('agent_id', agentId)
        .order('applied_at', { ascending: false });

      if (appError) throw appError;

      // Fetch all related service requests
      const requestIds = appData?.map(a => a.request_id) || [];
      let requestsData = [];
      
      if (requestIds.length > 0) {
        const { data, error } = await supabase
          .from('service_requests')
          .select('id, client_name, client_email, property_type, location, budget_min, budget_max, bedrooms, bathrooms, request_type, created_at')
          .in('id', requestIds);

        if (error) throw error;
        requestsData = data || [];
      }

      // Build lookup map
      const requestsMap = {};
      requestsData.forEach(r => {
        requestsMap[r.id] = r;
      });

      setApplications(appData || []);
      setRequests(requestsMap);
    } catch (err) {
      console.error('Error fetching applications:', err);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin">Loading...</div>
      </div>
    );
  }

  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Pending Review' },
    approved: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Approved' },
    rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected' }
  };

  const stats = {
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  return (
    <>
      <Head>
        <title>My Request Applications</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold mb-2">My Request Applications</h1>
          <p className="text-gray-600 mb-8">Track your submitted requests for parish listings</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 border border-yellow-200 bg-yellow-50">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-yellow-700">Pending</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200 bg-green-50">
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-sm text-green-700">Approved</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-red-200 bg-red-50">
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              <p className="text-sm text-red-700">Rejected</p>
            </div>
          </div>

          {/* Applications List */}
          {applications.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
              <p className="text-gray-600 mb-3">No applications yet</p>
              <p className="text-sm text-gray-500">Go to <a href="/agent/parish-requests" className="text-accent hover:underline">Parish Requests</a> to find requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map(app => {
                const request = requests[app.request_id];
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
                            {statusInfo.label}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {request?.request_type?.toUpperCase()} • {request?.property_type}
                          </h3>
                          <p className="text-sm text-gray-600 mb-1">
                            📍 {request?.location} • 🛏️ {request?.bedrooms}bd • 🚿 {request?.bathrooms}ba
                          </p>
                          {request?.budget_min && (
                            <p className="text-sm font-medium text-gray-700 mb-3">
                              💰 J${request.budget_min?.toLocaleString()} - J${request.budget_max?.toLocaleString()}
                            </p>
                          )}
                          {request?.client_name && (
                            <p className="text-sm text-gray-600 mb-1">Client: {request.client_name}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-3">
                            Applied: {new Date(app.applied_at).toLocaleDateString()} at {new Date(app.applied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {app.reviewed_at && (
                              <> • Reviewed: {new Date(app.reviewed_at).toLocaleDateString()}</>
                            )}
                          </p>
                          {app.notes && (
                            <p className="text-sm text-gray-700 mt-2 p-2 bg-white rounded border border-gray-200">
                              <span className="font-medium">Note:</span> {app.notes}
                            </p>
                          )}
                        </div>
                      </div>
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
