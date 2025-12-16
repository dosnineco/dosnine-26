import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';
import { useRoleProtection } from '../../lib/useRoleProtection';
import { isAdmin } from '../../lib/rbac';
import { DollarSign, Users, TrendingUp, Calendar } from 'lucide-react';

export default function AdminRevenue() {
  const { loading: authLoading } = useRoleProtection({
    checkAccess: isAdmin,
    redirectTo: '/dashboard',
    message: 'Admin access only'
  });

  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    paidAgents: 0,
    pendingPayments: 0,
    recentPayments: []
  });

  useEffect(() => {
    if (!authLoading) {
      fetchRevenueData();
    }
  }, [authLoading]);

  async function fetchRevenueData() {
    try {
      // Get all paid agents
      const { data: paidAgents, error: paidError } = await supabase
        .from('agents')
        .select('id, full_name, payment_amount, payment_date, paypal_transaction_id')
        .eq('payment_status', 'paid')
        .order('payment_date', { ascending: false });

      if (paidError) throw paidError;

      // Get agents pending payment
      const { data: unpaidAgents, error: unpaidError } = await supabase
        .from('agents')
        .select('id')
        .eq('verification_status', 'approved')
        .eq('payment_status', 'unpaid');

      if (unpaidError) throw unpaidError;

      // Calculate total revenue
      const totalRevenue = paidAgents?.reduce((sum, agent) => sum + (parseFloat(agent.payment_amount) || 0), 0) || 0;

      setStats({
        totalRevenue,
        paidAgents: paidAgents?.length || 0,
        pendingPayments: unpaidAgents?.length || 0,
        recentPayments: paidAgents || []
      });
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading revenue data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Revenue Dashboard — Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Revenue Dashboard</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-accent">${stats.totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="w-12 h-12 text-accent/20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Paid Agents</p>
                  <p className="text-3xl font-bold text-green-600">{stats.paidAgents}</p>
                </div>
                <Users className="w-12 h-12 text-green-600/20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Pending Payments</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pendingPayments}</p>
                  <p className="text-xs text-gray-500 mt-1">Potential: ${(stats.pendingPayments * 50).toFixed(2)}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-yellow-600/20" />
              </div>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recent Payments</h2>
            </div>

            {stats.recentPayments.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No payments received yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.recentPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{payment.full_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-accent">
                            ${payment.payment_amount?.toFixed(2) || '0.00'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs text-gray-500 font-mono">
                            {payment.paypal_transaction_id?.substring(0, 20)}...
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Revenue Model Info */}
          <div className="mt-8 bg-gradient-to-r from-accent/10 to-accent/5 border-l-4 border-accent rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Revenue Model</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• <strong>Agent Fee:</strong> $50 one-time payment per verified agent</li>
              <li>• <strong>Client Requests:</strong> FREE for visitors (drives agent signups)</li>
              <li>• <strong>Future:</strong> Property boosting, profile boosting, premium features</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
