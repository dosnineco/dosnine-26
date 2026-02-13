import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { FiStar, FiTrash2, FiEye, FiGrid, FiUsers, FiZap, FiDollarSign, FiClock, FiTrendingUp, FiMail, FiPackage } from 'react-icons/fi';
import { formatJMD, formatMoney } from '../../lib/formatMoney';
import AdminLayout from '../../components/AdminLayout';

export default function AdminDashboard() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('emails');
  const [users, setUsers] = useState([]);
  const [visitorEmails, setVisitorEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('users')
        .select('role, email, full_name')
        .eq('clerk_id', user.id)
        .single();

      // SECURITY FIX: Verify admin has valid data (not NULL)
      if (data?.role !== 'admin') {
        toast.error('Access denied: Admin only');
        setIsAdmin(false);
        // Redirect to home after 1 second
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
        return;
      }

      if (!data.email || !data.full_name) {
        console.error('❌ SECURITY: Admin user has NULL data');
        toast.error('Access denied: Admin account incomplete');
        setIsAdmin(false);
        // Redirect to home after 1 second
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
        return;
      }

      setIsAdmin(true);
      fetchData();
    } catch (err) {
      setIsAdmin(false);
    }
  };

  const exportEmailsCSV = () => {
    if (visitorEmails.length === 0) {
      toast.error('No emails to export');
      return;
    }

    const headers = ['Email', 'Phone', 'Source', 'Date'];
    const rows = visitorEmails.map(item => [
      item.email,
      item.phone || '',
      item.referrer ? new URL(item.referrer).hostname : 'Direct',
      new Date(item.created_at).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `visitor-emails-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Emails exported successfully!');
  };



  const fetchData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'users') {
        const { data } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
        setUsers(data || []);
      } else if (activeTab === 'emails') {
        const { data } = await supabase
          .from('visitor_emails')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000);
        setVisitorEmails(data || []);
      }
    } catch (err) {
      toast.error('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleDeleteRequest = async (requestId) => {
    if (!confirm('⚠️ DELETE this service request?\n\nThis action cannot be undone!')) return;

    try {
      // Delete associated notifications first
      const { error: notifError } = await supabase
        .from('agent_notifications')
        .delete()
        .eq('service_request_id', requestId);

      if (notifError) {
        console.error('Notification delete error:', notifError);
        // Continue even if notification deletion fails
      }

      // Delete the request
      const { error: requestError } = await supabase
        .from('service_requests')
        .delete()
        .eq('id', requestId);

      if (requestError) {
        console.error('Request delete error:', requestError);
        throw new Error(requestError.message || 'Failed to delete request');
      }

      toast.success('Request deleted successfully');
      setRequests(requests.filter((r) => r.id !== requestId));
      fetchData(); // Refetch data to ensure sync
    } catch (err) {
      console.error('Delete request error:', err);
      toast.error(err.message || 'Failed to delete request');
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
        <title>Admin Dashboard — Dosnine Properties</title>
      </Head>
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
 
      <AdminLayout />


      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : activeTab === 'emails' ? (
        /* Visitor Emails */
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Visitor Emails</h2>
              <p className="text-gray-600 text-sm mt-1">Total captured: {visitorEmails.length}</p>
            </div>
            <button
              onClick={exportEmailsCSV}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 font-medium flex items-center gap-2"
            >
              <FiGrid size={16} />
              Export CSV
            </button>
          </div>


          {visitorEmails.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-600">No visitor emails captured yet. The popup captures emails from new visitors.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Phone</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Source</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitorEmails.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-gray-900 font-medium truncate">{item.email}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{item.phone || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs truncate">
                          {item.referrer ? new URL(item.referrer).hostname : 'Direct'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Simple Users List */
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 truncate">{u.full_name || 'No name'}</h3>
                  <p className="text-sm text-gray-600 truncate">{u.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Joined {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  u.role === 'admin' ? 'bg-gray-800 text-white' :
                  u.role === 'landlord' ? 'bg-gray-200 text-gray-800' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {u.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
