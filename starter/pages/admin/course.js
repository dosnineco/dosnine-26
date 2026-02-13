import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import toast from 'react-hot-toast';
import { FiDownload, FiCalendar, FiMail, FiPhone, FiDollarSign, FiCheckCircle, FiClock, FiArrowLeft } from 'react-icons/fi';

export default function AdminCourseSignups() {
  const { user } = useUser();
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, revenue: 0, potentialRevenue: 0, totalPotential: 0, adsCourse: 0 });
  const [filterCourse, setFilterCourse] = useState('all'); // 'all', 'ads', 'original'

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

      if (data?.role !== 'admin') {
        toast.error('Access denied: Admin only');
        setIsAdmin(false);
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
        return;
      }

      if (!data.email || !data.full_name) {
        console.error('❌ SECURITY: Admin user has NULL data');
        toast.error('Access denied: Admin account incomplete');
        setIsAdmin(false);
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
        return;
      }

      setIsAdmin(true);
      fetchSignups();
    } catch (err) {
      setIsAdmin(false);
    }
  };

  const fetchSignups = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching course signups from public.course_preorders...');
      
      // Select only the columns we need from the table
      const { data, error, count } = await supabase
        .from('course_preorders')
        .select('id, name, email, phone, price_choice, buy_now, discounted_amount, payment_confirmed, created_at', { count: 'exact' })
        .order('created_at', { ascending: false });

      console.log('📊 Query result:', { 
        success: !error, 
        count, 
        rowsReturned: data?.length,
        error: error?.message 
      });

      if (error) {
        console.error('❌ Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('✅ Signups loaded:', data);
      setSignups(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const adsCourse = data?.filter(s => s.price_choice?.includes('Instagram/Facebook Ads')).length || 0;
      const paid = data?.filter(s => s.payment_confirmed).length || 0;
      const pending = total - paid;
      const revenue = data?.filter(s => s.payment_confirmed).reduce((sum, s) => sum + (s.discounted_amount || 0), 0) || 0;
      const potentialRevenue = data?.filter(s => !s.payment_confirmed).reduce((sum, s) => sum + (s.discounted_amount || 0), 0) || 0;
      const totalPotential = revenue + potentialRevenue;
      
      setStats({ total, paid, pending, revenue, potentialRevenue, totalPotential, adsCourse });
      
      if (total === 0) {
        console.warn('⚠️ No signups found in database');
      }
    } catch (err) {
      console.error('❌ Error fetching signups:', err);
      toast.error(`Failed to load signups: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (signups.length === 0) {
      toast.error('No signups to export');
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Price Choice', 'Amount', 'Buy Now', 'Payment Confirmed', 'Date'];
    const rows = signups.map(item => [
      item.name,
      item.email,
      item.phone || '',
      item.price_choice || '',
      item.discounted_amount || 0,
      item.buy_now ? 'Yes' : 'No',
      item.payment_confirmed ? 'Yes' : 'No',
      new Date(item.created_at).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `course-signups-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Signups exported successfully!');
  };

  const togglePaymentStatus = async (id, currentStatus) => {
    try {
      console.log('🔄 Updating payment status for signup:', id);
      
      const { error } = await supabase
        .from('course_preorders')
        .update({ payment_confirmed: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Payment status updated`);
      fetchSignups();
    } catch (err) {
      console.error('Error updating payment status:', err);
      toast.error('Failed to update payment status');
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Checking access...</h1>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Course Signups - Admin Dashboard</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <AdminLayout />

          <div className="mb-8">
            <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
              <FiArrowLeft />
              Back to Dashboard
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <option value="all">All Courses</option>
                  <option value="ads">Instagram/Facebook Ads</option>
                  <option value="original">Original Course</option>
                </select>
                <button
                  onClick={exportCSV}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <FiDownload />
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Current Signups Overview */}
          <div className="mb-6 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              📊 Course Signups Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Total Signups</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">📱 Ads Course (FREE)</p>
                <p className="text-3xl font-bold text-blue-600">{stats.adsCourse}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">✅ Paid</p>
                <p className="text-3xl font-bold text-green-600">{stats.paid}</p>
                <p className="text-sm text-green-700 mt-1">JMD {stats.revenue.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">⏳ Pending Payment</p>
                <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
                <p className="text-sm text-amber-700 mt-1">JMD {stats.potentialRevenue.toLocaleString()}</p>
              </div>
            </div>
            {stats.pending > 0 && (
              <div className="mt-6 bg-white rounded-lg p-4 shadow-sm border border-indigo-200">
                <p className="text-sm text-gray-600 font-medium mb-2">💰 Potential Total Revenue</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-indigo-600">JMD {stats.totalPotential.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">if all pending payments confirmed</p>
                </div>
              </div>
            )}
          </div>

          {/* Unpaid Signups Alert */}
          {stats.pending > 0 && (
            <div className="mb-6 rounded-lg bg-amber-50 border border-amber-300 p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="rounded-full bg-amber-500 p-2">
                  <FiClock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-900">
                    {stats.pending} Pending Payment{stats.pending > 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-amber-800 mt-1">
                    Potential revenue: <span className="font-bold">JMD {stats.potentialRevenue.toLocaleString()}</span>
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {signups
                  .filter(s => !s.payment_confirmed)
                  .filter(s => {
                    if (filterCourse === 'all') return true;
                    const isAdsCourse = s.price_choice?.includes('Instagram/Facebook Ads');
                    return filterCourse === 'ads' ? isAdsCourse : !isAdsCourse;
                  })
                  .map((signup, index) => {
                    const isAdsCourse = signup.price_choice?.includes('Instagram/Facebook Ads');
                    return (
                  <div key={signup.id} className="bg-white rounded-lg p-4 border border-amber-200 hover:border-amber-400 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-gray-900 truncate">{signup.name}</span>
                          {isAdsCourse && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                              📱 Ads Course
                            </span>
                          )}
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {new Date(signup.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1 ml-8">
                          <div className="flex items-center gap-2">
                            <FiMail className="text-gray-400 flex-shrink-0" />
                            <a href={`mailto:${signup.email}`} className="hover:text-indigo-600 truncate">{signup.email}</a>
                          </div>
                          {signup.phone && (
                            <div className="flex items-center gap-2">
                              <FiPhone className="text-gray-400 flex-shrink-0" />
                              <a href={`tel:${signup.phone}`} className="hover:text-indigo-600">{signup.phone}</a>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 lg:flex-shrink-0">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            JMD {(signup.discounted_amount || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{signup.price_choice || 'Course'}</div>
                          {signup.buy_now && (
                            <span className="inline-block mt-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                              ⚡ Buy Now
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => togglePaymentStatus(signup.id, signup.payment_confirmed)}
                          className="whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm"
                        >
                          Mark Paid
                        </button>
                      </div>
                    </div>
                  </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Signups Table */}
          <div className="rounded-lg bg-white shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">All Signups Details</h3>
              <p className="text-sm text-gray-600 mt-1">Complete list of all course signups with payment status</p>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
                    <p className="mt-4 text-sm text-gray-600">Loading signups...</p>
                  </div>
                </div>
              ) : signups.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-gray-600">No course signups yet</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Course</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Buy Now</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Payment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {signups
                      .filter(signup => {
                        if (filterCourse === 'all') return true;
                        const isAdsCourse = signup.price_choice?.includes('Instagram/Facebook Ads');
                        return filterCourse === 'ads' ? isAdsCourse : !isAdsCourse;
                      })
                      .map((signup) => {
                        const isAdsCourse = signup.price_choice?.includes('Instagram/Facebook Ads');
                        return (
                      <tr 
                        key={signup.id} 
                        className={`hover:bg-gray-50 transition-colors ${
                          !signup.payment_confirmed ? 'bg-amber-50/50 border-l-4 border-amber-400' : 'bg-white'
                        }`}
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <FiCalendar className="text-gray-400" />
                            {new Date(signup.created_at).toLocaleDateString()}
                            <div className="text-xs text-gray-500">
                              {new Date(signup.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">{signup.name}</div>
                            {!signup.payment_confirmed && (
                              <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-semibold">
                                UNPAID
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isAdsCourse ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                              📱 Ads Course (FREE)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
                              📚 Original Course
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <FiMail className="text-gray-400" />
                              <a href={`mailto:${signup.email}`} className="hover:text-indigo-600">
                                {signup.email}
                              </a>
                            </div>
                            {signup.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <FiPhone className="text-gray-400" />
                                <a href={`tel:${signup.phone}`} className="hover:text-indigo-600">
                                  {signup.phone}
                                </a>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <div className="font-semibold text-gray-900">
                            JMD {(signup.discounted_amount || 0).toLocaleString()}
                          </div>
                          {signup.price_choice && (
                            <div className="text-xs text-gray-500">{signup.price_choice}</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {signup.buy_now ? (
                            <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                              No
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {signup.payment_confirmed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                              <FiCheckCircle />
                              Confirmed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                              <FiClock />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <button
                            onClick={() => togglePaymentStatus(signup.id, signup.payment_confirmed)}
                            className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                              signup.payment_confirmed
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            }`}
                          >
                            {signup.payment_confirmed ? 'Mark Pending' : 'Mark Paid'}
                          </button>
                        </td>
                      </tr>
                        );
                      })}
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
