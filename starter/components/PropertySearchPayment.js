import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import BankTransferPaymentPanel from './BankTransferPaymentPanel';

const fieldClass = 'mt-1.5 w-full rounded-lg bg-white px-3.5 py-3 text-sm text-gray-900 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-[#6E026F]';

export default function PropertySearchPayment() {
  const [prices, setPrices] = useState({ USD: 9.99, JMD: 2500 });
  const [form, setForm] = useState({
    requestType: 'rent',
    propertyType: 'house',
    location: '',
    parish: '',
    budgetMin: '',
    budgetMax: '',
    bedrooms: '',
    phone: '',
    details: '',
    currency: 'USD',
    acceptedTerms: false,
  });
  const [busy, setBusy] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentRequestId, setPaymentRequestId] = useState(null);
  const [serviceRequestId, setServiceRequestId] = useState(null);
  const [receipt, setReceipt] = useState(null);
  useEffect(() => {
    fetch('/api/site-settings/payment-prices', { credentials: 'include' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Unable to load payment prices.');
        setPrices({
          USD: Number(payload?.prices?.paid_property_search_prices?.USD) || 9.99,
          JMD: Number(payload?.prices?.paid_property_search_prices?.JMD) || 2500,
        });
      })
      .catch((error) => {
        console.error('Unable to load property search pricing:', error);
        toast.error('Unable to load current property search pricing.');
      });
  }, []);
  const budgetMin = Number(form.budgetMin) || 0;
  const budgetMax = Number(form.budgetMax) || 0;
  const canSubmitRequest = form.acceptedTerms &&
    form.location.trim().length >= 2 &&
    form.phone.trim().length >= 7 &&
    (!budgetMin || !budgetMax || budgetMin <= budgetMax);
  const price = form.currency === 'JMD'
    ? `J$${prices.JMD.toLocaleString()}`
    : `US$${prices.USD.toFixed(2)}`;

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const createRequest = async () => {
    if (!canSubmitRequest) return;
    setBusy(true);
    try {
      const response = await fetch('/api/property-search/create-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.paymentRequestId || !payload.serviceRequestId) {
        throw new Error(payload.error || 'Unable to create the property request.');
      }
      setPaymentRequestId(payload.paymentRequestId);
      setServiceRequestId(payload.serviceRequestId);
      toast.success('Request created. Complete payment to publish it.');
    } catch (error) {
      toast.error(error.message || 'Unable to create the property request.');
    } finally {
      setBusy(false);
    }
  };

  const submitReceipt = async (file) => {
    const body = new FormData();
    body.append('source_type', 'property_search');
    body.append('source_id', paymentRequestId);
    body.append('receipt', file);
    const response = await fetch('/api/payments/receipt', {
      method: 'POST',
      credentials: 'include',
      body,
    });
    const payload = await response.json();
    if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to submit payment receipt.');
    setReceipt(payload.receipt);
    setPaymentComplete(true);
    toast.success('Receipt submitted for review. Your request will be published after payment is verified.');
  };

  if (paymentComplete) {
    return (
      <section className="mb-8 rounded-2xl bg-emerald-50 p-6 text-emerald-950">
        <h2 className="text-xl font-bold">Property search request submitted</h2>
        <p className="mt-2 text-sm leading-6">
          Your bank transfer receipt is submitted for review. Your request will be published after payment is verified.
        </p>
        <Link href="/my-requests" className="mt-4 inline-flex rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900">
          View My Requests
        </Link>
      </section>
    );
  }

  return (
    <section className="mb-8 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
      <div className="bg-[#6E026F] px-5 py-5 text-white sm:px-7">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white/15 p-2.5">
            <Search size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/75">Dosnine property search</p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">We&apos;ll help source a property</h2>
            <p className="mt-1 text-sm leading-6 text-white/85">
              Tell us what you are looking to rent or buy. We&apos;ll search the areas you specify and help connect you with property owners.
            </p>
          </div>
        </div>
      </div>

      <fieldset disabled={Boolean(paymentRequestId)} className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7 disabled:opacity-70">
        <label className="text-sm font-semibold text-gray-700">
          I am looking to
          <select className={fieldClass} value={form.requestType} onChange={(event) => update('requestType', event.target.value)}>
            <option value="rent">Rent</option>
            <option value="buy">Buy</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Property type
          <select className={fieldClass} value={form.propertyType} onChange={(event) => update('propertyType', event.target.value)}>
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
            <option value="land">Land</option>
            <option value="commercial">Commercial</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Area or town you want us to search
          <input required minLength={2} maxLength={180} className={fieldClass} value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="e.g. Portmore, Spanish Town" />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Parish
          <input maxLength={100} className={fieldClass} value={form.parish} onChange={(event) => update('parish', event.target.value)} placeholder="e.g. St. Catherine" />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Minimum budget (JMD, optional)
          <input type="number" min="0" step="1" className={fieldClass} value={form.budgetMin} onChange={(event) => update('budgetMin', event.target.value)} />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Maximum budget (JMD, optional)
          <input type="number" min="0" step="1" className={fieldClass} value={form.budgetMax} onChange={(event) => update('budgetMax', event.target.value)} />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Bedrooms (optional)
          <input type="number" min="0" max="20" step="1" className={fieldClass} value={form.bedrooms} onChange={(event) => update('bedrooms', event.target.value)} />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Phone number
          <input required minLength={7} maxLength={40} type="tel" className={fieldClass} value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+1 876 ..." />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Request fee currency
          <select className={fieldClass} value={form.currency} onChange={(event) => update('currency', event.target.value)}>
            <option value="USD">US${prices.USD.toFixed(2)} USD</option>
            <option value="JMD">J${prices.JMD.toLocaleString()} JMD</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
          Additional details (optional)
          <textarea maxLength={1500} rows={3} className={fieldClass} value={form.details} onChange={(event) => update('details', event.target.value)} placeholder="Tell us about your preferred features, timeline, or other requirements." />
        </label>
      </fieldset>

      <div className="mx-5 mb-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950 sm:mx-7">
        <p className="font-semibold">Service and payment terms</p>
        <p className="mt-1">
          One-time fee per request: <strong>J${prices.JMD.toLocaleString()} or US${prices.USD.toFixed(2)}</strong>. Your request is created first and remains private until payment is confirmed; no payment is collected when you submit it. The fee is non-refundable after payment, except where required by law. Dosnine sources property information and facilitates introductions; we are not real estate agents or brokers, do not represent either party, and cannot guarantee availability, suitability, a viewing, or a completed transaction. You must independently verify a property, its owner, and all terms.
        </p>
        <label className="mt-3 flex items-start gap-2.5">
          <input type="checkbox" disabled={Boolean(paymentRequestId)} className="mt-1 h-4 w-4 rounded border-amber-400 text-[#6E026F] focus:ring-[#6E026F] disabled:opacity-60" checked={form.acceptedTerms} onChange={(event) => update('acceptedTerms', event.target.checked)} />
          <span>I have read and agree to these terms and the <Link href="/terms-of-service" target="_blank" rel="noreferrer" className="font-semibold underline">Terms of Service</Link>.</span>
        </label>
      </div>

      <div className="px-5 pb-6 sm:px-7">
        {!paymentRequestId ? (
          <button
            type="button"
            disabled={!canSubmitRequest || busy}
            onClick={createRequest}
            className="w-full rounded-xl bg-[#6E026F] px-5 py-3 text-sm font-semibold text-white hover:bg-[#6E026F]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Creating request…' : `Create request — ${price} due after submission`}
          </button>
        ) : (
          <div>
            <p className="mb-3 text-sm text-gray-600">Request #{serviceRequestId} created · {price}</p>
            <BankTransferPaymentPanel
              amount={form.currency === 'JMD' ? prices.JMD : prices.USD}
              currency={form.currency}
              reference={serviceRequestId}
              receipt={receipt}
              onSubmit={submitReceipt}
            />
          </div>
        )}
      </div>
    </section>
  );
}
