import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';
import { FiPackage, FiCheck, FiX, FiClock, FiZap, FiExternalLink } from 'react-icons/fi';

export default function AdminHTVOrders() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingStatus(orderId);
    try {
      const { error } = await supabase
        .from('htv_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      ));
    } catch (err) {
      console.error('Status update error:', err);
      alert('Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async (orderId) => {
    if (!confirm('Are you sure you want to delete this order? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('htv_orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.filter(o => o.id !== orderId));
      setTotalCount(prev => prev - 1);
      alert('Order deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete order');
    }
  };

  useEffect(() => {
    if (!isLoaded) return;

    const checkAdminAndFetch = async () => {
      if (!user) {
        router.push('/');
        return;
      }

      try {
        // Check if user is admin
        const { data: userData } = await supabase
          .from('users')
          .select('role, email, full_name')
          .eq('clerk_id', user.id)
          .single();

        if (userData?.role !== 'admin') {
          router.push('/');
          return;
        }

        // Verify admin has valid data
        if (!userData.email || !userData.full_name) {
          console.error('❌ SECURITY: Admin user has NULL data');
          router.push('/');
          return;
        }

        // Fetch HTV orders
        const { data, count, error } = await supabase
          .from('htv_orders')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (error) throw error;

        setOrders(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetch();
  }, [isLoaded, user, router]);

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return styles[status] || styles.pending;
  };

  const calculateRevenue = () => {
    return orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>HTV Orders - Admin Dashboard</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-black">HTV Logo Orders</h1>
              <p className="mt-1 text-sm text-gray-600">Manage logo cutting submissions</p>
            </div>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-black hover:bg-gray-300"
            >
              ← Back to Dashboard
            </button>
          </div>

          {/* Stats Cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-gray-600">Total Orders</div>
              <div className="mt-2 text-3xl font-black text-black">{totalCount}</div>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-gray-600">Pending</div>
              <div className="mt-2 text-3xl font-black text-yellow-600">
                {orders.filter(o => o.status === 'pending').length}
              </div>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-gray-600">Completed</div>
              <div className="mt-2 text-3xl font-black text-green-600">
                {orders.filter(o => o.status === 'completed').length}
              </div>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-gray-600">Revenue (Completed)</div>
              <div className="mt-2 text-2xl font-black text-black">
                JMD {calculateRevenue().toLocaleString()}
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="rounded-xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Business
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Order Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Delivery
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Total
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Logo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                        No orders yet
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          <div className="text-xs text-gray-400">
                            {new Date(order.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-black">{order.business_name}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="text-black">{order.phone}</div>
                          {order.email && (
                            <div className="text-xs text-gray-500">{order.email}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="space-y-1">
                            <div>
                              <span className="font-medium text-black">Size:</span>{' '}
                              <span className="capitalize">{order.size}</span>
                            </div>
                            <div>
                              <span className="font-medium text-black">Color:</span>{' '}
                              <span className="capitalize">{order.color}</span>
                            </div>
                            <div>
                              <span className="font-medium text-black">Qty:</span> {order.quantity}
                            </div>
                            {order.rush_order && (
                              <div className="flex items-center gap-1 text-orange-600">
                                <FiZap className="h-3 w-3" />
                                <span className="text-xs font-bold">RUSH</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="text-black">{order.delivery_area}</div>
                          <div className="text-xs text-gray-500">
                            Fee: JMD {parseFloat(order.delivery_fee || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-black">
                            JMD {parseFloat(order.total || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            Subtotal: {parseFloat(order.subtotal || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {order.logo_url && (
                            <a
                              href={order.logo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                            >
                              <FiExternalLink className="h-4 w-4" />
                              View
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                            disabled={updatingStatus === order.id}
                            className={`rounded-lg px-3 py-1 text-sm font-medium ${getStatusBadge(
                              order.status
                            )}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes Section */}
          {orders.some(o => o.notes) && (
            <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-black">Order Notes</h2>
              {orders
                .filter(o => o.notes)
                .map(order => (
                  <div key={order.id} className="mb-4 border-l-4 border-gray-300 pl-4">
                    <div className="text-sm font-medium text-black">{order.business_name}</div>
                    <div className="mt-1 text-sm text-gray-600">{order.notes}</div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
