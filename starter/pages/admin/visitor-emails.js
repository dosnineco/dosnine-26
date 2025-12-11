import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { supabase } from '../../lib/supabase';

export default function AdminVisitorEmails() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [exportData, setExportData] = useState(null);

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
          .select('role')
          .eq('clerk_id', user.id)
          .single();

        if (userData?.role !== 'admin') {
          router.push('/');
          return;
        }

        // Fetch visitor emails
        const { data, count, error } = await supabase
          .from('visitor_emails')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        setEmails(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Error fetching visitor emails:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetch();
  }, [user, isLoaded, router]);

  const handleExport = () => {
    if (emails.length === 0) return;

    const csv = [
      ['Email', 'Date', 'Referrer', 'User Agent'],
      ...emails.map(e => [
        e.email,
        new Date(e.created_at).toLocaleString(),
        e.referrer || 'Direct',
        e.user_agent?.split(' ')[0] || 'Unknown'
      ])
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitor-emails-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Visitor Emails - Admin</title>
        </Head>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading...</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Visitor Emails - Admin Dashboard</title>
      </Head>
      <Header />

      <main className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Visitor Emails</h1>
            <p className="text-gray-600">Emails captured from site visitors via popup</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="text-gray-600 text-sm font-medium">Total Emails</div>
              <div className="text-3xl font-bold text-blue-600 mt-2">{totalCount}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="text-gray-600 text-sm font-medium">This Week</div>
              <div className="text-3xl font-bold text-green-600 mt-2">
                {emails.filter(e => {
                  const date = new Date(e.created_at);
                  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                  return date > oneWeekAgo;
                }).length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <button
                onClick={handleExport}
                disabled={emails.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                ⬇️ Export CSV
              </button>
            </div>
          </div>

          {/* Emails Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Source</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Device</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-600">
                        No visitor emails yet. The popup captures emails from new visitors.
                      </td>
                    </tr>
                  ) : (
                    emails.map((email, idx) => (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{email.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(email.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {email.referrer ? new URL(email.referrer).hostname : 'Direct'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {email.user_agent?.split(' ')[0] || 'Unknown'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
