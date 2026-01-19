/**
 * PRICING PLANS DEFINITION
 * Jamaica Real Estate Agent Platform
 * 
 * Plan Details:
 * - Free: Limited access, rentals under J$80k only
 * - 7-Day: Low-risk entry, some restrictions
 * - 30-Day: Most popular, full access
 * - 90-Day: Best value, full access with discount
 */

export const PRICING_PLANS = {
  free: {
    id: 'free',
    name: 'Free Access',
    duration: 'Unlimited',
    price: 'J$0',
    durationDays: null,
    badge: 'Free',
    description: 'Test the platform on small rentals',
    features: [
      { text: 'No buyer leads', included: false },
      { text: 'No rental leads over J$80,000', included: false },
      { text: 'No purchase requests', included: false },
    ],
    restrictions: {
      maxRentalBudget: 80000,
      allowBuyRequests: false,
      allowSellRequests: false,
      allowLeasRequests: false,
      allowValuationRequests: false,
    }
  },
  '7-day': {
    id: '7-day',
    name: '7-Day Access',
    duration: '7 days',
    price: 'J$3,500',
    durationDays: 7,
    badge: 'New',
    description: 'Low-risk entry to more leads',
    features: [
      { text: 'No rentals over J$100,000', included: false },
      { text: 'No buyer requests over J$10M', included: false },
      { text: 'No Sales leads', included: false },
    ],
    restrictions: {
      maxRentalBudget: 100000,
      maxBuyerBudget: 10000000,
      allowBuyRequests: true,
      allowSellRequests: false,
      allowLeasRequests: true,
      allowValuationRequests: true,
    }
  },
  '30-day': {
    id: '30-day',
    name: '30-Day Access',
    duration: '30 days',
    price: 'J$10,000',
    durationDays: 30,
    badge: 'Most Popular',
    description: 'Full access to all requests and features',
    features: [
      { text: 'All Access', included: true },
      { text: 'All budgets and requests included', included: true },
      { text: 'All sales', included: true },
    ],
    restrictions: {
      maxRentalBudget: Infinity,
      maxBuyerBudget: Infinity,
      allowBuyRequests: true,
      allowSellRequests: true,
      allowLeasRequests: true,
      allowValuationRequests: true,
    }
  },
  '90-day': {
    id: '90-day',
    name: '90-Day Access',
    duration: '90 days',
    price: 'J$25,000',
    durationDays: 90,
    badge: 'Best Value',
    description: 'Same power, lower cost per day',
    features: [
      { text: 'Everything in 30-Day Access', included: true },
      { text: 'Discount pricing for 90 days', included: true },
      { text: 'Early access to new requests', included: true },
    ],
    restrictions: {
      maxRentalBudget: Infinity,
      maxBuyerBudget: Infinity,
      allowBuyRequests: true,
      allowSellRequests: true,
      allowLeasRequests: true,
      allowValuationRequests: true,
    }
  }
};

export const PLAN_COLORS = {
  free: '#10b981',      // emerald
  '7-day': '#f59e0b',   // amber
  '30-day': '#3b82f6',  // blue
  '90-day': '#8b5cf6'   // violet
};

export const BUDGET_RANGES = [
  { min: 10000, max: 50000, label: 'J$10K - J$50K' },
  { min: 50000, max: 100000, label: 'J$50K - J$100K' },
  { min: 100000, max: 500000, label: 'J$100K - J$500K' },
  { min: 500000, max: 1000000, label: 'J$500K - J$1M' },
  { min: 1000000, max: 5000000, label: 'J$1M - J$5M' },
  { min: 5000000, max: 10000000, label: 'J$5M - J$10M' },
  { min: 10000000, max: 50000000, label: 'J$10M - J$50M' },
  { min: 50000000, max: 100000000, label: 'J$50M - J$100M' },
  { min: 100000000, max: Infinity, label: 'J$100M+' },
];

export const getPlanStatus = (paymentStatus, accessExpiry) => {
  const now = new Date();
  const expiry = accessExpiry ? new Date(accessExpiry) : null;

  if (paymentStatus === 'free') {
    return { status: 'active', label: 'Free Plan', color: PLAN_COLORS.free };
  }

  if (!expiry || expiry < now) {
    return { status: 'expired', label: 'Expired', color: '#ef4444' };
  }

  return {
    status: 'active',
    label: `Active (${PRICING_PLANS[paymentStatus]?.duration || 'Unlimited'})`,
    color: PLAN_COLORS[paymentStatus]
  };
};

export const formatBudget = (amount) => {
  if (amount === Infinity) return 'J$100M+';
  if (!amount) return 'N/A';
  if (amount >= 1000000) {
    return `J$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `J$${(amount / 1000).toFixed(0)}K`;
  }
  return `J$${amount}`;
};
