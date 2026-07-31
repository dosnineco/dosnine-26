import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';

const RATE_MAP = {
  'USD 30K': 0.04,
  'USD 20K': 0.0325,
  'USD 10K': 0.03,
};

export default function HillLotInvestorsPage() {
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const verify = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/admin/verify-admin');
        const payload = await response.json();
        if (!response.ok || !payload?.isAdmin) {
          setIsAdmin(false);
          toast.error('Access denied');
          return;
        }
        setIsAdmin(true);
        fetchData();
      } catch (error) {
        setIsAdmin(false);
        toast.error('Unable to verify admin access');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/hill-lot-investors', { credentials: 'include' });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to load investor data');
      }
      setItems(payload.items || []);
    } catch (error) {
      toast.error(error.message || 'Unable to load investor data');
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const totalInvestors = items.length;
    const totalRaised = items.reduce((sum, item) => sum + Number(item.amount_value || 0), 0);
    const estimatedAnnual = items.reduce((sum, item) => sum + Number(item.amount_value || 0) * (item.rate_value || 0), 0);

    return {
      totalInvestors,
      totalRaised,
      estimatedAnnual,
    };
  }, [items]);

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Access denied</h1>
          <p className="text-slate-600">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Hill Lot Investors — Admin</title>
      </Head>
      <div className="min-h-screen bg-slate-50">
        <AdminLayout />
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Hill Lot Investor Interest</h1>
              <p className="text-sm text-slate-600">Review submissions, estimated capital, and projected annual returns.</p>
            </div>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[8px] border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Total investors</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{summary.totalInvestors}</p>
            </div>
            <div className="rounded-[8px] border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Estimated raised</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">USD {summary.totalRaised.toLocaleString()}</p>
            </div>
            <div className="rounded-[8px] border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Estimated annual return</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">USD {summary.estimatedAnnual.toLocaleString()}</p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-[8px] border border-slate-200 bg-white p-8 text-center text-slate-600">Loading investor submissions...</div>
          ) : items.length === 0 ? (
            <div className="rounded-[8px] border border-slate-200 bg-white p-8 text-center text-slate-600">No investor interest has been submitted yet.</div>
          ) : (
            <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Projected Annual</th>
                    <th className="px-4 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">{item.full_name}</td>
                      <td className="px-4 py-3">{item.email}</td>
                      <td className="px-4 py-3">{item.phone || '—'}</td>
                      <td className="px-4 py-3">{item.stay_type || '—'}</td>
                      <td className="px-4 py-3">{item.amount_label || '—'}</td>
                      <td className="px-4 py-3">{item.rate_label || '—'}</td>
                      <td className="px-4 py-3">USD {Number(item.projected_annual || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">{item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
