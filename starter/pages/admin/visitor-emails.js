import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';

export default function AdminVisitorEmails() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [exportData, setExportData] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (emailId) => {
    if (!confirm('Are you sure you want to delete this email? This cannot be undone.')) {
      return;
    }

    setDeleting(emailId);
    try {
      const response = await fetch('/api/admin/visitor-emails', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: emailId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to delete email');

      setEmails(prev => prev.filter(e => e.id !== emailId));
      setTotalCount(prev => prev - 1);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete email');
    } finally {
      setDeleting(null);
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
        const verifyResponse = await fetch('/api/admin/verify-admin');
        const verifyPayload = await verifyResponse.json();

        if (!verifyResponse.ok || !verifyPayload?.isAdmin) {
          router.push('/');
          return;
        }

        // SECURITY FIX: Verify admin has valid data (not NULL)
        if (!verifyPayload.email || !verifyPayload.name) {
          console.error('❌ SECURITY: Admin user has NULL data');
          router.push('/');
          return;
        }

        const response = await fetch('/api/admin/visitor-emails');
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to load visitor emails');
        }

        setEmails(payload.emails || []);
        setTotalCount(payload.totalCount || 0);
      } catch (err) {
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
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Visitor Emails - Admin Dashboard</title>
      </Head>

      <main className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <AdminLayout />
          

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
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-600">
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
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleDelete(email.id)}
                            disabled={deleting === email.id}
                            className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleting === email.id ? 'Deleting...' : 'Delete'}
                          </button>
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

    </>
  );
}
