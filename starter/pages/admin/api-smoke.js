import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Play,
  RefreshCw,
  Trash2,
  Search,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';

/* ============================================================
 * ENDPOINTS UNDER TEST
 * ============================================================
 * `idParam` marks routes that take an ID in the body — used for
 * IDOR probes (send a random UUID and check for a leak).
 * `sensitiveFields` lists keys that should NEVER appear in an
 * unauthenticated response, if one ever succeeds.
 * ============================================================ */

const ENDPOINTS = [
  { key: 'verify-admin', label: 'Verify Admin', method: 'GET', url: '/api/admin/verify-admin', expected: [200] },
  { key: 'admin-requests', label: 'Admin Requests', method: 'GET', url: '/api/admin/requests', expected: [200], sensitiveFields: ['client_email', 'client_phone'] },
  { key: 'admin-requests-post', label: 'Admin Requests POST', method: 'POST', url: '/api/admin/requests', body: { action: 'invalid' }, expected: [400], idParam: 'requestId' },
  { key: 'admin-requests-mgmt', label: 'Admin Requests Management', method: 'GET', url: '/api/admin/requests-management', expected: [200], sensitiveFields: ['client_email', 'client_phone'] },
  { key: 'admin-requests-mgmt-post', label: 'Admin Requests Mgmt POST', method: 'POST', url: '/api/admin/requests-management', body: { action: 'invalid', ids: [] }, expected: [400], idParam: 'ids' },
  { key: 'admin-agents-list', label: 'Admin Agents List', method: 'GET', url: '/api/admin/agents/list?status=all', expected: [200], sensitiveFields: ['email', 'phone'] },
  { key: 'admin-agent-update-status', label: 'Agent Update Status', method: 'POST', url: '/api/admin/agents/update-status', body: { status: 'approved' }, expected: [400], idParam: 'agentId' },
  { key: 'admin-agent-payment-plan', label: 'Agent Payment Plan', method: 'POST', url: '/api/admin/agents/payment-plan', body: {}, expected: [400] },
  { key: 'admin-agent-document', label: 'Agent Verification Document', method: 'GET', url: '/api/admin/agents/get-document', expected: [400] },
  { key: 'admin-agent-notifications', label: 'Agent Notifications', method: 'GET', url: '/api/admin/agents/notifications', expected: [200] },
  { key: 'admin-agent-plan-prices', label: 'Agent Plan Prices', method: 'GET', url: '/api/admin/agents/plan-prices', expected: [200] },
  { key: 'admin-agent-plan-prices-patch', label: 'Agent Plan Prices PATCH', method: 'PATCH', url: '/api/admin/agents/plan-prices', body: {}, expected: [400] },
  { key: 'admin-agent-payment-receipt', label: 'Agent Payment Receipt', method: 'PATCH', url: '/api/admin/agents/payment-receipt', body: {}, expected: [400] },
  { key: 'admin-users', label: 'Admin Users', method: 'GET', url: '/api/admin/users', expected: [200], sensitiveFields: ['email', 'phone', 'clerk_user_id'] },
  { key: 'admin-users-patch', label: 'Admin Users PATCH', method: 'PATCH', url: '/api/admin/users', body: {}, expected: [400] },
  { key: 'admin-users-delete', label: 'Admin Users DELETE', method: 'DELETE', url: '/api/admin/users', body: {}, expected: [400] },
  { key: 'admin-dashboard', label: 'Admin Dashboard Data', method: 'GET', url: '/api/admin/dashboard-data?tab=emails', expected: [200], sensitiveFields: ['client_email', 'email'] },
  { key: 'admin-analytics', label: 'Admin Analytics', method: 'GET', url: '/api/admin/analytics', expected: [200] },
  { key: 'admin-market-intelligence', label: 'Market Intelligence', method: 'GET', url: '/api/admin/market-intelligence', expected: [200] },
  { key: 'admin-properties', label: 'Admin Properties', method: 'GET', url: '/api/admin/properties', expected: [200] },
  { key: 'admin-properties-patch', label: 'Admin Properties PATCH', method: 'PATCH', url: '/api/admin/properties', body: {}, expected: [400] },
  { key: 'admin-properties-delete', label: 'Admin Properties DELETE', method: 'DELETE', url: '/api/admin/properties', body: {}, expected: [400] },
  { key: 'admin-htv-orders', label: 'Admin HTV Orders', method: 'GET', url: '/api/admin/htv-orders', expected: [200] },
  { key: 'admin-htv-orders-post', label: 'HTV Order Submission Validation', method: 'POST', url: '/api/admin/htv-orders', body: {}, expected: [400], public: true },
  { key: 'admin-htv-orders-put', label: 'Admin HTV Orders PUT', method: 'PUT', url: '/api/admin/htv-orders', body: {}, expected: [400] },
  { key: 'admin-htv-orders-delete', label: 'Admin HTV Orders DELETE', method: 'DELETE', url: '/api/admin/htv-orders', expected: [400] },
  { key: 'agent-apps', label: 'Agent Applications', method: 'GET', url: '/api/admin/agent-applications', expected: [200], sensitiveFields: ['email', 'phone'] },
  { key: 'agent-apps-patch', label: 'Agent Applications PATCH', method: 'PATCH', url: '/api/admin/agent-applications', body: {}, expected: [400] },
  { key: 'admin-htv-expenses', label: 'Admin HTV Expenses', method: 'GET', url: '/api/admin/htv-expenses', expected: [200] },
  { key: 'admin-htv-expenses-post', label: 'Admin HTV Expenses POST', method: 'POST', url: '/api/admin/htv-expenses', body: {}, expected: [400] },
  { key: 'admin-htv-expenses-delete', label: 'Admin HTV Expenses DELETE', method: 'DELETE', url: '/api/admin/htv-expenses', expected: [400] },
  { key: 'admin-advertisements', label: 'Admin Advertisements', method: 'GET', url: '/api/admin/advertisements', expected: [200] },
  { key: 'admin-advertisements-patch', label: 'Admin Advertisements PATCH', method: 'PATCH', url: '/api/admin/advertisements', body: {}, expected: [400] },
  { key: 'admin-upload-logo', label: 'Admin Logo Upload Validation', method: 'POST', url: '/api/admin/upload-logo', body: {}, expected: [400] },
  { key: 'admin-hill-lot-investors', label: 'Admin Hill Lot Investors', method: 'GET', url: '/api/admin/hill-lot-investors', expected: [200] },
  { key: 'admin-hill-lot-investors-post', label: 'Hill Lot Investor POST', method: 'POST', url: '/api/admin/hill-lot-investors', body: {}, expected: [400] },
  { key: 'admin-hill-lot-investors-patch', label: 'Hill Lot Investor PATCH', method: 'PATCH', url: '/api/admin/hill-lot-investors', body: {}, expected: [400] },
  { key: 'admin-hill-lot-investors-put', label: 'Hill Lot Investor PUT', method: 'PUT', url: '/api/admin/hill-lot-investors', body: {}, expected: [400] },
  { key: 'admin-hill-lot-investors-delete', label: 'Hill Lot Investor DELETE', method: 'DELETE', url: '/api/admin/hill-lot-investors', body: {}, expected: [400] },
  { key: 'admin-htv-invoice', label: 'Admin HTV Invoice Validation', method: 'GET', url: '/api/admin/htv-invoice', expected: [400] },
];

/* ============================================================
 * SECURITY HEADERS THAT SHOULD BE PRESENT ON EVERY RESPONSE
 * ============================================================ */

const EXPECTED_SECURITY_HEADERS = [
  { name: 'x-content-type-options', expected: 'nosniff', severity: 'medium' },
  { name: 'x-frame-options', expected: null, severity: 'medium' }, // SAMEORIGIN or DENY
  { name: 'strict-transport-security', expected: null, severity: 'high' },
  { name: 'referrer-policy', expected: null, severity: 'low' },
];

/* ============================================================
 * HELPERS
 * ============================================================ */

const methodColor = (method) => {
  if (method === 'GET') return 'text-blue-700';
  if (method === 'POST') return 'text-emerald-700';
  if (method === 'PATCH') return 'text-amber-700';
  if (method === 'PUT') return 'text-amber-700';
  if (method === 'DELETE') return 'text-red-700';
  return 'text-slate-700';
};

const severityStyles = {
  critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: ShieldX },
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: ShieldAlert },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle },
  low: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', icon: ShieldCheck },
  pass: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
};

const randomUuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

/* Payloads designed to trip weak validation */
const INJECTION_PAYLOADS = [
  "' OR '1'='1",
  '"; DROP TABLE users;--',
  '../../etc/passwd',
  '<script>alert(1)</script>',
];

const looksLikeStackTrace = (text) => {
  if (!text || typeof text !== 'string') return false;
  const signals = [
    'at Object.',
    'at async',
    'node_modules',
    'PostgrestError',
    'relation "',
    'column "',
    'stack',
    'SQLSTATE',
    'PGRST',
  ];
  return signals.some((s) => text.toLowerCase().includes(s.toLowerCase()));
};

const looksLikeEmailList = (text) => {
  if (!text || typeof text !== 'string') return false;
  // crude but effective: at least 2 emails in the payload
  const matches = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi);
  return matches && matches.length >= 2;
};

/* ============================================================
 * MAIN COMPONENT
 * ============================================================ */

export default function AdminApiSmokePage() {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('smoke'); // 'smoke' | 'security'

  const [runningAll, setRunningAll] = useState(false);
  const [runningSecurity, setRunningSecurity] = useState(false);
  const [runningSingle, setRunningSingle] = useState(null);
  const [results, setResults] = useState({});
  const [logs, setLogs] = useState([]);
  const [securityReport, setSecurityReport] = useState(null);
  const [copied, setCopied] = useState('');

  const originalFetchRef = useRef(null);

  /* ----------------------------------------------------------
   * Admin gate
   * ---------------------------------------------------------- */
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setAuthLoading(false);
        return;
      }
      try {
        const response = await fetch('/api/admin/verify-admin');
        const payload = await response.json();
        setIsAdmin(Boolean(response.ok && payload?.isAdmin));
      } catch {
        setIsAdmin(false);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAdmin();
  }, [user]);

  /* ----------------------------------------------------------
   * Instrument window.fetch so we log every request the app
   * makes while this page is mounted.
   * ---------------------------------------------------------- */
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
        setLogs((prev) =>
          [
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
          ].slice(0, 200)
        );
        return response;
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        setLogs((prev) =>
          [
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
          ].slice(0, 200)
        );
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

  const calledMap = useMemo(() => {
    const map = {};
    logs.forEach((log) => {
      const path = (() => {
        try {
          const base =
            typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
          return new URL(log.url, base).pathname;
        } catch {
          return log.url;
        }
      })();
      map[path] = (map[path] || 0) + 1;
    });
    return map;
  }, [logs]);

  /* ----------------------------------------------------------
   * Core instrumented fetch — returns a full record
   * ---------------------------------------------------------- */
  const instrumentedFetch = async ({
    method = 'GET',
    url,
    body,
    headers: extraHeaders,
    omitAuth = false,
    omitCredentials = false,
    source = 'smoke',
  }) => {
    const startedAt = Date.now();
    const token = omitAuth ? null : await getToken();

    const options = {
      method,
      credentials: omitCredentials ? 'omit' : 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(extraHeaders || {}),
      },
    };

    if (token) options.headers.Authorization = `Bearer ${token}`;
    if (body && method !== 'GET') options.body = JSON.stringify(body);

    const fetchFn = originalFetchRef.current || fetch;

    try {
      const response = await fetchFn(url, options);
      const text = await response.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text || null;
      }

      // Capture response headers for the header audit
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

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
        rawText: typeof parsed === 'string' ? parsed : text,
        headers,
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
        rawText: '',
        headers: {},
      };
      setLogs((prev) => [record, ...prev].slice(0, 200));
      return record;
    }
  };

  /* ============================================================
   * SMOKE TESTS
   * ============================================================ */

  const runSingle = async (endpoint) => {
    setRunningSingle(endpoint.key);
    try {
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
        [endpoint.key]: { ...record, success, expected },
      }));
    } finally {
      setRunningSingle(null);
    }
  };

  const runAllSmoke = async () => {
    setRunningAll(true);
    for (const endpoint of ENDPOINTS) {
      await runSingle(endpoint);
    }
    setRunningAll(false);
  };

  /* ============================================================
   * SECURITY SCAN
   * ============================================================
   * Runs a battery of defensive probes. Each finding gets a
   * severity so you can prioritize. All probes target the SAME
   * host the page is running on.
   * ============================================================ */

  const runSecurityScan = async () => {
    setRunningSecurity(true);
    setSecurityReport(null);

    const findings = [];
    let probed = 0;

    const record = (severity, category, title, detail, evidence) => {
      findings.push({
        id: `${category}-${findings.length}-${Math.random().toString(36).slice(2, 6)}`,
        severity,
        category,
        title,
        detail,
        evidence,
      });
    };

    try {
      /* ----------------------------------------------------------
       * 1. UNAUTHENTICATED ACCESS
       * Protected admin routes must reject requests without an
       * Authorization header. Public routes are excluded.
       * ---------------------------------------------------------- */
      for (const endpoint of ENDPOINTS.filter((item) => !item.public)) {
        probed += 1;
        const unauth = await instrumentedFetch({
          method: endpoint.method,
          url: endpoint.url,
          body: endpoint.body,
          omitAuth: true,
          omitCredentials: true,
          source: 'sec-unauth',
        });

        const isBlocked = [401, 403, 404, 405].includes(unauth.status);

        if (!isBlocked) {
          // Also check whether the response leaked sensitive data
          const leakedSensitive = endpoint.sensitiveFields?.some((field) =>
            String(unauth.rawText || '').toLowerCase().includes(field.toLowerCase())
          );

          if (leakedSensitive || looksLikeEmailList(unauth.rawText)) {
            record(
              'critical',
              'auth',
              `Unauthenticated access leaks data at ${endpoint.url}`,
              `Called without credentials and received ${unauth.status}. Response appears to contain sensitive fields.`,
              `Status: ${unauth.status} · Payload size: ${(unauth.rawText || '').length} chars`
            );
          } else if (unauth.status === 200) {
            record(
              'high',
              'auth',
              `Endpoint returns 200 unauthenticated: ${endpoint.url}`,
              `The route responded successfully without any credentials. It should require an admin session.`,
              `Status: ${unauth.status}`
            );
          } else if (unauth.status >= 200 && unauth.status < 500 && unauth.status !== 404) {
            record(
              'medium',
              'auth',
              `Endpoint responds to unauthenticated requests: ${endpoint.url}`,
              `Returned status ${unauth.status} instead of 401/403. Even a 400 may confirm the endpoint exists.`,
              `Status: ${unauth.status}`
            );
          }
        }

        if (looksLikeStackTrace(unauth.rawText)) {
          record(
            'high',
            'info-leak',
            `Stack trace exposed at ${endpoint.url}`,
            `The unauthenticated response contains stack-trace-like strings, which reveal internal paths or library names.`,
            `Snippet: ${String(unauth.rawText).slice(0, 140)}`
          );
        }
      }

      /* ----------------------------------------------------------
       * 2. METHOD TAMPERING
       * GET-only routes should reject write methods.
       * ---------------------------------------------------------- */
      const getOnly = ENDPOINTS.filter((e) => e.method === 'GET');
      for (const endpoint of getOnly.slice(0, 5)) {
        probed += 1;
        const tamper = await instrumentedFetch({
          method: 'DELETE',
          url: endpoint.url,
          source: 'sec-method',
        });

        if (tamper.status >= 200 && tamper.status < 300) {
          record(
            'critical',
            'method',
            `DELETE accepted on GET-only route: ${endpoint.url}`,
            `The endpoint responded ${tamper.status} to a DELETE request. Method restrictions may be missing.`,
            `Status: ${tamper.status}`
          );
        } else if (tamper.status === 500) {
          record(
            'medium',
            'method',
            `DELETE triggers 500 on ${endpoint.url}`,
            `An unexpected method caused a server error rather than a 405. This often indicates unhandled input paths.`,
            `Status: ${tamper.status}`
          );
        }
      }

      /* ----------------------------------------------------------
       * 3. INPUT VALIDATION / INJECTION PROBES
       * Send malformed and injection payloads to POST endpoints.
       * A healthy API responds 400 without reflecting the payload.
       * ---------------------------------------------------------- */
      const postEndpoints = ENDPOINTS.filter((e) => e.method === 'POST');
      for (const endpoint of postEndpoints) {
        for (const payload of INJECTION_PAYLOADS) {
          probed += 1;
          const testBody = { ...(endpoint.body || {}), action: payload };

          const probe = await instrumentedFetch({
            method: 'POST',
            url: endpoint.url,
            body: testBody,
            source: 'sec-injection',
          });

          const reflected = String(probe.rawText || '').includes(payload);
          const errored = probe.status >= 500;

          if (errored && looksLikeStackTrace(probe.rawText)) {
            record(
              'high',
              'injection',
              `Server error + stack trace on ${endpoint.url}`,
              `Sending payload "${payload.slice(0, 30)}…" produced a 5xx with a stack trace. This suggests unhandled input.`,
              `Status: ${probe.status}`
            );
            break; // don't spam one endpoint
          }

          if (reflected) {
            record(
              'medium',
              'xss',
              `Payload reflected in response on ${endpoint.url}`,
              `The payload "${payload.slice(0, 30)}…" appeared verbatim in the response. Sanitize echoed input before rendering.`,
              `Status: ${probe.status}`
            );
            break;
          }
        }
      }

      /* ----------------------------------------------------------
       * 4. IDOR PROBE
       * Send a random UUID as the ID field. If the endpoint
       * returns 200 with data, that's a leak.
       * ---------------------------------------------------------- */
      const idorEndpoints = ENDPOINTS.filter((e) => e.idParam);
      for (const endpoint of idorEndpoints) {
        probed += 1;
        const fakeId = randomUuid();
        const idField = endpoint.idParam;
        const testBody =
          idField === 'ids'
            ? { action: 'assign', ids: [fakeId], agentId: fakeId }
            : { action: 'assign', [idField]: fakeId };

        const probe = await instrumentedFetch({
          method: endpoint.method,
          url: endpoint.url,
          body: testBody,
          source: 'sec-idor',
        });

        if (probe.status >= 200 && probe.status < 300) {
          record(
            'high',
            'idor',
            `Random UUID accepted on ${endpoint.url}`,
            `Sending a non-existent ID returned ${probe.status}. The endpoint may not verify that the ID belongs to a real resource.`,
            `Fake ID: ${fakeId.slice(0, 8)}…`
          );
        }
      }

      /* ----------------------------------------------------------
       * 5. SECURITY HEADER AUDIT
       * Only run once against a lightweight endpoint.
       * ---------------------------------------------------------- */
      probed += 1;
      const headerProbe = await instrumentedFetch({
        method: 'GET',
        url: '/api/admin/verify-admin',
        source: 'sec-headers',
      });

      for (const { name, expected, severity } of EXPECTED_SECURITY_HEADERS) {
        const value = headerProbe.headers?.[name];
        if (!value) {
          record(
            severity,
            'headers',
            `Missing header: ${name}`,
            `The response does not set "${name}". Add it at the edge/middleware layer to harden the app.`,
            `Value: (empty)`
          );
        } else if (expected && !value.toLowerCase().includes(expected.toLowerCase())) {
          record(
            severity,
            'headers',
            `Weak value for ${name}`,
            `Expected "${expected}" but got "${value}".`,
            `Value: ${value}`
          );
        }
      }

      /* ----------------------------------------------------------
       * 6. RATE LIMIT DETECTION
       * Fire 15 rapid requests at one endpoint and see if any
       * return 429. No 429 = no visible rate limit.
       * ---------------------------------------------------------- */
      probed += 1;
      const burstUrl = '/api/admin/verify-admin';
      const burstStatuses = [];
      for (let i = 0; i < 15; i += 1) {
        const r = await instrumentedFetch({
          method: 'GET',
          url: burstUrl,
          source: 'sec-ratelimit',
        });
        burstStatuses.push(r.status);
      }
      const sawRateLimit = burstStatuses.some((s) => s === 429);
      if (!sawRateLimit) {
        record(
          'medium',
          'rate-limit',
          'No rate limit detected',
          `15 rapid requests to ${burstUrl} produced no 429 responses. Consider adding rate limiting at the edge to slow brute-force attempts.`,
          `Statuses: ${[...new Set(burstStatuses)].join(', ')}`
        );
      }

      /* ----------------------------------------------------------
       * 7. CORS MISCONFIGURATION
       * Send an Origin header and check if the endpoint echoes
       * it back with permissive credentials.
       * ---------------------------------------------------------- */
      probed += 1;
      const corsProbe = await instrumentedFetch({
        method: 'GET',
        url: '/api/admin/verify-admin',
        headers: { Origin: 'https://evil.example.com' },
        source: 'sec-cors',
      });
      const acao = corsProbe.headers?.['access-control-allow-origin'];
      const acac = corsProbe.headers?.['access-control-allow-credentials'];
      if (acao === '*' && acac === 'true') {
        record(
          'critical',
          'cors',
          'CORS allows any origin with credentials',
          `The response sets "Access-Control-Allow-Origin: *" together with "Access-Control-Allow-Credentials: true". Browsers will usually block this, but the configuration is unsafe and may indicate a deeper misconfig.`,
          `ACAO: ${acao} · ACAC: ${acac}`
        );
      } else if (acao === 'https://evil.example.com') {
        record(
          'high',
          'cors',
          'CORS reflects arbitrary Origin',
          `The response echoed back the attacker-controlled origin "${acao}". Lock this to your production domain.`,
          `ACAO: ${acao}`
        );
      }

      /* ----------------------------------------------------------
       * 8. CACHE-CONTROL ON SENSITIVE GETS
       * ---------------------------------------------------------- */
      const sampleSensitive = ENDPOINTS.find((e) => e.key === 'admin-users');
      if (sampleSensitive) {
        probed += 1;
        const cacheProbe = await instrumentedFetch({
          method: 'GET',
          url: sampleSensitive.url,
          source: 'sec-cache',
        });
        const cc = cacheProbe.headers?.['cache-control'];
        if (!cc || /public|max-age=(?!0)/i.test(cc)) {
          record(
            'low',
            'cache',
            'Sensitive response may be cacheable',
            `"${sampleSensitive.url}" did not set a restrictive Cache-Control header. Add "no-store, private" to prevent shared caches from retaining sensitive payloads.`,
            `Cache-Control: ${cc || '(empty)'}`
          );
        }
      }

      // Sort by severity
      const order = { critical: 0, high: 1, medium: 2, low: 3, pass: 4 };
      findings.sort((a, b) => order[a.severity] - order[b.severity]);

      setSecurityReport({
        generatedAt: new Date().toISOString(),
        probed,
        findings,
        summary: {
          critical: findings.filter((f) => f.severity === 'critical').length,
          high: findings.filter((f) => f.severity === 'high').length,
          medium: findings.filter((f) => f.severity === 'medium').length,
          low: findings.filter((f) => f.severity === 'low').length,
        },
      });
    } catch (err) {
      record(
        'medium',
        'scan',
        'Scan interrupted',
        `The scan encountered an error: ${err.message}`,
        ''
      );
      setSecurityReport({
        generatedAt: new Date().toISOString(),
        probed,
        findings,
        summary: { critical: 0, high: 0, medium: 0, low: 0 },
      });
    } finally {
      setRunningSecurity(false);
    }
  };

  const copyReport = async () => {
    if (!securityReport) return;
    const text = [
      `Dosnine Security Scan — ${new Date(securityReport.generatedAt).toLocaleString()}`,
      `Probes run: ${securityReport.probed}`,
      `Findings: ${securityReport.findings.length}`,
      '',
      ...securityReport.findings.map(
        (f) =>
          `[${f.severity.toUpperCase()}] ${f.category} — ${f.title}\n${f.detail}\n${f.evidence}\n`
      ),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied('report');
      toast_custom('Report copied');
      setTimeout(() => setCopied(''), 1500);
    } catch {
      /* ignore */
    }
  };

  const toast_custom = (msg) => {
    // lightweight inline toast to avoid a dependency
    // eslint-disable-next-line no-console
    console.log(msg);
  };

  const clearEverything = () => {
    setLogs([]);
    setResults({});
    setSecurityReport(null);
  };

  /* ============================================================
   * RENDER
   * ============================================================ */

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-accent" />
          <p className="mt-4 text-sm text-slate-600">Checking access…</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <ShieldX className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Access denied</h1>
          <p className="mt-2 text-sm text-slate-600">
            Admin access is required to run this tool.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin API Security & Smoke Tests</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Diagnostics
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              API Security & Smoke Tests
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Run functional checks and defensive security probes against your admin APIs.
            </p>
          </div>
          <button
            type="button"
            onClick={clearEverything}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Trash2 size={14} />
            Clear all
          </button>
        </div>

        {/* Tabs */}
        <div className="inline-flex w-full rounded-full bg-slate-100 p-1 sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('smoke')}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition sm:flex-none sm:px-5 ${
              activeTab === 'smoke'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Smoke tests
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition sm:flex-none sm:px-5 ${
              activeTab === 'security'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Security scan
            {securityReport && securityReport.findings.length > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {securityReport.findings.length}
              </span>
            )}
          </button>
        </div>

        {/* ============================================================
            SMOKE TAB
            ============================================================ */}
        {activeTab === 'smoke' && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Functional checks</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Verify every admin endpoint responds with the expected status code.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={runAllSmoke}
                  disabled={runningAll}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60"
                >
                  <Play size={14} className={runningAll ? 'animate-pulse' : ''} />
                  {runningAll ? 'Running…' : 'Run all'}
                </button>
              </div>
            </div>

            {/* Results grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ENDPOINTS.map((endpoint) => {
                const result = results[endpoint.key];
                const isRunning = runningSingle === endpoint.key;

                return (
                  <article
                    key={endpoint.key}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${methodColor(
                          endpoint.method
                        )}`}
                      >
                        {endpoint.method}
                      </span>
                      {result && (
                        <span
                          className={`inline-flex h-2.5 w-2.5 rounded-full ${
                            result.success ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                          aria-label={result.success ? 'Pass' : 'Fail'}
                        />
                      )}
                    </div>

                    <h3 className="mt-2 text-sm font-semibold text-slate-900">
                      {endpoint.label}
                    </h3>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
                      {endpoint.url}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                      <div>
                        {!result ? (
                          <span className="text-slate-400">Not tested</span>
                        ) : (
                          <span
                            className={
                              result.success ? 'text-emerald-700' : 'text-red-700'
                            }
                          >
                            {result.status} · {result.durationMs}ms
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => runSingle(endpoint)}
                        disabled={isRunning}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {isRunning ? (
                          <RefreshCw size={11} className="animate-spin" />
                        ) : (
                          <Play size={11} />
                        )}
                        Run
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {/* ============================================================
            SECURITY TAB
            ============================================================ */}
        {activeTab === 'security' && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Defensive security scan
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600">
                    Runs unauthenticated access probes, method tampering, injection
                    payloads, IDOR tests, header audits, and a rate-limit burst.
                    All requests target the current host.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {securityReport && (
                    <button
                      type="button"
                      onClick={copyReport}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      {copied === 'report' ? <Check size={14} /> : <Copy size={14} />}
                      Copy report
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={runSecurityScan}
                    disabled={runningSecurity}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60"
                  >
                    <ShieldCheck size={14} />
                    {runningSecurity ? 'Scanning…' : 'Run security scan'}
                  </button>
                </div>
              </div>
            </div>

            {runningSecurity && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <RefreshCw size={16} className="animate-spin text-accent" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Running probes…
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Do not navigate away while the scan is in progress.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {securityReport && (
              <>
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <SummaryCard
                    label="Critical"
                    value={securityReport.summary.critical}
                    tone="critical"
                  />
                  <SummaryCard
                    label="High"
                    value={securityReport.summary.high}
                    tone="high"
                  />
                  <SummaryCard
                    label="Medium"
                    value={securityReport.summary.medium}
                    tone="medium"
                  />
                  <SummaryCard
                    label="Low"
                    value={securityReport.summary.low}
                    tone="low"
                  />
                </div>

                {securityReport.findings.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
                    <ShieldCheck className="mx-auto h-10 w-10 text-emerald-600" />
                    <p className="mt-3 text-sm font-semibold text-emerald-900">
                      No findings across {securityReport.probed} probes
                    </p>
                    <p className="mt-1 text-sm text-emerald-700">
                      Every check passed. Continue monitoring after each deployment.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {securityReport.findings.map((finding) => (
                      <FindingCard key={finding.id} finding={finding} />
                    ))}
                  </div>
                )}

                <p className="text-center text-xs text-slate-400">
                  Scan generated{' '}
                  {new Date(securityReport.generatedAt).toLocaleString()} ·{' '}
                  {securityReport.probed} probes run
                </p>
              </>
            )}

            {!securityReport && !runningSecurity && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
                <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  No scan run yet
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Click <strong>Run security scan</strong> to begin.
                </p>
              </div>
            )}
          </>
        )}

        {/* ============================================================
            LIVE REQUEST LOG (shown on both tabs)
            ============================================================ */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Live request log</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Every fetch this tab makes, captured in order.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {logs.length} {logs.length === 1 ? 'request' : 'requests'}
            </span>
          </div>

          {logs.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              No requests logged yet.
            </p>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto">
              <ul className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const path = (() => {
                    try {
                      const base =
                        typeof window !== 'undefined'
                          ? window.location.origin
                          : 'http://localhost';
                      return new URL(log.url, base).pathname;
                    } catch {
                      return log.url;
                    }
                  })();
                  return (
                    <li
                      key={log.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-xs"
                    >
                      <span className="font-mono text-slate-500">
                        {new Date(log.ts).toLocaleTimeString()}
                      </span>
                      <span
                        className={`font-mono font-semibold ${methodColor(
                          log.method
                        )}`}
                      >
                        {log.method}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-slate-700">
                        {path}
                      </span>
                      <span
                        className={`font-mono font-semibold ${
                          log.ok ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {String(log.status)}
                      </span>
                      <span className="font-mono text-slate-400">
                        {log.durationMs}ms
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {log.source}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ============================================================
 * SUB-COMPONENTS
 * ============================================================ */

function SummaryCard({ label, value, tone }) {
  const styles = severityStyles[tone] || severityStyles.low;
  const Icon = styles.icon;
  return (
    <div
      className={`rounded-2xl border p-4 ${styles.border} ${
        value > 0 ? styles.bg : 'bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <Icon size={16} className={value > 0 ? styles.text : 'text-slate-300'} />
      </div>
      <p className={`mt-2 text-2xl font-bold ${value > 0 ? styles.text : 'text-slate-400'}`}>
        {value}
      </p>
    </div>
  );
}

function FindingCard({ finding }) {
  const styles = severityStyles[finding.severity] || severityStyles.low;
  const Icon = styles.icon;

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white ${
        styles.border
      }`}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${styles.bg}`} />
      <div className="pl-5 pr-4 py-4 sm:pl-6 sm:pr-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles.bg} ${styles.text} ${styles.border}`}
          >
            <Icon size={11} />
            {finding.severity}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            {finding.category}
          </span>
        </div>

        <h3 className="mt-3 text-sm font-bold text-slate-900">{finding.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          {finding.detail}
        </p>

        {finding.evidence ? (
          <p className="mt-2 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-600">
            {finding.evidence}
          </p>
        ) : null}
      </div>
    </article>
  );
}