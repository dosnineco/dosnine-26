import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { range = 'day' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let fromDate = new Date();
    
    switch(range) {
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

    // Query Supabase
    const { data: rows, error } = await supabase
      .from('page_clicks')
      .select('*')
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', now.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Aggregate data
    const byPath = {};
    const bySource = {};
    const bySourePath = {};

    rows.forEach(row => {
      // By path
      byPath[row.path] = (byPath[row.path] || 0) + 1;
      
      // By source
      bySource[row.source || 'direct'] = (bySource[row.source || 'direct'] || 0) + 1;
      
      // By source → path
      const key = `${row.source || 'direct'} → ${row.path}`;
      bySourePath[key] = (bySourePath[key] || 0) + 1;
    });

    // Sort and format
    const sortedByPath = Object.entries(byPath)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    const sortedBySource = Object.entries(bySource)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([source, count]) => ({ source, count }));

    const sortedBySourePath = Object.entries(bySourePath)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([flow, count]) => ({ flow, count }));

    return res.status(200).json({
      total_clicks: rows.length,
      byPath: sortedByPath,
      bySource: sortedBySource,
      bySourePath: sortedBySourePath,
      rows: rows.slice(0, 20),
      range,
      period: {
        from: fromDate.toISOString(),
        to: now.toISOString()
      }
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({ error: 'Failed to fetch analytics', details: err.message });
  }
}
