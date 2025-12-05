import React from 'react';
import { createClient } from '@supabase/supabase-js';

function formatPercent(count, total) {
  if (!total) return '0.0%';
  return `${((count / total) * 100).toFixed(1)}%`;
}

export default function AdminAnalytics({ total_clicks, byPath, bySource, bySourcePath, recentRows, range, period }) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Admin Analytics</h1>
        <div className="mb-4 text-sm text-gray-600">Range: <strong>{range}</strong> — {new Date(period.from).toLocaleString()} to {new Date(period.to).toLocaleString()}</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-white rounded shadow">
            <div className="text-sm text-gray-500">Total Clicks</div>
            <div className="text-2xl font-bold">{total_clicks}</div>
          </div>

          <div className="p-4 bg-white rounded shadow">
            <div className="text-sm text-gray-500">Top Page</div>
            <div className="text-lg font-semibold">{byPath[0]?.path || 'N/A'}</div>
            <div className="text-sm text-gray-500">{byPath[0]?.count || 0} clicks</div>
          </div>

          <div className="p-4 bg-white rounded shadow">
            <div className="text-sm text-gray-500">Top Source</div>
            <div className="text-lg font-semibold">{bySource[0]?.source || 'direct'}</div>
            <div className="text-sm text-gray-500">{bySource[0]?.count || 0} clicks</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded shadow overflow-hidden">
            <div className="p-4 border-b bg-gray-50">Top Pages</div>
            <table className="w-full text-sm">
              <thead className="bg-white">
                <tr>
                  <th className="text-left p-3">Path</th>
                  <th className="text-right p-3">Clicks</th>
                  <th className="text-right p-3">%</th>
                </tr>
              </thead>
              <tbody>
                {byPath.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-3 truncate max-w-[400px]">{r.path}</td>
                    <td className="p-3 text-right">{r.count}</td>
                    <td className="p-3 text-right text-gray-600">{formatPercent(r.count, total_clicks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded shadow overflow-hidden">
            <div className="p-4 border-b bg-gray-50">Traffic Sources</div>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-3">Source</th>
                  <th className="text-right p-3">Clicks</th>
                  <th className="text-right p-3">%</th>
                </tr>
              </thead>
              <tbody>
                {bySource.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-3">{r.source}</td>
                    <td className="p-3 text-right">{r.count}</td>
                    <td className="p-3 text-right text-gray-600">{formatPercent(r.count, total_clicks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded shadow mb-6">
          <div className="p-4 border-b bg-gray-50">Traffic Flow (Source → Page)</div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-3">Flow</th>
                <th className="text-right p-3">Clicks</th>
                <th className="text-right p-3">%</th>
              </tr>
            </thead>
            <tbody>
              {bySourcePath.map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3 font-mono text-xs truncate max-w-[600px]">{r.flow}</td>
                  <td className="p-3 text-right">{r.count}</td>
                  <td className="p-3 text-right text-gray-600">{formatPercent(r.count, total_clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-500 mb-2">Recent Events (most recent first)</div>
          <div className="font-mono text-xs text-gray-700 max-h-72 overflow-auto">
            {recentRows.map((r, i) => (
              <div key={i} className="py-1 border-b">
                <span className="text-gray-500">{new Date(r.created_at).toLocaleString()}</span>
                {' '}- <span className="text-blue-600">{r.path}</span>
                {' '}from <span className="text-green-600">{r.source || 'direct'}</span>
                {' '}by <span className="text-yellow-600">{r.session_id || 'anon'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const { range = 'day' } = context.query;
  const now = new Date();
  const fromDate = new Date();

  switch (range) {
    case 'week':
      fromDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      fromDate.setMonth(now.getMonth() - 1);
      break;
    case '3month':
      fromDate.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      fromDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'day':
    default:
      fromDate.setDate(now.getDate() - 1);
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return {
      props: {
        total_clicks: 0,
        byPath: [],
        bySource: [],
        bySourcePath: [],
        recentRows: [],
        range,
        period: { from: fromDate.toISOString(), to: now.toISOString() }
      }
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

  const { data: rows, error } = await supabase
    .from('page_clicks')
    .select('*')
    .gte('created_at', fromDate.toISOString())
    .lte('created_at', now.toISOString())
    .order('created_at', { ascending: false })
    .limit(10000);

  if (error) {
    console.error('Supabase error fetching page_clicks:', error.message || error);
    return {
      props: {
        total_clicks: 0,
        byPath: [],
        bySource: [],
        bySourcePath: [],
        recentRows: [],
        range,
        period: { from: fromDate.toISOString(), to: now.toISOString() }
      }
    };
  }

  const total_clicks = (rows || []).length;
  const byPathMap = {};
  const bySourceMap = {};
  const bySourcePathMap = {};

  (rows || []).forEach(r => {
    const path = r.path || 'unknown';
    const source = r.source || 'direct';
    byPathMap[path] = (byPathMap[path] || 0) + 1;
    bySourceMap[source] = (bySourceMap[source] || 0) + 1;
    const key = `${source} → ${path}`;
    bySourcePathMap[key] = (bySourcePathMap[key] || 0) + 1;
  });

  const byPath = Object.entries(byPathMap).sort((a,b)=>b[1]-a[1]).slice(0,50).map(([path,count])=>({path,count}));
  const bySource = Object.entries(bySourceMap).sort((a,b)=>b[1]-a[1]).slice(0,50).map(([source,count])=>({source,count}));
  const bySourcePath = Object.entries(bySourcePathMap).sort((a,b)=>b[1]-a[1]).slice(0,100).map(([flow,count])=>({flow,count}));
  const recentRows = (rows || []).slice(0,200);

  return {
    props: {
      total_clicks,
      byPath,
      bySource,
      bySourcePath,
      recentRows,
      range,
      period: { from: fromDate.toISOString(), to: now.toISOString() }
    }
  };
}
