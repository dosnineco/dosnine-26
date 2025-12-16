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
      // Get paid agents with request counts
      const { data: agents } = await supabase
        .from('agents')
        .select(`
          id,
          full_name,
          email,
          last_request_assigned_at,
          service_requests:service_requests!assigned_agent_id(count)
        `)
        .eq('verification_status', 'approved')
        .eq('payment_status', 'paid')
        .order('last_request_assigned_at', { ascending: true, nullsFirst: true });

      // Get request stats
      const { data: requests } = await supabase
        .from('service_requests')
        .select('status, assigned_agent_id');

      const assignedCount = requests?.filter(r => r.assigned_agent_id).length || 0;
      const openCount = requests?.filter(r => r.status === 'open').length || 0;

      setStats({
        totalAgents: agents?.length || 0,
        totalRequests: requests?.length || 0,
        assignedRequests: assignedCount,
        openRequests: openCount
      });

      // Process agent stats
      const agentData = agents?.map(agent => ({
        id: agent.id,
        name: agent.full_name,
        email: agent.email,
        requestCount: agent.service_requests?.[0]?.count || 0,
        lastAssigned: agent.last_request_assigned_at,
        nextInQueue: !agent.last_request_assigned_at
      })) || [];

      setAgentStats(agentData);
    } catch (error) {
      // Error loading stats
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
              <h1 className="text-3xl font-bold text-gray-900">Fair Request Allocation</h1>
              <Link href="/admin/dashboard" className="text-accent hover:underline">
                ← Back to Admin
              </Link>
            </div>
            <p className="text-gray-600">Round-robin distribution system ensures equal opportunities for all agents</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Agents</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalAgents}</p>
                </div>
                <Users className="w-10 h-10 text-blue-500" />
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
            </div>
          </div>

          {/* How It Works */}
          <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">How Fair Allocation Works</h3>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>New requests are automatically assigned to the agent who received a request longest ago (or never)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Only verified and paid agents are eligible to receive requests</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Each request is unique and assigned to only one agent</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Round-robin algorithm ensures equal distribution over time</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
