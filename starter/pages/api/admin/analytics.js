import { getDbClient, requireAdminUser } from '@/lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const { from, to, path, event_type, device } = req.query;
    const db = getDbClient();

    const toIso = to ? new Date(to).toISOString() : new Date().toISOString();
    const fromIso = from
      ? new Date(from).toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Build base query
    const buildQuery = () => {
      let q = db
        .from('page_clicks')
        .select('*')
        .gte('created_at', fromIso)
        .lte('created_at', toIso);
      if (path) q = q.ilike('path', `%${path}%`);
      if (event_type) q = q.eq('event_type', event_type);
      if (device) q = q.eq('device_type', device);
      return q;
    };

    const { data: rows, error } = await buildQuery()
      .order('created_at', { ascending: false })
      .limit(50000);

    if (error) {
      console.error('Analytics query failed:', error);
      return res.status(500).json({ error: 'Failed to load analytics' });
    }

    // Aggregate in JS (fine for up to ~50k rows)
    const totalEvents = rows.length;
    const uniqueSessions = new Set();
    const uniquePaths = new Set();
    const byPage = new Map();
    const byReferrer = new Map();
    const byDevice = new Map();
    const byBrowser = new Map();
    const byOS = new Map();
    const byEventType = new Map();
    const byDay = new Map();

    let totalTimeOnPage = 0;
    let timeOnPageSamples = 0;

    for (const row of rows) {
      if (row.session_id) uniqueSessions.add(row.session_id);
      if (row.path) uniquePaths.add(row.path);

      // Page
      if (row.path) {
        const entry = byPage.get(row.path) || { views: 0, sessions: new Set() };
        entry.views += 1;
        if (row.session_id) entry.sessions.add(row.session_id);
        byPage.set(row.path, entry);
      }

      // Referrer
      if (row.referrer) {
        const host = (() => {
          try {
            return new URL(row.referrer).hostname.replace('www.', '');
          } catch {
            return 'direct';
          }
        })();
        byReferrer.set(host, (byReferrer.get(host) || 0) + 1);
      }

      // Device / Browser / OS
      if (row.device_type) byDevice.set(row.device_type, (byDevice.get(row.device_type) || 0) + 1);
      if (row.browser) byBrowser.set(row.browser, (byBrowser.get(row.browser) || 0) + 1);
      if (row.os) byOS.set(row.os, (byOS.get(row.os) || 0) + 1);

      // Event type
      if (row.event_type) byEventType.set(row.event_type, (byEventType.get(row.event_type) || 0) + 1);

      // Daily
      const day = String(row.created_at).split('T')[0];
      byDay.set(day, (byDay.get(day) || 0) + 1);

      // Time on page
      if (row.time_on_page_ms) {
        totalTimeOnPage += row.time_on_page_ms;
        timeOnPageSamples += 1;
      }
    }

    const topPages = [...byPage.entries()]
      .map(([path, v]) => ({
        path,
        views: v.views,
        sessions: v.sessions.size,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    const topReferrers = [...byReferrer.entries()]
      .map(([host, count]) => ({ host, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const deviceBreakdown = [...byDevice.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const browserBreakdown = [...byBrowser.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const osBreakdown = [...byOS.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const eventTypeBreakdown = [...byEventType.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const dailyTrend = [...byDay.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.status(200).json({
      success: true,
      range: { from: fromIso, to: toIso },
      totals: {
        events: totalEvents,
        sessions: uniqueSessions.size,
        uniquePaths: uniquePaths.size,
        avgTimeOnPageMs:
          timeOnPageSamples > 0
            ? Math.round(totalTimeOnPage / timeOnPageSamples)
            : 0,
      },
      topPages,
      topReferrers,
      deviceBreakdown,
      browserBreakdown,
      osBreakdown,
      eventTypeBreakdown,
      dailyTrend,
      recent: rows.slice(0, 50),
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({ error: 'Failed to load analytics' });
  }
}