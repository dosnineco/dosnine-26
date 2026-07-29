import { getDbClient, requireAdminUser } from '../../../lib/apiAuth';

const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 0;
  return Number(value);
};

const formatPercent = (value) => `${Math.round(value)}%`;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const db = getDbClient();
    const { data: rows, error } = await db
      .from('service_requests')
      .select('request_type, property_type, parish, location, bedrooms, budget_min, budget_max, urgency, created_at')
      .order('created_at', { ascending: true })
      .limit(50000);

    if (error) throw error;

    const requests = Array.isArray(rows) ? rows : [];
    const totalRequests = requests.length;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const monthlyCounts = {};
    const propertyTypeCounts = {};
    const parishCounts = {};
    const requestTypeCounts = {};
    const bedroomCounts = { '1': 0, '2': 0, '3': 0, '4+': 0 };
    const urgencyCounts = { low: 0, normal: 0, high: 0, urgent: 0 };
    const rentBudgetCounts = { '<75k': 0, '75k-150k': 0, '150k-300k': 0, '300k+': 0 };
    const purchaseBudgetCounts = { '<10M': 0, '10M-20M': 0, '20M-40M': 0, '40M+': 0 };
    const trendingMap = {};
    let currentMonthCount = 0;
    let previousMonthCount = 0;
    let budgetSum = 0;
    let budgetCount = 0;
    let bedroomSum = 0;
    let bedroomCount = 0;

    const formatMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    requests.forEach((item) => {
      const created = item.created_at ? new Date(item.created_at) : null;
      if (!created || Number.isNaN(created.getTime())) return;

      const monthKey = formatMonthKey(created);
      monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;

      if (created >= monthStart) currentMonthCount += 1;
      if (created >= prevMonthStart && created <= prevMonthEnd) previousMonthCount += 1;

      const type = String(item.request_type || 'unknown').toLowerCase();
      requestTypeCounts[type] = (requestTypeCounts[type] || 0) + 1;

      const propertyType = String(item.property_type || 'other').toLowerCase();
      propertyTypeCounts[propertyType] = (propertyTypeCounts[propertyType] || 0) + 1;

      const parish = String(item.parish || '').trim();
      if (parish) parishCounts[parish] = (parishCounts[parish] || 0) + 1;

      const bedrooms = Number(item.bedrooms);
      if (Number.isFinite(bedrooms) && bedrooms > 0) {
        bedroomSum += bedrooms;
        bedroomCount += 1;
        if (bedrooms === 1) bedroomCounts['1'] += 1;
        else if (bedrooms === 2) bedroomCounts['2'] += 1;
        else if (bedrooms === 3) bedroomCounts['3'] += 1;
        else bedroomCounts['4+'] += 1;
      }

      const urgency = String(item.urgency || 'normal').toLowerCase();
      if (urgencyCounts[urgency] !== undefined) urgencyCounts[urgency] += 1;

      const budgetMin = formatNumber(item.budget_min);
      const budgetMax = formatNumber(item.budget_max);
      const budgetValue = budgetMax || budgetMin;
      if (budgetValue > 0) {
        budgetSum += budgetValue;
        budgetCount += 1;
      }

      if (['rent', 'lease'].includes(type) && budgetValue > 0) {
        if (budgetValue < 75000) rentBudgetCounts['<75k'] += 1;
        else if (budgetValue < 150000) rentBudgetCounts['75k-150k'] += 1;
        else if (budgetValue < 300000) rentBudgetCounts['150k-300k'] += 1;
        else rentBudgetCounts['300k+'] += 1;
      }

      if (['buy', 'sell', 'valuation'].includes(type) && budgetValue > 0) {
        if (budgetValue < 10000000) purchaseBudgetCounts['<10M'] += 1;
        else if (budgetValue < 20000000) purchaseBudgetCounts['10M-20M'] += 1;
        else if (budgetValue < 40000000) purchaseBudgetCounts['20M-40M'] += 1;
        else purchaseBudgetCounts['40M+'] += 1;
      }

      const bedroomLabel = Number(item.bedrooms) > 0 ? `${item.bedrooms} Bedroom` : '';
      const locationLabel = String(item.location || item.parish || '').trim();
      const propTypeLabel = item.property_type ? `${item.property_type}` : '';
      const searchKey = [bedroomLabel, propTypeLabel, locationLabel]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (searchKey) {
        trendingMap[searchKey] = (trendingMap[searchKey] || 0) + 1;
      }
    });

    const sortedParishes = Object.entries(parishCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([parish, count]) => ({ parish, count }));

    const sortedPropertyTypes = Object.entries(propertyTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));

    const sortedRequests = Object.entries(requestTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([request_type, count]) => ({ request_type, count }));

    const sortedBedrooms = Object.entries(bedroomCounts)
      .map(([bedrooms, count]) => ({ bedrooms, count }))
      .sort((a, b) => b.count - a.count);

    const sortedTrendingSearches = Object.entries(trendingMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([phrase, count]) => ({ phrase, count }));

    const monthlyTrendEntries = Object.entries(monthlyCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, count]) => ({ month, count }));

    const avgBudget = budgetCount > 0 ? Math.round(budgetSum / budgetCount) : 0;
    const avgBedrooms = bedroomCount > 0 ? Number((bedroomSum / bedroomCount).toFixed(1)) : 0;

    const currentMonthLabel = monthStart.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    const growthRate = previousMonthCount > 0
      ? ((currentMonthCount - previousMonthCount) / previousMonthCount) * 100
      : currentMonthCount > 0
        ? 100
        : 0;

    const mostRequestedParish = sortedParishes[0]?.parish || 'N/A';
    const mostRequestedProperty = sortedPropertyTypes[0]?.type || 'N/A';

    const buyRentShare = sortedRequests.map((item) => ({
      type: item.request_type,
      count: item.count,
      percentage: totalRequests > 0 ? Math.round((item.count / totalRequests) * 100) : 0,
    }));

    const rentBudgets = Object.entries(rentBudgetCounts).map(([label, count]) => ({ label, count, percentage: totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0 }));
    const purchaseBudgets = Object.entries(purchaseBudgetCounts).map(([label, count]) => ({ label, count, percentage: totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0 }));

    return res.status(200).json({
      success: true,
      metrics: {
        totalRequests,
        requestsThisMonth: currentMonthCount,
        averageBudget: avgBudget,
        mostRequestedParish,
        mostRequestedProperty,
        averageBedrooms: avgBedrooms,
        growthRate: Math.round(growthRate),
        currentMonthLabel,
        monthlyTrend: monthlyTrendEntries,
        buyRentShare,
        propertyTypeDemand: sortedPropertyTypes,
        parishDemand: sortedParishes.slice(0, 12),
        bedroomDemand: sortedBedrooms,
        urgencyCounts,
        rentBudgets,
        purchaseBudgets,
        trendingSearches: sortedTrendingSearches.slice(0, 6),
      },
    });
  } catch (error) {
    console.error('Admin market intelligence error:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Failed to fetch market intelligence';
    return res.status(500).json({ error: message });
  }
}
