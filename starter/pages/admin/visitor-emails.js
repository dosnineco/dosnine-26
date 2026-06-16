import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';

export default function AdminVisitorEmails() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [deleting, setDeleting] = useState(null);

  const interestStats = useMemo(() => {
    return emails.reduce((acc, item) => {
      const intent = item.intent || 'unknown';
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {});
  }, [emails]);

  const tierStats = useMemo(() => {
    return emails.reduce((acc, item) => {
      const tier = item.tier || 'unknown';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {});
  }, [emails]);

  const hillLotCount = useMemo(() => {
    return emails.filter((item) => item.page === '/hill-lot' || item.source === 'naya-zanzibar-interest-form').length;
  }, [emails]);

  const formatLabel = (value) => {
    return value
      .toString()
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

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

      setEmails((prev) => prev.filter((e) => e.id !== emailId));
      setTotalCount((prev) => prev - 1);
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
        console.error('Failed to fetch visitor emails:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetch();
  }, [user, isLoaded, router]);

  const handleExport = () => {
    if (emails.length === 0) return;

    const csv = [
      ['Name', 'Email', 'Date', 'Source', 'Interest', 'Tier', 'Message'],
      ...emails.map((e) => [
        e.full_name || '',
        e.email,
        new Date(e.created_at).toLocaleString(),
        e.source || 'Direct',
        e.intent || 'Unknown',
        e.tier || 'Unknown',
        (e.message || '').replace(/"/g, '""'),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
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

  const totalLoaded = emails.length;

  return (
    <>
      <Head>
        <title>Visitor Emails - Admin Dashboard</title>
      </Head>

      <main className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <AdminLayout />

          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="text-gray-600 text-sm font-medium">Total Email Entries</div>
              <div className="text-3xl font-bold text-blue-600 mt-2">{totalCount}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="text-gray-600 text-sm font-medium">Recent (% of loaded)</div>
              <div className="text-3xl font-bold text-green-600 mt-2">{totalLoaded}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="text-gray-600 text-sm font-medium">Hill Lot requests</div>
              <div className="mt-2 text-lg font-semibold text-[#10201a]">{totalLoaded ? `${Math.round((hillLotCount / totalLoaded) * 100)}%` : '0%'}</div>
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

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Interest breakdown</h2>
              <div className="mt-4 space-y-2">
                {Object.entries(interestStats).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm text-gray-700">
                    <span>{formatLabel(key)}</span>
                    <span>{value} ({totalLoaded ? `${Math.round((value / totalLoaded) * 100)}%` : '0%'})</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Tier breakdown</h2>
              <div className="mt-4 space-y-2">
                {Object.entries(tierStats).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm text-gray-700">
                    <span>{formatLabel(key)}</span>
                    <span>{value} ({totalLoaded ? `${Math.round((value / totalLoaded) * 100)}%` : '0%'})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Interest</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Tier</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Source</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-600">
                        No visitor emails yet. The hill-lot interest form submissions will appear here.
                      </td>
                    </tr>
                  ) : (
                    emails.map((emailRecord) => (
                      <tr key={emailRecord.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{emailRecord.full_name || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{emailRecord.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(emailRecord.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{emailRecord.intent || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{emailRecord.tier || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{emailRecord.source || 'Direct'}</td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleDelete(emailRecord.id)}
                            disabled={deleting === emailRecord.id}
                            className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleting === emailRecord.id ? 'Deleting...' : 'Delete'}
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
