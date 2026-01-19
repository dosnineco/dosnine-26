import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useRoleProtection } from '../../lib/useRoleProtection';
import { canAccessAdmin } from '../../lib/rbac';
import { Users, TrendingUp, Clock, CheckCircle } from 'lucide-react';

export default function AllocationDashboard() {
  const { loading: authLoading } = useRoleProtection({
    checkAccess: canAccessAdmin,
    redirectTo: '/dashboard',
    message: 'Admin access required'
  });

  const [stats, setStats] = useState({
    totalAgents: 0,
    totalRequests: 0,
    assignedRequests: 0,
    openRequests: 0
  });
  const [agentStats, setAgentStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllocationStats();
  }, []);

  async function fetchAllocationStats() {
    try {
      const nowIso = new Date().toISOString();
      const paidStatuses = ['7-day', '30-day', '90-day'];

      // Get active, verified, paid agents with request counts
      const { data: agentsRaw, error: agentsError } = await supabase
        .from('agents')
        .select(`
          id,
          business_name,
          last_request_assigned_at,
          verification_status,
          payment_status,
          access_expiry,
          users:user_id (full_name, email),
          service_requests:service_requests!assigned_agent_id(count)
        `)
        .eq('verification_status', 'approved')
        .in('payment_status', paidStatuses)
        .order('last_request_assigned_at', { ascending: true, nullsFirst: true });

      console.log('Fetched agents:', agentsRaw);
      console.log('Agents error:', agentsError);

      // Get ALL agents to show in a helper section
      const { data: allAgents } = await supabase
        .from('agents')
        .select(`
          id, 
          business_name, 
          verification_status, 
          payment_status,
          access_expiry,
          users:user_id (full_name, email)
        `);

      
      const agents = (agentsRaw || []).filter((a) => {
        if (!paidStatuses.includes(a.payment_status)) return false;
        if (a.access_expiry && new Date(a.access_expiry) < new Date(nowIso)) return false;
        return true;
      });

      if (agents.length === 1) {
        const agentName = agents[0].users?.full_name || agents[0].business_name;
      } else if (agents.length > 1) {
        // Multi-agent system active
      } else {
        // No eligible agents
      }

      // Get request stats
      const { data: requests, error: requestsError } = await supabase
        .from('service_requests')
        .select('status, assigned_agent_id');



      const assignedCount = requests?.filter(r => r.assigned_agent_id).length || 0;
      const openCount = requests?.filter(r => r.status === 'open').length || 0;

      setStats({
        totalAgents: agents.length || 0,
        totalRequests: requests?.length || 0,
        assignedRequests: assignedCount,
        openRequests: openCount,
        allAgents: allAgents || []
      });

      // Process agent stats
      const agentData = agents.map(agent => ({
        id: agent.id,
        name: agent.users?.full_name || agent.business_name || 'Unnamed Agent',
        email: agent.users?.email || 'No email',
        business: agent.business_name,
        requestCount: agent.service_requests?.[0]?.count || 0,
        lastAssigned: agent.last_request_assigned_at,
        nextInQueue: !agent.last_request_assigned_at
      })) || [];

      setAgentStats(agentData);
    } catch (error) {
      console.error('Allocation stats error:', error);
      setStats((prev) => ({
        ...prev,
        error: 'Failed to load allocation stats'
      }));
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Request Allocation — Admin Dashboard</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-gray-900">Allocation</h1>
              <Link href="/admin/dashboard" className="btn-accent  px-4 py-2 text-sm text-white  rounded-lg"
>
                Back
              </Link>
            </div>
            <p className="text-gray-600">Equal opportunities for all agents</p>
          </div>

          {/* Stats Cards */}
          {agentStats.length === 1 && (
            <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Single Agent Mode</h3>
                  <p className="text-sm text-blue-800">
                    All requests are automatically assigned to <strong>{agentStats[0].name}</strong>. 
                    When more agents join, requests will be distributed fairly using round-robin.
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Agents</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalAgents}</p>
                </div>
                <Users className="w-10 h-10 text-accent" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Requests</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalRequests}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-accent" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Assigned</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.assignedRequests}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">In Queue</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.openRequests}</p>
                </div>
                <Clock className="w-10 h-10 text-yellow-500" />
              </div>
            </div>
          </div>

          {/* Agent Distribution Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Agent Request Distribution</h2>
              <p className="text-sm text-gray-600 mt-1">Sorted by next in queue (oldest assignment first)</p>
            </div>

            <div className="overflow-x-auto">
              {agentStats.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <Users className="w-16 h-16 mx-auto mb-2" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Eligible Agents</h3>
                  <p className="text-gray-600 mb-4">
                    There are no agents with both <strong>verified status</strong> and an <strong>active paid plan (7/30/90-day)</strong>.
                  </p>
                  
                  {stats.allAgents && stats.allAgents.length > 0 && (
                    <div className="mt-6 max-w-2xl mx-auto">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                        <h4 className="font-semibold text-yellow-900 mb-2">Agents in System:</h4>
                        <div className="space-y-2 text-sm">
                          {stats.allAgents.map((agent) => {
                            const agentName = agent.users?.full_name || agent.business_name || 'Unnamed Agent';
                            return (
                              <div key={agent.id} className="flex items-center justify-between bg-white px-3 py-2 rounded">
                                <div>
                                  <span className="text-gray-900 font-medium">{agentName}</span>
                                  {agent.business_name && (
                                    <span className="text-gray-500 text-xs ml-2">({agent.business_name})</span>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    agent.verification_status === 'approved' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {agent.verification_status || 'pending'}
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    agent.payment_status === 'paid' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {agent.payment_status || 'unpaid'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 text-sm text-yellow-800">
                          <p><strong>Action needed:</strong> Go to Agent Management to approve agents and verify they&apos;ve completed payment.</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6">
                    <Link 
                      href="/admin/agents" 
                      className="inline-flex items-center px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
                    >
                      Manage Agents
                    </Link>
                  </div>
                </div>
              ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Requests
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Assigned
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Queue Position
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agentStats.map((agent, index) => (
                    <tr key={agent.id} className={agent.nextInQueue ? 'bg-green-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                          {agent.business && (
                            <div className="text-xs text-gray-500">{agent.business}</div>
                          )}
                          <div className="text-sm text-gray-500">{agent.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{agent.requestCount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {agent.lastAssigned 
                            ? new Date(agent.lastAssigned).toLocaleString()
                            : 'Never'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {index === 0 ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Next in Queue
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">#{index + 1}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </div>
          </div>

       
        </div>
      </div>
    </>
  );
}
