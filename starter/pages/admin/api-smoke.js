import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useAuth, useUser } from '@clerk/nextjs';
import AdminLayout from '../../components/AdminLayout';

const ENDPOINTS = [
  { key: 'verify-admin', label: 'Verify Admin', method: 'GET', url: '/api/admin/verify-admin', expected: [200] },
  { key: 'admin-requests', label: 'Admin Requests', method: 'GET', url: '/api/admin/requests', expected: [200] },
  { key: 'admin-requests-mgmt', label: 'Admin Requests Management', method: 'GET', url: '/api/admin/requests-management', expected: [200] },
  { key: 'admin-agents-list', label: 'Admin Agents List', method: 'GET', url: '/api/admin/agents/list?status=all', expected: [200] },
  { key: 'admin-users', label: 'Admin Users', method: 'GET', url: '/api/admin/users', expected: [200] },
  { key: 'admin-dashboard', label: 'Admin Dashboard Data', method: 'GET', url: '/api/admin/dashboard-data?tab=emails', expected: [200] },
  { key: 'admin-alloc', label: 'Admin Allocation Stats', method: 'GET', url: '/api/admin/allocation-stats', expected: [200] },
  { key: 'admin-visitor-emails', label: 'Admin Visitor Emails', method: 'GET', url: '/api/admin/visitor-emails', expected: [200] },
  { key: 'admin-properties', label: 'Admin Properties', method: 'GET', url: '/api/admin/properties', expected: [200] },
  { key: 'admin-htv-orders', label: 'Admin HTV Orders', method: 'GET', url: '/api/admin/htv-orders', expected: [200] },
  { key: 'agent-apps', label: 'Agent Applications', method: 'GET', url: '/api/admin/agent-applications', expected: [200] },
  {
    key: 'admin-requests-post-reachable',
    label: 'Admin Requests POST Reachability',
    method: 'POST',
    url: '/api/admin/requests',
    body: { action: 'invalid' },
    expected: [400],
  },
  {
    key: 'admin-requests-mgmt-post-reachable',
    label: 'Admin Requests Mgmt POST Reachability',
    method: 'POST',
    url: '/api/admin/requests-management',
    body: { action: 'invalid', ids: [] },
    expected: [400],
  },
  {
    key: 'admin-update-status-reachable',
    label: 'Admin Agent Update Status Reachability',
    method: 'POST',
    url: '/api/admin/agents/update-status',
    body: { status: 'approved' },
    expected: [400],
  },
];

function methodColor(method) {
  if (method === 'GET') return 'text-blue-700';
  if (method === 'POST') return 'text-green-700';
  if (method === 'PATCH') return 'text-yellow-700';
  if (method === 'DELETE') return 'text-red-700';
  return 'text-gray-700';
}

export default function AdminApiSmokePage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [runningAll, setRunningAll] = useState(false);
  const [results, setResults] = useState({});
  const [logs, setLogs] = useState([]);
  const [assignRequestId, setAssignRequestId] = useState('');
  const [assignAgentId, setAssignAgentId] = useState('');
  const [assignResult, setAssignResult] = useState(null);
  const originalFetchRef = useRef(null);

  const calledMap = useMemo(() => {
    const map = {};
    logs.forEach((log) => {
      const path = (() => {
        try {
          const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
          return new URL(log.url, base).pathname;
        } catch {
          return log.url;
        }
      })();
      map[path] = (map[path] || 0) + 1;
    });
    return map;
  }, [logs]);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/admin/verify-admin');
        const payload = await response.json();
        if (response.ok && payload?.isAdmin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (!isAdmin || typeof window === 'undefined') return;
    if (originalFetchRef.current) return;

    originalFetchRef.current = window.fetch.bind(window);

    window.fetch = async (input, init = {}) => {
      const method = (init?.method || 'GET').toUpperCase();
      const url = typeof input === 'string' ? input : input?.url || '';
      const startedAt = Date.now();

      try {
        const response = await originalFetchRef.current(input, init);
        const durationMs = Date.now() - startedAt;
        setLogs((prev) => [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            method,
            url,
            status: response.status,
            ok: response.ok,
            durationMs,
            ts: new Date().toISOString(),
            source: 'live',
          },
          ...prev,
        ].slice(0, 200));
        return response;
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        setLogs((prev) => [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            method,
            url,
            status: 'network-error',
            ok: false,
            durationMs,
            ts: new Date().toISOString(),
            source: 'live',
            error: error?.message || 'Network error',
          },
          ...prev,
        ].slice(0, 200));
        throw error;
      }
    };

    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
        originalFetchRef.current = null;
      }
    };
  }, [isAdmin]);

  const instrumentedFetch = async ({ method, url, body, source = 'smoke' }) => {
    const startedAt = Date.now();
    const token = await getToken();
    const options = {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await (originalFetchRef.current || fetch)(url, options);
      const text = await response.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text || null;
      }

      const record = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        method,
        url,
        status: response.status,
        ok: response.ok,
        durationMs: Date.now() - startedAt,
        ts: new Date().toISOString(),
        source,
        payload: parsed,
      };

      setLogs((prev) => [record, ...prev].slice(0, 200));
      return record;
    } catch (error) {
      const record = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        method,
        url,
        status: 'network-error',
        ok: false,
        durationMs: Date.now() - startedAt,
        ts: new Date().toISOString(),
        source,
        error: error?.message || 'Network error',
      };
      setLogs((prev) => [record, ...prev].slice(0, 200));
      return record;
    }
  };

  const runSingle = async (endpoint) => {
    const record = await instrumentedFetch({
      method: endpoint.method,
      url: endpoint.url,
      body: endpoint.body,
      source: 'smoke',
    });

    const expected = endpoint.expected || [200];
    const success = expected.includes(record.status);

    setResults((prev) => ({
      ...prev,
      [endpoint.key]: {
        ...record,
        success,
        expected,
      },
    }));
  };

  const runAll = async () => {
    setRunningAll(true);
    for (const endpoint of ENDPOINTS) {
      await runSingle(endpoint);
    }
    setRunningAll(false);
  };

  const runAssignCaseTest = async () => {
    setAssignResult(null);
    const record = await instrumentedFetch({
      method: 'POST',
      url: '/api/admin/requests',
      body: {
        action: 'manualAssign',
        requestId: assignRequestId,
        agentId: assignAgentId,
      },
      source: 'assign-test',
    });
    setAssignResult(record);
  };

  const clearLogs = () => setLogs([]);

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access denied</h1>
          <p className="text-gray-600">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin API Smoke Test</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <AdminLayout />

          <div className="bg-white rounded-lg p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Admin API Smoke Test</h1>
            <p className="text-sm text-gray-600 mt-2">
              Run endpoint checks and watch live request logs to find unauthorized, failing, or never-called APIs.
            </p>

            <div className="flex gap-3 mt-4 flex-wrap">
              <button
                onClick={runAll}
                disabled={runningAll}
                className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {runningAll ? 'Running...' : 'Run All Smoke Tests'}
              </button>
              <button
                onClick={clearLogs}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Clear Logs
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Manual Assign Case Test</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={assignRequestId}
                onChange={(event) => setAssignRequestId(event.target.value)}
                placeholder="requestId"
                className="bg-gray-50 rounded-lg py-3 px-4"
              />
              <input
                value={assignAgentId}
                onChange={(event) => setAssignAgentId(event.target.value)}
                placeholder="agentId"
                className="bg-gray-50 rounded-lg py-3 px-4"
              />
              <button
                onClick={runAssignCaseTest}
                disabled={!assignRequestId || !assignAgentId}
                className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
              >
                Test Assign Call
              </button>
            </div>
            {assignResult && (
              <div className="mt-3 text-sm text-gray-700">
                Last assign test: <span className="font-semibold">{String(assignResult.status)}</span>
                {' '}- {assignResult.ok ? 'OK' : 'Failed'}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg p-6 mb-6 overflow-x-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Endpoint Matrix</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="text-left px-3 py-2">Endpoint</th>
                  <th className="text-left px-3 py-2">Method</th>
                  <th className="text-left px-3 py-2">Expected</th>
                  <th className="text-left px-3 py-2">Last Result</th>
                  <th className="text-left px-3 py-2">Times Called</th>
                  <th className="text-left px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map((endpoint) => {
                  const result = results[endpoint.key];
                  const path = endpoint.url.split('?')[0];
                  const timesCalled = calledMap[path] || 0;
                  return (
                    <tr key={endpoint.key} className="border-b border-gray-100">
                      <td className="px-3 py-2 text-gray-900">{endpoint.url}</td>
                      <td className={`px-3 py-2 font-medium ${methodColor(endpoint.method)}`}>{endpoint.method}</td>
                      <td className="px-3 py-2 text-gray-600">{(endpoint.expected || [200]).join(', ')}</td>
                      <td className="px-3 py-2">
                        {!result ? (
                          <span className="text-gray-400">Not tested</span>
                        ) : result.success ? (
                          <span className="text-green-700">{String(result.status)} success</span>
                        ) : (
                          <span className="text-red-700">{String(result.status)} failed</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{timesCalled}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => runSingle(endpoint)}
                          className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800"
                        >
                          Run
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-lg p-6 overflow-x-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Request Log</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="text-left px-3 py-2">Time</th>
                  <th className="text-left px-3 py-2">Source</th>
                  <th className="text-left px-3 py-2">Method</th>
                  <th className="text-left px-3 py-2">URL</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-gray-500" colSpan={6}>
                      No requests logged yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100">
                      <td className="px-3 py-2 text-gray-700">{new Date(log.ts).toLocaleTimeString()}</td>
                      <td className="px-3 py-2 text-gray-600">{log.source}</td>
                      <td className={`px-3 py-2 font-medium ${methodColor(log.method)}`}>{log.method}</td>
                      <td className="px-3 py-2 text-gray-900">{log.url}</td>
                      <td className={`px-3 py-2 ${log.ok ? 'text-green-700' : 'text-red-700'}`}>{String(log.status)}</td>
                      <td className="px-3 py-2 text-gray-600">{log.durationMs}ms</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
