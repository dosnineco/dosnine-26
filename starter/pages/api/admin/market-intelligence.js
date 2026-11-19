import { getDbClient, requireAdminUser } from '../../../lib/apiAuth';

const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 0;
  return Number(value);
};

const formatPercent = (value) => `${Math.round(value)}%`;
const OPTIONAL_SCHEMA_ERROR_CODES = new Set(['42P01', '42703', 'PGRST204', 'PGRST205']);
const BANK_TRANSFER_REVENUE_FIELDS = {
  premium: 'premiumPlans',
  property_boost: 'propertyBoosts',
  agent_request_applications: 'agentApplications',
  property_search: 'propertySearches',
  request_urgency: 'urgencyBoosts',
  request_urgency_batch: 'urgencyBoosts',
};

function getJamaicaMonthStart(date, monthOffset = 0) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Jamaica',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  return new Date(Date.UTC(year, month - 1 + monthOffset, 1, 5));
}

function getJamaicaPreviousMonthCutoff(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Jamaica',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]));
  const previousMonth = new Date(Date.UTC(values.year, values.month - 2, 1));
  const previousMonthLastDay = new Date(Date.UTC(
    previousMonth.getUTCFullYear(),
    previousMonth.getUTCMonth() + 1,
    0
  )).getUTCDate();
  const day = Math.min(values.day, previousMonthLastDay);
  return new Date(Date.UTC(
    previousMonth.getUTCFullYear(),
    previousMonth.getUTCMonth(),
    day,
    values.hour + 5,
    values.minute,
    values.second,
    date.getUTCMilliseconds()
  ));
}

function jamaicaDateString(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Jamaica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function optionalRows(query, label) {
  const { data, error, count } = await query;
  if (error) {
    if (OPTIONAL_SCHEMA_ERROR_CODES.has(error.code)) {
      return { label, available: false, rows: [], count: null };
    }
    throw new Error(`${label}: ${error.message}`);
  }
  return { label, available: true, rows: data || [], count };
}

function createRevenueBucket() {
  return {
    jmd: {
      agentPlans: 0,
      sponsorships: 0,
      htvRevenue: 0,
      htvExpenses: 0,
      htvProfit: 0,
      premiumPlans: 0,
      propertyBoosts: 0,
      agentApplications: 0,
      propertySearches: 0,
      urgencyBoosts: 0,
      totalRevenue: 0,
    },
    usd: {
      propertySearches: 0,
      urgencyBoosts: 0,
      totalRevenue: 0,
    },
    counts: {
      agentPlans: 0,
      sponsorships: 0,
      htvOrders: 0,
      premiumPlans: 0,
      propertyBoosts: 0,
      agentApplications: 0,
      propertySearchesJmd: 0,
      propertySearchesUsd: 0,
      urgencyBoosts: 0,
    },
  };
}

function addRevenue(bucket, currency, field, amount) {
  const normalizedCurrency = String(currency || '').toLowerCase();
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return;
  if (normalizedCurrency === 'jmd' && bucket.jmd[field] !== undefined) {
    bucket.jmd[field] += numericAmount;
  } else if (normalizedCurrency === 'usd' && bucket.usd[field] !== undefined) {
    bucket.usd[field] += numericAmount;
  }
}

function addToMonthBuckets(
  buckets,
  timestamp,
  callback,
  currentMonthStart,
  previousMonthStart,
  previousMonthCutoff,
  now
) {
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return;
  if (time >= currentMonthStart.getTime() && time < now.getTime()) {
    callback(buckets.currentMonth);
  } else if (time >= previousMonthStart.getTime() && time < previousMonthCutoff.getTime()) {
    callback(buckets.previousMonth);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const db = getDbClient();
    const now = new Date();
    const currentMonthStart = getJamaicaMonthStart(now);
    const previousMonthStart = getJamaicaMonthStart(now, -1);
    const previousMonthCutoff = getJamaicaPreviousMonthCutoff(now);
    const nextMonthStart = getJamaicaMonthStart(now, 1);
    const currentMonthDate = jamaicaDateString(currentMonthStart);
    const nextMonthDate = jamaicaDateString(nextMonthStart);

    const { data: rows, error } = await db
      .from('service_requests')
      .select('request_type, property_type, parish, location, bedrooms, budget_min, budget_max, urgency, status, created_at')
      .order('created_at', { ascending: true })
      .limit(50000);

    if (error) throw error;

    const { data: buyerRows, error: buyerError } = await db
      .from('buyer_prequalifications')
      .select('status, qualification_level, verified_budget_min, verified_budget_max, verification_expires_at, consent_to_share')
      .limit(50000);

    if (buyerError) throw buyerError;

    const periodQuery = (table, columns, dateColumn) => db
      .from(table)
      .select(columns)
      .gte(dateColumn, previousMonthStart.toISOString())
      .lt(dateColumn, now.toISOString());
    const [
      agentPaymentsResult,
      sponsorPaymentsResult,
      bankTransferPaymentsResult,
      htvOrdersResult,
      htvExpensesResult,
      paidSearchesResult,
      urgencyPaymentsResult,
      urgencyBatchesResult,
      advertisementsResult,
      agentsResult,
      unpaidSponsorsResult,
      paidSponsorSlotsResult,
      settingsResult,
    ] = await Promise.all([
      optionalRows(
        periodQuery('agents', 'payment_amount, payment_date', 'payment_date'),
        'Agent plan payments'
      ),
      optionalRows(
        periodQuery('sponsor_submissions', 'amount, paid_at', 'paid_at')
          .eq('payment_status', 'paid'),
        'Sponsor payments'
      ),
      optionalRows(
        periodQuery(
          'bank_transfer_payments',
          'source_type, source_id, amount, currency, reviewed_at',
          'reviewed_at'
        ).eq('status', 'approved'),
        'Approved bank transfers'
      ),
      optionalRows(
        periodQuery(
          'htv_orders',
          'status, revenue, total, expenses, raw_material_cost, labor_cost, other_expenses, created_at',
          'created_at'
        ),
        'HTV orders'
      ),
      optionalRows(
        db
          .from('htv_expenses')
          .select('amount, expense_date')
          .gte('expense_date', jamaicaDateString(previousMonthStart))
          .lte('expense_date', jamaicaDateString(now)),
        'HTV expenses'
      ),
      optionalRows(
        periodQuery('paid_property_search_requests', 'amount, currency, paid_at', 'paid_at')
          .eq('status', 'paid'),
        'Paid property searches'
      ),
      optionalRows(
        periodQuery('service_request_urgency_payments', 'amount, currency, paid_at', 'paid_at')
          .eq('status', 'paid'),
        'Priority upgrades'
      ),
      optionalRows(
        periodQuery('service_request_urgency_boost_batches', 'amount, currency, paid_at', 'paid_at')
          .eq('status', 'paid'),
        'Priority upgrade bundles'
      ),
      optionalRows(
        db.from('advertisements').select('is_active, impressions, clicks'),
        'Advertisement reach'
      ),
      optionalRows(
        db.from('agents').select('payment_status, access_expiry, verification_status'),
        'Agent subscription opportunities'
      ),
      optionalRows(
        db
          .from('sponsor_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('payment_status', 'unpaid')
          .neq('status', 'rejected'),
        'Unpaid sponsor submissions'
      ),
      optionalRows(
        db
          .from('sponsor_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('payment_status', 'paid')
          .neq('status', 'rejected')
          .gte('scheduled_month', currentMonthDate)
          .lt('scheduled_month', nextMonthDate),
        'Reserved sponsor slots'
      ),
      optionalRows(
        db
          .from('site_settings')
          .select('key, value')
          .in('key', ['plan_prices', 'ad_plan_prices', 'request_urgency_prices']),
        'Configured product prices'
      ),
    ]);

    const requests = Array.isArray(rows) ? rows : [];
    const buyerAssessments = Array.isArray(buyerRows) ? buyerRows : [];
    const totalRequests = requests.length;

    const monthStart = currentMonthStart;
    const prevMonthStart = previousMonthStart;

    const monthlyCounts = {};
    const propertyTypeCounts = {};
    const parishCounts = {};
    const communityDemandMap = {};
    const requestTypeCounts = {};
    const bedroomCounts = { '1': 0, '2': 0, '3': 0, '4+': 0 };
    const urgencyCounts = { low: 0, normal: 0, high: 0, urgent: 0 };
    const rentBudgetCounts = { '<75k': 0, '75k-150k': 0, '150k-300k': 0, '300k+': 0 };
    const purchaseBudgetCounts = { '<10M': 0, '10M-20M': 0, '20M-40M': 0, '40M+': 0 };
    const verificationStatusCounts = {
      registered: 0,
      under_review: 0,
      verified: 0,
      confirmed: 0,
      rejected: 0,
      expired: 0,
    };
    const verifiedBudgetCounts = { '<10M': 0, '10M-20M': 0, '20M-40M': 0, '40M+': 0 };
    const trendingMap = {};
    let currentMonthCount = 0;
    let previousMonthCount = 0;
    let budgetSum = 0;
    let budgetCount = 0;
    let bedroomSum = 0;
    let bedroomCount = 0;

    const formatMonthKey = (date) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Jamaica',
        year: 'numeric',
        month: '2-digit',
      }).formatToParts(date);
      const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
      return `${values.year}-${values.month}`;
    };

    let activeVerifiedBuyerCount = 0;
    let verifiedBudgetSum = 0;
    let verifiedBudgetCount = 0;
    const timestamp = Date.now();

    buyerAssessments.forEach((assessment) => {
      const status = String(assessment.status || '').toLowerCase();
      if (verificationStatusCounts[status] !== undefined) {
        verificationStatusCounts[status] += 1;
      }

      const expiresAt = assessment.verification_expires_at
        ? new Date(assessment.verification_expires_at).getTime()
        : null;
      const isActiveVerifiedBuyer =
        assessment.consent_to_share === true &&
        ['verified', 'confirmed'].includes(status) &&
        Number(assessment.qualification_level) >= 3 &&
        (expiresAt === null || expiresAt > timestamp);
      if (!isActiveVerifiedBuyer) return;

      activeVerifiedBuyerCount += 1;
      const budgetMin = formatNumber(assessment.verified_budget_min);
      const budgetMax = formatNumber(assessment.verified_budget_max);
      const budgetValue = budgetMax || budgetMin;
      if (budgetValue <= 0) return;

      verifiedBudgetSum += budgetValue;
      verifiedBudgetCount += 1;
      if (budgetValue < 10000000) verifiedBudgetCounts['<10M'] += 1;
      else if (budgetValue < 20000000) verifiedBudgetCounts['10M-20M'] += 1;
      else if (budgetValue < 40000000) verifiedBudgetCounts['20M-40M'] += 1;
      else verifiedBudgetCounts['40M+'] += 1;
    });

    requests.forEach((item) => {
      const created = item.created_at ? new Date(item.created_at) : null;
      if (!created || Number.isNaN(created.getTime())) return;

      const monthKey = formatMonthKey(created);
      monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;

      if (created >= monthStart && created < now) currentMonthCount += 1;
      if (created >= prevMonthStart && created < previousMonthCutoff) previousMonthCount += 1;

      const type = String(item.request_type || 'unknown').toLowerCase();
      requestTypeCounts[type] = (requestTypeCounts[type] || 0) + 1;

      const propertyType = String(item.property_type || 'other').toLowerCase();
      propertyTypeCounts[propertyType] = (propertyTypeCounts[propertyType] || 0) + 1;

      const parish = String(item.parish || '').trim();
      if (parish) parishCounts[parish] = (parishCounts[parish] || 0) + 1;

      const requestStatus = String(item.status || '').toLowerCase();
      if (!['completed', 'withdrawn', 'cancelled', 'rejected'].includes(requestStatus)) {
        const location = String(item.location || '').trim();
        const communityName = location || parish || 'Not captured';
        const communityKey = communityName.toLocaleLowerCase();
        if (!communityDemandMap[communityKey]) {
          communityDemandMap[communityKey] = {
            community: communityName.toLowerCase() === 'not captured'
              ? 'Not captured'
              : communityName,
            count: 0,
            demandTypes: {},
            budgetMinSum: 0,
            budgetMinCount: 0,
            budgetMaxSum: 0,
            budgetMaxCount: 0,
          };
        }
        const community = communityDemandMap[communityKey];
        community.count += 1;
        const demandType = ['rent', 'lease'].includes(type)
          ? `Seeking ${propertyType} for ${type === 'lease' ? 'lease' : 'rent'}`
          : type === 'buy'
            ? `Seeking ${propertyType} to buy`
            : type === 'sell'
              ? `Selling ${propertyType}`
              : type === 'valuation'
                ? `${propertyType} valuation`
                : `Seeking ${propertyType}`;
        community.demandTypes[demandType] = (community.demandTypes[demandType] || 0) + 1;
      }

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
      if (!['completed', 'withdrawn', 'cancelled', 'rejected'].includes(requestStatus)) {
        const communityName = String(item.location || item.parish || 'Not captured').trim() || 'Not captured';
        const community = communityDemandMap[communityName.toLocaleLowerCase()];
        if (budgetMin > 0) {
          community.budgetMinSum += budgetMin;
          community.budgetMinCount += 1;
        }
        if (budgetMax > 0) {
          community.budgetMaxSum += budgetMax;
          community.budgetMaxCount += 1;
        }
      }
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

    const communityDemand = Object.values(communityDemandMap)
      .map((community) => {
        const topDemand = Object.entries(community.demandTypes)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Property inquiry';
        return {
          community: community.community,
          count: community.count,
          topDemand,
          averageBudgetMin: community.budgetMinCount > 0
            ? Math.round(community.budgetMinSum / community.budgetMinCount)
            : null,
          averageBudgetMax: community.budgetMaxCount > 0
            ? Math.round(community.budgetMaxSum / community.budgetMaxCount)
            : null,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

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
    const averageVerifiedBudget = verifiedBudgetCount > 0
      ? Math.round(verifiedBudgetSum / verifiedBudgetCount)
      : 0;
    const avgBedrooms = bedroomCount > 0 ? Number((bedroomSum / bedroomCount).toFixed(1)) : 0;

    const currentMonthLabel = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Jamaica',
    }).format(now);
    const growthRate = previousMonthCount > 0
      ? ((currentMonthCount - previousMonthCount) / previousMonthCount) * 100
      : currentMonthCount > 0
        ? 100
        : 0;

    const mostRequestedParish = sortedParishes[0]?.parish || 'N/A';
    const mostRequestedProperty = sortedPropertyTypes[0]?.type || 'N/A';

    const revenueBuckets = {
      currentMonth: createRevenueBucket(),
      previousMonth: createRevenueBucket(),
    };
    const addPeriodRevenue = (timestamp, callback) => addToMonthBuckets(
      revenueBuckets,
      timestamp,
      callback,
      currentMonthStart,
      previousMonthStart,
      previousMonthCutoff,
      now
    );

    const bankTransferSources = new Set();
    bankTransferPaymentsResult.rows.forEach((payment) => {
      if (payment.source_type && payment.source_id) {
        bankTransferSources.add(`${payment.source_type}:${payment.source_id}`);
      }
      addPeriodRevenue(payment.reviewed_at, (bucket) => {
        const field = BANK_TRANSFER_REVENUE_FIELDS[payment.source_type];
        if (!field) return;
        addRevenue(bucket, payment.currency, field, payment.amount);
        if (payment.source_type === 'property_search') {
          if (String(payment.currency || '').toLowerCase() === 'jmd') {
            bucket.counts.propertySearchesJmd += 1;
          } else if (String(payment.currency || '').toLowerCase() === 'usd') {
            bucket.counts.propertySearchesUsd += 1;
          }
        } else if (payment.source_type === 'request_urgency' || payment.source_type === 'request_urgency_batch') {
          bucket.counts.urgencyBoosts += 1;
        }
      });
    });

    agentPaymentsResult.rows.forEach((payment) => {
      addPeriodRevenue(payment.payment_date, (bucket) => {
        addRevenue(bucket, 'JMD', 'agentPlans', payment.payment_amount);
        bucket.counts.agentPlans += 1;
      });
    });
    sponsorPaymentsResult.rows.forEach((payment) => {
      addPeriodRevenue(payment.paid_at, (bucket) => {
        addRevenue(bucket, 'JMD', 'sponsorships', payment.amount);
        bucket.counts.sponsorships += 1;
      });
    });
    htvOrdersResult.rows.forEach((order) => {
      if (String(order.status || '').toLowerCase() !== 'completed') return;
      addPeriodRevenue(order.created_at, (bucket) => {
        const revenue = Number(order.revenue) > 0
          ? Number(order.revenue)
          : Number(order.total) || 0;
        const expenses = Number(order.expenses) || (
          (Number(order.raw_material_cost) || 0) +
          (Number(order.labor_cost) || 0) +
          (Number(order.other_expenses) || 0)
        );
        addRevenue(bucket, 'JMD', 'htvRevenue', revenue);
        bucket.jmd.htvExpenses += expenses;
        bucket.jmd.htvProfit += revenue - expenses;
        bucket.counts.htvOrders += 1;
      });
    });
    htvExpensesResult.rows.forEach((expense) => {
      const month = String(expense.expense_date || '').slice(0, 7);
      const currentMonth = currentMonthDate.slice(0, 7);
      const previousMonth = jamaicaDateString(previousMonthStart).slice(0, 7);
      const previousCutoffDate = jamaicaDateString(
        new Date(previousMonthCutoff.getTime() - 1)
      );
      const bucket = month === currentMonth
        ? revenueBuckets.currentMonth
        : month === previousMonth && String(expense.expense_date || '') <= previousCutoffDate
          ? revenueBuckets.previousMonth
          : null;
      if (bucket) {
        const amount = Number(expense.amount);
        if (Number.isFinite(amount)) {
          bucket.jmd.htvExpenses += amount;
          bucket.jmd.htvProfit -= amount;
        }
      }
    });
    paidSearchesResult.rows.forEach((payment) => {
      if (bankTransferSources.has(`property_search:${payment.id}`)) return;
      addPeriodRevenue(payment.paid_at, (bucket) => {
        const currency = String(payment.currency || '').toLowerCase();
        addRevenue(bucket, currency, 'propertySearches', payment.amount);
        if (currency === 'jmd') bucket.counts.propertySearchesJmd += 1;
        if (currency === 'usd') bucket.counts.propertySearchesUsd += 1;
      });
    });
    [urgencyPaymentsResult, urgencyBatchesResult].forEach((result) => {
      result.rows.forEach((payment) => {
        const sourceType = result === urgencyPaymentsResult
          ? 'request_urgency'
          : 'request_urgency_batch';
        if (bankTransferSources.has(`${sourceType}:${payment.id}`)) return;
        addPeriodRevenue(payment.paid_at, (bucket) => {
          addRevenue(bucket, payment.currency, 'urgencyBoosts', payment.amount);
          bucket.counts.urgencyBoosts += 1;
        });
      });
    });
    Object.values(revenueBuckets).forEach((bucket) => {
      bucket.jmd.totalRevenue =
        bucket.jmd.agentPlans +
        bucket.jmd.sponsorships +
        bucket.jmd.htvRevenue +
        bucket.jmd.premiumPlans +
        bucket.jmd.propertyBoosts +
        bucket.jmd.agentApplications +
        bucket.jmd.propertySearches;
      bucket.jmd.totalRevenue += bucket.jmd.urgencyBoosts;
      bucket.usd.totalRevenue =
        bucket.usd.propertySearches + bucket.usd.urgencyBoosts;
    });

    const settings = Object.fromEntries(
      settingsResult.rows.map(({ key, value }) => [key, value || {}])
    );
    const eligibleAgents = agentsResult.rows.filter((agent) => {
      if (agent.verification_status !== 'approved') return false;
      if (agent.payment_status === 'free') return true;
      return agent.access_expiry
        && new Date(agent.access_expiry).getTime() < now.getTime();
    }).length;
    const monthlyAgentPrice = Number(settings.plan_prices?.['30-day']) || 5175;
    const monthlyAdPrice = Number(settings.ad_plan_prices?.['30-day']) || 0;
    const paidSponsorSlots = paidSponsorSlotsResult.count || 0;
    const sponsorCapacity = 40;
    const activeAdvertisements = advertisementsResult.rows.filter((ad) => ad.is_active !== false);
    const advertisementReach = activeAdvertisements.reduce((totals, ad) => ({
      impressions: totals.impressions + (Number(ad.impressions) || 0),
      clicks: totals.clicks + (Number(ad.clicks) || 0),
    }), { impressions: 0, clicks: 0 });
    const monetizationSources = [
      agentPaymentsResult,
      sponsorPaymentsResult,
      bankTransferPaymentsResult,
      htvOrdersResult,
      htvExpensesResult,
      paidSearchesResult,
      urgencyPaymentsResult,
      urgencyBatchesResult,
      advertisementsResult,
      agentsResult,
      unpaidSponsorsResult,
      paidSponsorSlotsResult,
      settingsResult,
    ];

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
        activeVerifiedBuyerCount,
        averageVerifiedBudget,
        verifiedBudgetCount,
        verificationStatusCounts,
        verifiedBudgetRanges: Object.entries(verifiedBudgetCounts).map(([label, count]) => ({
          label,
          count,
          percentage: verifiedBudgetCount > 0
            ? Math.round((count / verifiedBudgetCount) * 100)
            : 0,
        })),
        mostRequestedParish,
        mostRequestedProperty,
        averageBedrooms: avgBedrooms,
        growthRate: Math.round(growthRate),
        currentMonthLabel,
        monthlyTrend: monthlyTrendEntries,
        buyRentShare,
        propertyTypeDemand: sortedPropertyTypes,
        parishDemand: sortedParishes.slice(0, 12),
        communityDemand,
        bedroomDemand: sortedBedrooms,
        urgencyCounts,
        rentBudgets,
        purchaseBudgets,
        trendingSearches: sortedTrendingSearches.slice(0, 6),
        monetization: {
          monthLabel: new Intl.DateTimeFormat('en-JM', {
            month: 'long',
            year: 'numeric',
            timeZone: 'America/Jamaica',
          }).format(now),
          currentMonth: revenueBuckets.currentMonth,
          previousMonth: revenueBuckets.previousMonth,
          opportunities: {
            eligibleAgents,
            monthlyAgentPrice,
            eligibleAgentRevenueCeiling: eligibleAgents * monthlyAgentPrice,
            unpaidSponsors: unpaidSponsorsResult.count || 0,
            paidSponsorSlots,
            sponsorCapacity,
            remainingSponsorSlots: Math.max(sponsorCapacity - paidSponsorSlots, 0),
            monthlyAdPrice,
            paidSearchJmdPrice: 2500,
            paidSearchUsdPrice: 9.99,
            urgencyPrices: settings.request_urgency_prices || {},
            activeAdvertisements: activeAdvertisements.length,
            advertisementImpressions: advertisementReach.impressions,
            advertisementClicks: advertisementReach.clicks,
          },
          unavailableSources: monetizationSources
            .filter((source) => !source.available)
            .map((source) => source.label),
        },
      },
    });
  } catch (error) {
    console.error('Admin market intelligence error:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Failed to fetch market intelligence';
    return res.status(500).json({ error: message });
  }
}
