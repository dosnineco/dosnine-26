import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, DollarSign, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL_PRICES = {
  agent: { '7-day': 1499, '30-day': 5175, '90-day': 14999, free: 0 },
  ads: { '14-day': 17999, '30-day': 52499, pro: 90999 },
  urgency: { high: 9.99, urgent: 14.99 },
  other: {
    premium_service_price: 3178.4,
    property_boost_price: 500,
    paid_property_search_prices: { USD: 9.99, JMD: 2500 },
  },
};

const PRICE_FIELDS = {
  agent: [
    ['7-day', '7-day agent access', 'JMD'],
    ['30-day', '1-month agent access', 'JMD'],
    ['90-day', '3-month agent access', 'JMD'],
    ['free', 'Free agent access', 'JMD'],
  ],
  ads: [
    ['14-day', '14-day advertiser plan', 'JMD'],
    ['30-day', '30-day advertiser plan', 'JMD'],
    ['pro', 'Pro advertiser plan', 'JMD'],
  ],
  urgency: [
    ['high', 'High urgency request boost', 'USD'],
    ['urgent', 'Urgent request boost', 'USD'],
  ],
  other: [
    ['premium_service_price', '30-day Premium Property Plan', 'JMD'],
    ['property_boost_price', '30-day property visibility boost', 'JMD'],
    ['paid_property_search_prices.USD', 'Property search request', 'USD'],
    ['paid_property_search_prices.JMD', 'Property search request', 'JMD'],
  ],
};

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Unable to save payment pricing.');
  }
  return payload;
}

function getPrice(prices, field) {
  const [key, nested] = field.split('.');
  return nested ? prices[key]?.[nested] : prices[key];
}

function setPrice(prices, field, value) {
  const [key, nested] = field.split('.');
  if (!nested) return { ...prices, [key]: value };
  return {
    ...prices,
    [key]: { ...prices[key], [nested]: value },
  };
}

export default function PaymentPricingPage() {
  const [prices, setPrices] = useState(INITIAL_PRICES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadPrices() {
      try {
        const accessResponse = await fetch('/api/admin/verify-admin', { credentials: 'include' });
        const access = await accessResponse.json();
        if (!accessResponse.ok) throw new Error(access?.error || 'Administrator access is required.');
        if (!access.isAdmin) throw new Error('Administrator access is required.');
        const [agent, ads, urgency, other] = await Promise.all([
          requestJson('/api/admin/agents/plan-prices'),
          requestJson('/api/admin/advertisements'),
          requestJson('/api/site-settings/request-urgency-prices'),
          requestJson('/api/admin/payment-pricing'),
        ]);
        if (!active) return;
        setPrices({
          agent: { ...INITIAL_PRICES.agent, ...agent.planPrices },
          ads: { ...INITIAL_PRICES.ads, ...ads.adPlanPrices },
          urgency: { ...INITIAL_PRICES.urgency, ...urgency.requestUrgencyPrices },
          other: { ...INITIAL_PRICES.other, ...other.prices,
            paid_property_search_prices: {
              ...INITIAL_PRICES.other.paid_property_search_prices,
              ...other.prices?.paid_property_search_prices,
            },
          },
        });
        setAuthorized(true);
      } catch (error) {
        if (active) toast.error(error.message || 'Unable to load payment prices.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadPrices();
    return () => { active = false; };
  }, []);

  const saveSection = async (section) => {
    setSaving(section);
    try {
      let payload;
      if (section === 'agent') {
        payload = await requestJson('/api/admin/agents/plan-prices', {
          method: 'PATCH',
          body: JSON.stringify({ planPrices: prices.agent }),
        });
        setPrices((current) => ({ ...current, agent: payload.planPrices }));
      } else if (section === 'ads') {
        payload = await requestJson('/api/admin/advertisements', {
          method: 'PATCH',
          body: JSON.stringify({ adPlanPrices: prices.ads }),
        });
        setPrices((current) => ({ ...current, ads: payload.adPlanPrices || current.ads }));
      } else if (section === 'urgency') {
        payload = await requestJson('/api/site-settings/request-urgency-prices', {
          method: 'PATCH',
          body: JSON.stringify({ requestUrgencyPrices: prices.urgency }),
        });
        setPrices((current) => ({ ...current, urgency: payload.requestUrgencyPrices }));
      } else {
        payload = await requestJson('/api/admin/payment-pricing', {
          method: 'PATCH',
          body: JSON.stringify({
            premiumServicePrice: prices.other.premium_service_price,
            propertyBoostPrice: prices.other.property_boost_price,
            paidPropertySearchPrices: prices.other.paid_property_search_prices,
          }),
        });
        setPrices((current) => ({ ...current, other: { ...current.other, ...payload.prices } }));
      }
      toast.success('Payment prices saved.');
    } catch (error) {
      toast.error(error.message || 'Unable to save payment prices.');
    } finally {
      setSaving('');
    }
  };

  const update = (section, field, value) => {
    setPrices((current) => ({ ...current, [section]: setPrice(current[section], field, value) }));
  };

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center text-gray-600">Loading payment prices…</main>;
  }

  if (!authorized) {
    return <main className="mx-auto max-w-xl px-4 py-20 text-center text-gray-700">Administrator access is required.</main>;
  }

  const sections = [
    ['agent', 'Agent plans', 'These prices control agent PayPal checkout and bank-transfer amounts.'],
    ['ads', 'Advertiser plans', 'These prices control sponsor plan quotes and bank-transfer review.'],
    ['urgency', 'Request boosts', 'Prices are configured and charged in USD per request. Users also see an estimated JMD equivalent at J$155 per US$1.'],
    ['other', 'Premium and property services', 'Premium lasts 30 days and includes one property boost; additional 30-day boosts use the price below.'],
  ];

  return (
    <>
      <Head><title>Payment Pricing — Admin</title></Head>
      <main className="mx-auto min-h-screen max-w-5xl px-4 py-8">
        <Link href="/admin" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-accent">
          <ArrowLeft size={16} aria-hidden="true" /> Admin dashboard
        </Link>
        <header className="mb-8 rounded-2xl bg-accent p-6 text-white sm:p-8">
          <div className="flex items-center gap-3">
            <DollarSign size={28} aria-hidden="true" />
            <div>
              <h1 className="text-2xl font-bold">Payment pricing</h1>
              <p className="mt-1 text-sm text-white/85">Manage the prices used by active checkout flows.</p>
            </div>
          </div>
        </header>

        <div className="space-y-5">
          {sections.map(([key, title, description]) => (
            <section key={key} className="rounded-2xl bg-white p-5 ring-1 ring-gray-200 sm:p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                  <p className="mt-1 text-sm text-gray-600">{description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => saveSection(key)}
                  disabled={saving !== ''}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {PRICE_FIELDS[key].map(([field, label, currency]) => (
                  <label key={field} className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">{label} ({currency})</span>
                    <input
                      type="number"
                      min={currency === 'USD' ? '0.01' : '0'}
                      step={currency === 'USD' || field === 'premium_service_price' ? '0.01' : '1'}
                      value={getPrice(prices[key], field)}
                      onChange={(event) => update(key, field, event.target.value)}
                      className="w-full rounded-xl bg-gray-50 px-4 py-3 text-gray-900 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-accent"
                    />
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
