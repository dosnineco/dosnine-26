import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/router';

export default function AnalyticsDashboard() {
  const { userId } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [range, setRange] = useState('day');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    fetchAnalytics();
  }, [range, userId]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, range]);

  if (!userId) return <div className="p-4">Loading...</div>;
  if (!data) return <div className="p-4">Loading analytics...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>

        {/* Range Selector & Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-8 flex gap-4 items-center flex-wrap">
          <div className="flex gap-2">
            {['day', 'week', 'month', '3month', 'year'].map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-2 rounded font-medium transition ${
                  range === r
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {r === '3month' ? '3 Months' : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-auto">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh Now'}
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow">
            <div className="text-sm opacity-90">Total Clicks</div>
            <div className="text-4xl font-bold mt-2">{data.total_clicks}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow">
            <div className="text-sm opacity-90">Top Page</div>
            <div className="text-2xl font-bold mt-2 truncate">
              {data.byPath[0]?.path || 'N/A'}
            </div>
            <div className="text-sm opacity-90 mt-1">{data.byPath[0]?.count || 0} clicks</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow">
            <div className="text-sm opacity-90">Top Source</div>
            <div className="text-2xl font-bold mt-2 truncate">
              {data.bySource[0]?.source || 'direct'}
            </div>
            <div className="text-sm opacity-90 mt-1">{data.bySource[0]?.count || 0} clicks</div>
          </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Pages */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-bold">Top Pages</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left">Path</th>
                  <th className="p-4 text-right">Clicks</th>
                  <th className="p-4 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {data.byPath.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-4 truncate">{row.path}</td>
                    <td className="p-4 text-right font-medium">{row.count}</td>
                    <td className="p-4 text-right text-gray-600">
                      {((row.count / data.total_clicks) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Traffic Sources */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-bold">Traffic Sources</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left">Source</th>
                  <th className="p-4 text-right">Clicks</th>
                  <th className="p-4 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {data.bySource.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{row.source}</td>
                    <td className="p-4 text-right">{row.count}</td>
                    <td className="p-4 text-right text-gray-600">
                      {((row.count / data.total_clicks) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Traffic Flow */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-bold">Traffic Flow (Source → Page)</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-left">Flow</th>
                <th className="p-4 text-right">Clicks</th>
                <th className="p-4 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {data.bySourePath.map((row, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-mono text-xs truncate">{row.flow}</td>
                  <td className="p-4 text-right">{row.count}</td>
                  <td className="p-4 text-right text-gray-600">
                    {((row.count / data.total_clicks) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-bold">Recent Events</h2>
          </div>
          <div className="p-4 bg-gray-900 text-green-400 font-mono text-xs overflow-auto max-h-96">
            {data.rows.map((row, i) => (
              <div key={i} className="py-1 border-b border-green-900">
                <span className="text-gray-400">{new Date(row.created_at).toLocaleTimeString()}</span>
                {' '}<span className="text-blue-300">{row.path}</span>
                {' '}<span className="text-yellow-300">from</span>
                {' '}<span className="text-cyan-300">{row.source || 'direct'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-xs text-gray-500">
          Period: {new Date(data.period.from).toLocaleString()} to {new Date(data.period.to).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
