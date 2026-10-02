import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Monitor,
  Smartphone,
  Tablet,
  Globe2,
  Users,
  Eye,
  Clock,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';

const DATE_PRESETS = [
  { key: '24h', label: 'Last 24h' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
];

const EVENT_TYPES = [
  { key: '', label: 'All events' },
  { key: 'page_view', label: 'Page views' },
  { key: 'engagement', label: 'Engagement' },
];

const DEVICES = [
  { key: '', label: 'All devices' },
  { key: 'desktop', label: 'Desktop' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'tablet', label: 'Tablet' },
];

const presetToRange = (preset) => {
  const now = new Date();
  const to = now.toISOString();
  const days = preset === '24h' ? 1 : preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  return { from, to };
};

const formatDuration = (ms) => {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}m ${rs}s`;
};

export default function AdminAnalyticsPanel() {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState('7d');
  const [eventType, setEventType] = useState('');
  const [device, setDevice] = useState('');
  const [pathFilter, setPathFilter] = useState('');
  const [draftPath, setDraftPath] = useState('');

  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = presetToRange(preset);
      const params = new URLSearchParams({ from, to });
      if (eventType) params.append('event_type', eventType);
      if (device) params.append('device', device);
      if (pathFilter) params.append('path', pathFilter);

      const response = await fetch(`/api/admin/analytics?${params.toString()}`, {
        credentials: 'include',
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to load analytics');
      }
      setPayload(json);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [preset, eventType, device, pathFilter]);

  // Fetch when the panel is opened, or when filters change while open
  useEffect(() => {
    if (!open) return;
    fetchAnalytics();
  }, [open, fetchAnalytics]);

  const totals = payload?.totals || null;
  const topPages = payload?.topPages || [];
  const topReferrers = payload?.topReferrers || [];
  const devices = payload?.deviceBreakdown || [];
  const browsers = payload?.browserBreakdown || [];
  const dailyTrend = payload?.dailyTrend || [];

  const maxDaily = useMemo(
    () => Math.max(1, ...dailyTrend.map((d) => d.count)),
    [dailyTrend]
  );

  const totalDeviceCount = devices.reduce((s, d) => s + d.count, 0) || 1;

  const clearFilters = () => {
    setPreset('7d');
    setEventType('');
    setDevice('');
    setPathFilter('');
    setDraftPath('');
  };

  const activeFilterCount = [
    preset !== '7d',
    Boolean(eventType),
    Boolean(device),
    Boolean(pathFilter),
  ].filter(Boolean).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* ============ HEADER ============ */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50 sm:px-6"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Activity size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Site analytics
            </p>
            <h2 className="mt-0.5 text-base font-bold text-slate-900">
              Traffic &amp; engagement
            </h2>
          </div>
          {activeFilterCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="hidden sm:inline">
            {open ? 'Collapse' : 'Expand'}
          </span>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* ============ BODY ============ */}
      {open && (
        <>
          {/* Filters */}
          <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Date presets */}
              <div className="flex flex-wrap gap-1.5">
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPreset(p.key)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                      preset === p.key
                        ? 'border-accent bg-accent text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Dropdowns */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                >
                  {EVENT_TYPES.map((e) => (
                    <option key={e.key} value={e.key}>
                      {e.label}
                    </option>
                  ))}
                </select>

                <select
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                >
                  {DEVICES.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={fetchAnalytics}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw
                    size={12}
                    className={loading ? 'animate-spin' : ''}
                  />
                  Refresh
                </button>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                  >
                    <X size={12} />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Path filter */}
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={draftPath}
                  onChange={(e) => setDraftPath(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setPathFilter(draftPath.trim());
                  }}
                  placeholder="Filter by path, e.g. /property or /listing"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <button
                type="button"
                onClick={() => setPathFilter(draftPath.trim())}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:px-6">
            {loading && !payload ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-xl border border-slate-100 bg-white"
                  />
                ))}
              </div>
            ) : !payload ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
                No analytics data available for this range.
              </div>
            ) : (
              <>
                {/* KPI strip */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Kpi
                    icon={Eye}
                    label="Total events"
                    value={totals.events.toLocaleString()}
                    tone="accent"
                  />
                  <Kpi
                    icon={Users}
                    label="Unique sessions"
                    value={totals.sessions.toLocaleString()}
                    tone="emerald"
                  />
                  <Kpi
                    icon={Globe2}
                    label="Unique pages"
                    value={totals.uniquePaths.toLocaleString()}
                    tone="blue"
                  />
                  <Kpi
                    icon={Clock}
                    label="Avg. time on page"
                    value={formatDuration(totals.avgTimeOnPageMs)}
                    tone="violet"
                  />
                </div>

                {/* Daily trend */}
                <Panel title="Daily traffic">
                  {dailyTrend.length === 0 ? (
                    <EmptyRow />
                  ) : (
                    <div className="space-y-2">
                      {dailyTrend.map((d) => {
                        const pct = (d.count / maxDaily) * 100;
                        return (
                          <div key={d.date} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-600">
                                {d.date}
                              </span>
                              <span className="font-semibold text-slate-900">
                                {d.count.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-accent"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Panel>

                {/* Device + browsers + referrers */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <Panel title="Devices">
                    {devices.length === 0 ? (
                      <EmptyRow />
                    ) : (
                      <div className="space-y-3">
                        {devices.map((d) => {
                          const Icon =
                            d.name === 'mobile'
                              ? Smartphone
                              : d.name === 'tablet'
                              ? Tablet
                              : Monitor;
                          const pct = Math.round(
                            (d.count / totalDeviceCount) * 100
                          );
                          return (
                            <div
                              key={d.name}
                              className="flex items-center gap-3"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                <Icon size={14} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold capitalize text-slate-700">
                                  {d.name}
                                </p>
                                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full bg-accent"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                              <span className="shrink-0 text-xs font-semibold text-slate-900">
                                {pct}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Panel>

                  <Panel title="Browsers">
                    {browsers.length === 0 ? (
                      <EmptyRow />
                    ) : (
                      <RowList
                        items={browsers.slice(0, 6).map((b) => ({
                          label: b.name,
                          value: b.count.toLocaleString(),
                        }))}
                      />
                    )}
                  </Panel>

                  <Panel title="Top referrers">
                    {topReferrers.length === 0 ? (
                      <EmptyRow />
                    ) : (
                      <RowList
                        items={topReferrers.map((r) => ({
                          label: r.host,
                          value: r.count.toLocaleString(),
                        }))}
                      />
                    )}
                  </Panel>
                </div>

                {/* Top pages */}
                <Panel title={`Top pages (${topPages.length})`}>
                  {topPages.length === 0 ? (
                    <EmptyRow />
                  ) : (
                    <div className="space-y-1.5">
                      {topPages.map((p, i) => (
                        <div
                          key={p.path}
                          className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500">
                            {i + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700">
                            {p.path}
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-slate-900">
                            {p.views.toLocaleString()}
                          </span>
                          <span className="hidden shrink-0 text-[11px] text-slate-400 sm:inline">
                            {p.sessions} session{p.sessions === 1 ? '' : 's'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

/* ============================================================
 * Sub-components
 * ============================================================ */

const TONE = {
  accent: 'bg-accent/10 text-accent',
  emerald: 'bg-emerald-50 text-emerald-600',
  blue: 'bg-blue-50 text-blue-600',
  violet: 'bg-violet-50 text-violet-600',
};

function Kpi({ icon: Icon, label, value, tone = 'accent' }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
            TONE[tone] || TONE.accent
          }`}
        >
          <Icon size={13} />
        </span>
      </div>
      <p className="mt-2 truncate text-xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      {children}
    </div>
  );
}

function RowList({ items }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between gap-3 text-xs"
        >
          <span className="min-w-0 truncate text-slate-700">{item.label}</span>
          <span className="shrink-0 font-semibold text-slate-900">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyRow() {
  return (
    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-6 text-center text-xs text-slate-400">
      No data for this range
    </p>
  );
}