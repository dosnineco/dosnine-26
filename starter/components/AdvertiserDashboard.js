import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { BarChart3, CalendarDays, Eye, MousePointer2, Plus, Trash2 } from 'lucide-react';

const formatDate = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not set'
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatMoney = (value) => `J$${Number(value || 0).toLocaleString()}`;

export default function AdvertiserDashboard({ overview, isAdmin = false, onRefresh }) {
  const [editingAdId, setEditingAdId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const stats = overview?.adStats || {};
  const advertisements = Array.isArray(overview?.advertisements) ? overview.advertisements : [];
  const submissions = Array.isArray(overview?.sponsorSubmissions) ? overview.sponsorSubmissions : [];
  const inquiries = Array.isArray(overview?.adInquiries) ? overview.adInquiries : [];

  const startEditing = (ad) => {
    setEditingAdId(ad.id);
    setEditValues({
      title: ad.title || ad.company_name || '',
      description: ad.description || '',
      phone: ad.phone || '',
      website: ad.website || '',
    });
    setNotice('');
  };

  const saveEdits = async (adId) => {
    setSaving(true);
    setNotice('');
    try {
      const response = await fetch('/api/advertisements/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: adId, ...editValues }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to update this ad.');
      }
      setEditingAdId(null);
      setNotice('Ad updated.');
      await onRefresh();
    } catch (error) {
      setNotice(error.message || 'Unable to update this ad.');
    } finally {
      setSaving(false);
    }
  };

  const deleteAd = async (adId) => {
    if (!window.confirm('Delete this ad? This action cannot be undone and ads are non-refundable.')) return;
    setSaving(true);
    setNotice('');
    try {
      const response = await fetch('/api/advertisements/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: adId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to delete this ad.');
      }
      setNotice('Ad deleted.');
      await onRefresh();
    } catch (error) {
      setNotice(error.message || 'Unable to delete this ad.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>Advertiser Dashboard — Dosnine</title>
      </Head>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Advertiser account</p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">Your ad campaigns</h1>
            <p className="mt-2 text-gray-600">Manage your ads, payment status, campaign dates, and results.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {isAdmin && (
              <Link href="/admin/dashboard" className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-700">
                Open Admin Dashboard
              </Link>
            )}
            <Link href="/advertise" className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-white hover:bg-accent/90">
              <Plus className="h-5 w-5" aria-hidden="true" />
              Create or pay for an ad
            </Link>
          </div>
        </header>

        {notice && (
          <p role="status" className="mb-5 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-800">
            {notice}
          </p>
        )}

        <section aria-label="Ad performance" className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total campaigns', value: stats.totalAds || 0, icon: BarChart3 },
            { label: 'Active ads', value: stats.activeAds || 0, icon: CalendarDays },
            { label: 'Total views', value: Number(stats.totalViews || 0).toLocaleString(), icon: Eye },
            { label: 'Total clicks', value: Number(stats.totalClicks || 0).toLocaleString(), icon: MousePointer2 },
          ].map(({ label, value, icon: Icon }) => (
            <article key={label} className="rounded-2xl bg-gray-50 p-5">
              <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
              <p className="mt-4 text-sm text-gray-600">{label}</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
            </article>
          ))}
        </section>

        <section className="mb-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Your ads</h2>
              <p className="mt-1 text-sm text-gray-600">Edit campaign details and track start and expiry dates.</p>
            </div>
            <span className="text-sm text-gray-500">{advertisements.length} ads</span>
          </div>
          {advertisements.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center">
              <p className="font-semibold text-gray-900">No ads yet</p>
              <p className="mt-2 text-sm text-gray-600">Create a campaign to see its status and results here.</p>
              <Link href="/advertise" className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent/90">
                Start an ad campaign
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {advertisements.map((ad) => (
                <article key={ad.id} className="rounded-2xl bg-white p-5 ring-1 ring-gray-200">
                  {editingAdId === ad.id ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        ['title', 'Ad title'],
                        ['phone', 'Phone'],
                        ['website', 'Website'],
                      ].map(([field, label]) => (
                        <label key={field} className="text-sm font-medium text-gray-700">
                          {label}
                          <input
                            value={editValues[field]}
                            onChange={(event) => setEditValues((current) => ({ ...current, [field]: event.target.value }))}
                            className="mt-1 w-full rounded-lg bg-gray-50 px-3 py-2"
                          />
                        </label>
                      ))}
                      <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                        Description
                        <textarea
                          value={editValues.description}
                          onChange={(event) => setEditValues((current) => ({ ...current, description: event.target.value }))}
                          rows={3}
                          className="mt-1 w-full rounded-lg bg-gray-50 px-3 py-2"
                        />
                      </label>
                      <div className="flex gap-2 sm:col-span-2">
                        <button type="button" disabled={saving} onClick={() => saveEdits(ad.id)} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                          {saving ? 'Saving…' : 'Save changes'}
                        </button>
                        <button type="button" disabled={saving} onClick={() => setEditingAdId(null)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{ad.title || ad.company_name || 'Ad campaign'}</h3>
                          <p className="mt-1 text-sm text-gray-600">{ad.company_name} · {ad.category || 'General'}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ad.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                          {ad.is_active ? 'Active' : 'Inactive / awaiting approval'}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <p><span className="text-gray-500">Created:</span> {formatDate(ad.created_at)}</p>
                        <p><span className="text-gray-500">Expires:</span> {formatDate(ad.expires_at)}</p>
                        <p><span className="text-gray-500">Views:</span> {Number(ad.impressions || 0).toLocaleString()}</p>
                        <p><span className="text-gray-500">Clicks:</span> {Number(ad.clicks || 0).toLocaleString()}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" disabled={saving} onClick={() => startEditing(ad)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800">
                          Edit ad
                        </button>
                        <button type="button" disabled={saving} onClick={() => deleteAd(ad.id)} className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900">Campaign and payment history</h2>
          <p className="mb-4 mt-1 text-sm text-gray-600">Review submission dates, plan lengths, scheduled months, and payment status.</p>
          {submissions.length === 0 ? (
            <p className="rounded-2xl bg-gray-50 p-5 text-sm text-gray-600">No ad submissions yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-gray-200">
              <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Business / campaign</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Scheduled month</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submissions.map((submission) => (
                    <tr key={submission.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{submission.company_name}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(submission.submitted_at)}</td>
                      <td className="px-4 py-3 text-gray-600">{submission.plan_name || submission.plan_id || '—'}{submission.duration_days ? ` · ${submission.duration_days} days` : ''}</td>
                      <td className="px-4 py-3 text-gray-600">{submission.scheduled_month || 'Not scheduled'}</td>
                      <td className="px-4 py-3 text-gray-600">{formatMoney(submission.amount)}</td>
                      <td className="px-4 py-3 capitalize text-gray-700">{String(submission.payment_status || submission.status || 'unknown').replaceAll('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {inquiries.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-bold text-gray-900">Ad enquiries</h2>
            <div className="space-y-3">
              {inquiries.map((inquiry) => (
                <article key={inquiry.id} className="rounded-xl bg-gray-50 p-4">
                  <p className="font-semibold text-gray-900">{inquiry.client_name || 'Customer enquiry'}</p>
                  <p className="mt-1 text-sm text-gray-700">{inquiry.message}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    {inquiry.client_email} {inquiry.client_phone ? `· ${inquiry.client_phone}` : ''} · {formatDate(inquiry.created_at)}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
