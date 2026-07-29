import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { formatJMD } from '../../lib/formatMoney';

const metricCard = (label, value, note = null) => (
  <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
    <div className="text-sm font-medium text-gray-500">{label}</div>
    <div className="mt-4 text-3xl font-semibold text-gray-900">{value}</div>
    {note ? <div className="mt-2 text-sm text-gray-500">{note}</div> : null}
  </div>
);

export default function AdminMarketIntelligence() {
  const { user, isLoaded } = useUser();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/market-intelligence');
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load market intelligence');
      }
      setMetrics(payload.metrics || {});
    } catch (error) {
      console.error('Failed fetching market intelligence:', error);
      toast.error('Could not load market intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    const verifyAdmin = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/admin/verify-admin');
        const payload = await response.json();

        if (!response.ok || !payload?.isAdmin) {
          toast.error('Access denied: Admin only');
          setIsAdmin(false);
          return;
        }

        if (!payload.email || !payload.name) {
          toast.error('Access denied: Admin account incomplete');
          setIsAdmin(false);
          return;
        }

        setIsAdmin(true);
        fetchMetrics();
      } catch (error) {
        console.error('Market intelligence auth error:', error);
        setIsAdmin(false);
      }
    };

    verifyAdmin();
  }, [user, isLoaded]);

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Admin access only</h1>
          <p className="mt-3 text-gray-600">You must be signed in as an admin to view market intelligence.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Market Intelligence — Admin</title>
      </Head>

      <main className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <AdminLayout />

          <div className="mt-8">
            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-gray-500">Dosnine Market Intelligence</p>
                  <h1 className="mt-2 text-3xl font-semibold text-gray-900">What Jamaica is searching for</h1>
                  <p className="mt-2 max-w-2xl text-sm text-gray-600">
                    Anonymous service request analytics for demand, parishes, budgets, bedroom mix, urgency and emerging search signals.
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-700">
                  Updated from live service requests only
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-14 text-center text-gray-500 shadow-sm">
              Loading market intelligence...
            </div>
          ) : !metrics ? (
            <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-14 text-center text-gray-500 shadow-sm">
              No market intelligence data available.
            </div>
          ) : (
            <div className="mt-8 space-y-8">
              <div className="grid gap-4 xl:grid-cols-4 lg:grid-cols-2">
                {metricCard('Total requests', metrics.totalRequests ?? 0)}
                {metricCard('Requests this month', metrics.requestsThisMonth ?? 0, `${metrics.currentMonthLabel || ''}`)}
                {metricCard('Average budget', metrics.averageBudget ? formatJMD(metrics.averageBudget) : 'N/A')}
                {metricCard('Average bedrooms', metrics.averageBedrooms ?? 'N/A', `${metrics.growthRate ?? 0}% demand change`)}
              </div>

              <div className="grid gap-4 xl:grid-cols-3 lg:grid-cols-2">
                {metricCard('Top parish demand', metrics.mostRequestedParish || 'N/A')}
                {metricCard('Top property type', metrics.mostRequestedProperty || 'N/A')}
                {metricCard('Demand growth vs prev month', `${metrics.growthRate ?? 0}%`, `${metrics.currentMonthLabel || ''}`)}
              </div>

              <div className="grid gap-4 xl:grid-cols-3 lg:grid-cols-2">
                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Buy / Rent mix</h2>
                  </div>
                  <div className="mt-4 space-y-3">
                    {metrics.buyRentShare?.map((item) => (
                      <div key={item.type} className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <span className="text-sm font-medium text-gray-700 capitalize">{item.type}</span>
                        <span className="text-sm font-semibold text-gray-900">{item.count} ({item.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Urgency distribution</h2>
                  </div>
                  <div className="mt-4 space-y-3">
                    {Object.entries(metrics.urgencyCounts || {}).map(([urgency, count]) => (
                      <div key={urgency} className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <span className="text-sm font-medium text-gray-700 capitalize">{urgency}</span>
                        <span className="text-sm font-semibold text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Average demand</h2>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-gray-700">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                      <div className="text-sm text-gray-500">Average bedrooms</div>
                      <div className="mt-2 text-xl font-semibold text-gray-900">{metrics.averageBedrooms ?? 'N/A'}</div>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                      <div className="text-sm text-gray-500">Total request rows</div>
                      <div className="mt-2 text-xl font-semibold text-gray-900">{metrics.totalRequests ?? 0}</div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900">Top parishes</h2>
                  <div className="mt-4 space-y-2">
                    {(metrics.parishDemand || []).length === 0 ? (
                      <p className="text-sm text-gray-500">No parish demand data.</p>
                    ) : (
                      metrics.parishDemand.slice(0, 6).map((item) => (
                        <div key={item.parish} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3">
                          <span className="text-sm text-gray-700">{item.parish}</span>
                          <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900">Bedroom demand</h2>
                  <div className="mt-4 space-y-2">
                    {(metrics.bedroomDemand || []).map((item) => (
                      <div key={item.bedrooms} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <span className="text-sm text-gray-700">{item.bedrooms}</span>
                        <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900">Rent budget ranges</h2>
                  <div className="mt-4 space-y-3">
                    {(metrics.rentBudgets || []).map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <span className="text-sm text-gray-700">{item.label}</span>
                        <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900">Purchase budget ranges</h2>
                  <div className="mt-4 space-y-3">
                    {(metrics.purchaseBudgets || []).map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <span className="text-sm text-gray-700">{item.label}</span>
                        <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Top property demand</h2>
                    <span className="text-sm text-gray-500">By property type</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {(metrics.propertyTypeDemand || []).map((item) => (
                      <div key={item.type} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <span className="text-sm text-gray-700 capitalize">{item.type}</span>
                        <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Trending search signals</h2>
                    <span className="text-sm text-gray-500">Recent requests</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {(metrics.trendingSearches || []).map((item) => (
                      <div key={item.phrase} className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                        <div className="flex items-center justify-between gap-4">
                          <span>{item.phrase}</span>
                          <span className="font-semibold text-gray-900">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Last 12 months trend</h2>
                <div className="mt-4 space-y-3">
                  {(metrics.monthlyTrend || []).map((item) => (
                    <div key={item.month} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-4 text-sm text-gray-700">
                        <span>{item.month}</span>
                        <span className="font-semibold text-gray-900">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
