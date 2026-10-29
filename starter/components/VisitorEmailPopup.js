import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { DEFAULT_REQUEST_URGENCY_PRICES } from '@/lib/requestUrgencyPricing';

const BUDGET_RANGES = {
  rent: { min: 70000, max: 4000000, step: 10000 },
  buy: { min: 7000000, max: 200000000, step: 100000 },
  sell: { min: 500000, max: 300000000, step: 100000 },
  lease: { min: 70000, max: 10000000, step: 10000 },
  valuation: { min: 500000, max: 300000000, step: 100000 },
  default: { min: 70000, max: 100000000, step: 10000 }
};

const formatJmd = (value) => `J$${Number(value || 0).toLocaleString()}`;
const formatUsd = (value) => `US$${Number(value).toFixed(2)}`;
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

export default function RequestAgentPopup() {
  const { isSignedIn, user } = useUser();

  const [showPopup, setShowPopup] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [urgencyPrices, setUrgencyPrices] = useState(DEFAULT_REQUEST_URGENCY_PRICES);
  const [urgencyPricesLoaded, setUrgencyPricesLoaded] = useState(false);
  const [urgencyPricesAvailable, setUrgencyPricesAvailable] = useState(false);
  const [requestPayment, setRequestPayment] = useState(null);
  const [acceptedUrgencyTerms, setAcceptedUrgencyTerms] = useState(false);

 const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: '',
  requestType: '',
  propertyType: 'house',
  parish: '',
  location: '',
  budgetMin: '',
  budgetMax: '',
  bedrooms: '',
  bathrooms: '',
  description: '',
  urgency: 'normal'
});

  const getBudgetRange = (requestType) => BUDGET_RANGES[requestType] || BUDGET_RANGES.default;
  const budgetRange = getBudgetRange(formData.requestType);

  useEffect(() => {
    const loadUrgencyPrices = async () => {
      try {
        const response = await fetch('/api/site-settings/request-urgency-prices');
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Unable to load request priority prices.');
        }
        setUrgencyPrices(payload.requestUrgencyPrices);
        setUrgencyPricesAvailable(true);
      } catch (error) {
        console.error('Failed to load request priority prices:', error);
        toast.error('Paid request priority is temporarily unavailable.');
      } finally {
        setUrgencyPricesLoaded(true);
      }
    };

    loadUrgencyPrices();
  }, []);


  /* -----------------------------
     Popup Trigger (3 sec delay)
  ------------------------------*/
  useEffect(() => {
    const hasSubmitted = localStorage.getItem('visitor-lead-submitted');
    if (hasSubmitted) {
      setSubmitted(true);
      return;
    }

    const dismissedUntil = sessionStorage.getItem('agent-popup-dismissed-until');
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) {
      return;
    }

    const timer = setTimeout(() => {
      setShowPopup(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  /* -----------------------------
     Lock body scroll
  ------------------------------*/
  useEffect(() => {
    if (showPopup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [showPopup]);

  /* -----------------------------
     Auto-fill user data
  ------------------------------*/
  useEffect(() => {
    if (isSignedIn && user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.fullName || '',
        email: prev.email || user.emailAddresses?.[0]?.emailAddress || '',
        phone: prev.phone || user.phoneNumbers?.[0]?.phoneNumber || ''
      }));
    }
  }, [isSignedIn, user]);

  // Keep budget values inside the selected request-type range.
  useEffect(() => {
    setFormData((prev) => {
      const range = getBudgetRange(prev.requestType);
      const minValue = Number(prev.budgetMin || 0);
      const maxValue = Number(prev.budgetMax || 0);

      const safeMin = minValue
        ? Math.min(Math.max(minValue, range.min), range.max)
        : '';
      const safeMax = maxValue
        ? Math.min(Math.max(maxValue, safeMin), range.max)
        : '';

      return {
        ...prev,
        budgetMin: safeMin === '' ? '' : String(safeMin),
        budgetMax: safeMax === '' ? '' : String(safeMax)
      };
    });
  }, [formData.requestType]);

  /* -----------------------------
     Dismiss (10 min cooldown)
  ------------------------------*/
  const handleDismiss = () => {
    const tenMinutes = Date.now() + (10 * 60 * 1000);
    sessionStorage.setItem('agent-popup-dismissed-until', tenMinutes.toString());
    setShowPopup(false);
  };

  /* -----------------------------
     Input change
  ------------------------------*/
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'budgetMin' || name === 'budgetMax') {
      const range = getBudgetRange(formData.requestType);
      const rawDigits = String(value).replace(/,/g, '').replace(/[^0-9]/g, '');

      if (rawDigits === '') {
        setFormData(prev => ({
          ...prev,
          [name]: ''
        }));
        return;
      }

      let numericValue = Number(rawDigits);
      if (!Number.isFinite(numericValue)) {
        return;
      }

      if (numericValue < 70000) {
        toast.error('Minimum budget is J$70,000.');
        numericValue = range.min;
      }

      if (name === 'budgetMin') {
        numericValue = Math.min(numericValue, range.max);
      }

      if (name === 'budgetMax') {
        numericValue = Math.min(Math.max(numericValue, 0), range.max);

        const currentMin = Number(formData.budgetMin || 0);
        if (currentMin && numericValue < currentMin) {
          toast.error('Budget max cannot be smaller than minimum budget.');
          numericValue = currentMin;
        }
      }

      setFormData(prev => {
        const next = {
          ...prev,
          [name]: String(numericValue)
        };

        if (name === 'budgetMin' && next.budgetMax && Number(next.budgetMax) < numericValue) {
          next.budgetMax = String(numericValue);
        }

        return next;
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBudgetSlider = (name, value) => {
    let numericValue = Number(value);
    const range = getBudgetRange(formData.requestType);

    if (!Number.isFinite(numericValue)) {
      return;
    }

    if (name === 'budgetMin') {
      numericValue = Math.max(numericValue, range.min);
      numericValue = Math.min(numericValue, range.max - range.step);
    }

    setFormData((prev) => {
      const next = { ...prev, [name]: String(numericValue) };
      const currentMin = Number(prev.budgetMin || range.min);
      const currentMax = Number(prev.budgetMax || range.max);

      if (name === 'budgetMin') {
        if (currentMax <= numericValue) {
          next.budgetMax = String(Math.min(numericValue + range.step, range.max));
        }
      }

      if (name === 'budgetMax') {
        const minAllowed = Math.min(Math.max(currentMin + range.step, range.min + range.step), range.max);
        if (numericValue <= currentMin) {
          numericValue = minAllowed;
          next.budgetMax = String(numericValue);
        } else {
          next.budgetMax = String(Math.min(numericValue, range.max));
        }
      }

      return next;
    });
  };

  /* -----------------------------
     Step Navigation
  ------------------------------*/
  const nextStep = () => {
    if (step === 1 && (!formData.name || !formData.email || !formData.phone || !formData.requestType)) {
      toast.error('Please fill required fields');
      return;
    }

    if (step === 2 && (!formData.propertyType || !formData.parish || !formData.location)) {
      toast.error('Please fill property type, parish and location');
      return;
    }

    if (step === 2) {
      setFormData(prev => {
        const range = getBudgetRange(prev.requestType);
        const safeMin = prev.budgetMin
          ? Math.min(Math.max(Number(prev.budgetMin), range.min), Math.max(range.min, range.max - range.step))
          : range.min;
        const safeMax = prev.budgetMax
          ? Math.min(Math.max(Number(prev.budgetMax), safeMin + range.step), range.max)
          : Math.min(safeMin + range.step, range.max);

        return {
          ...prev,
          budgetMin: String(safeMin),
          budgetMax: String(Math.max(safeMax, safeMin + range.step))
        };
      });
    }

    if (step === 3) {
      const range = getBudgetRange(formData.requestType);
      const budgetMin = Number(formData.budgetMin);
      const budgetMax = Number(formData.budgetMax);

      if (!budgetMin || budgetMin < range.min) {
        toast.error(`Please set a minimum budget of at least ${formatJmd(range.min)}.`);
        return;
      }

      if (!budgetMax) {
        toast.error('Please set a maximum budget.');
        return;
      }

      if (budgetMax <= budgetMin) {
        toast.error('Maximum budget must be greater than minimum budget.');
        return;
      }
    }

    if (step < 3) setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  /* -----------------------------
     Submit
  ------------------------------*/
  const handleSubmit = async (e) => {
    e.preventDefault();

if (!formData.name || !formData.email || !formData.phone || 
    !formData.requestType || !formData.propertyType || 
    !formData.parish || !formData.location) {
      toast.error('Please fill all required fields');
      return;
    }
    if (
      ['high', 'urgent'].includes(formData.urgency) &&
      (!urgencyPricesLoaded || !urgencyPricesAvailable)
    ) {
      toast.error('Paid request priority is unavailable. Select normal priority or try again later.');
      return;
    }

    const selectedRange = getBudgetRange(formData.requestType);
    const budgetMin = parseInt(formData.budgetMin, 10);
    const budgetMax = parseInt(formData.budgetMax, 10);

    if (!budgetMin) {
      toast.error('Please set a minimum budget before submitting.');
      return;
    }

    if (budgetMin < selectedRange.min) {
      toast.error(`Minimum ${formData.requestType || 'request'} budget is ${formatJmd(selectedRange.min)}.`);
      return;
    }

    if (!budgetMax) {
      toast.error('Please set a maximum budget before submitting.');
      return;
    }

    if (budgetMax <= budgetMin) {
      toast.error('Budget max must be greater than minimum budget.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/service-requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: formData.name,
          clientEmail: formData.email,
          clientPhone: formData.phone,
          requestType: formData.requestType,
          propertyType: formData.propertyType,
          parish: formData.parish,
          location: formData.location,
          budgetMin: formData.budgetMin ? parseFloat(formData.budgetMin) : null,
          budgetMax: formData.budgetMax ? parseFloat(formData.budgetMax) : null,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
          description: formData.description || null,
          urgency: formData.urgency || 'normal'
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        toast.error(payload?.error || 'Submission failed');
        return;
      }

      if (payload.urgencyPayment) {
        setRequestPayment({
          ...payload.urgencyPayment,
          requestId: payload.request?.id || null,
        });
        toast('Request submitted. Complete checkout to apply the paid priority.');
        return;
      }
      if (payload.urgencyPaymentError) toast.error(payload.urgencyPaymentError);
      finishSubmission();
    } catch (err) {
      console.error('Visitor request submission failed:', err);
      toast.error('Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const finishSubmission = () => {
      localStorage.setItem('visitor-lead-submitted', 'true');
      toast.success('Request submitted successfully!', { duration: 5000 });
      setRequestPayment(null);
      setSubmitted(true);
      setShowPopup(false);
  };

  const createUrgencyOrder = async () => {
    if (!requestPayment) throw new Error('Submit your request before paying for priority.');
    setLoading(true);
    try {
      const response = await fetch('/api/service-requests/urgency/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: requestPayment.paymentId,
          token: requestPayment.token,
          acceptedTerms: acceptedUrgencyTerms,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success || !payload?.orderId) {
        throw new Error(payload?.error || 'Unable to start PayPal checkout.');
      }
      return payload.orderId;
    } finally {
      setLoading(false);
    }
  };

  const captureUrgencyOrder = async (data) => {
    if (!requestPayment) throw new Error('Request priority payment details are missing.');
    setLoading(true);
    try {
      const response = await fetch('/api/service-requests/urgency/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: requestPayment.paymentId,
          token: requestPayment.token,
          orderId: data.orderID,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to confirm PayPal payment.');
      }
      finishSubmission();
    } finally {
      setLoading(false);
    }
  };

  if (!showPopup || submitted) return null;

return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm sm:p-6">

    <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto bg-white shadow-2xl sm:rounded-2xl">

      {!requestPayment && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close request form"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:right-6 sm:top-6"
        >
          <X size={18} />
        </button>
      )}

      {requestPayment ? (
        <section className="mx-auto max-w-2xl p-6 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Request priority boost
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            Complete your {requestPayment.urgency} priority payment
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Your request is submitted at normal priority. Pay {formatUsd(requestPayment.amount)} once to raise it to {requestPayment.urgency} priority and increase the effort we give to sourcing a property. A boost is non-refundable except where required by law and does not guarantee that a suitable property will be found.
          </p>
          <label className="mt-4 flex items-start gap-2.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={acceptedUrgencyTerms}
              onChange={(event) => setAcceptedUrgencyTerms(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
            />
            <span>I understand this is a non-refundable priority fee, except where required by law, and no property or result is guaranteed.</span>
          </label>

          {!PAYPAL_CLIENT_ID ? (
            <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Online checkout is temporarily unavailable. Your request remains submitted at normal priority.
            </p>
          ) : (
            <div className="mt-6">
              <PayPalScriptProvider options={{
                'client-id': PAYPAL_CLIENT_ID,
                currency: 'USD',
                intent: 'capture',
                components: 'buttons',
              }}>
                <PayPalButtons
                  forceReRender={[requestPayment.paymentId, requestPayment.amount]}
                  disabled={loading || !acceptedUrgencyTerms}
                  style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
                  createOrder={createUrgencyOrder}
                  onApprove={captureUrgencyOrder}
                  onCancel={() => {
                    setLoading(false);
                    toast('Checkout cancelled. Your request remains at normal priority.');
                  }}
                  onError={(error) => {
                    console.error('Request priority PayPal checkout failed:', error);
                    setLoading(false);
                    toast.error(error?.message || 'PayPal checkout failed. Please try again.');
                  }}
                />
              </PayPalScriptProvider>
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={finishSubmission}
            className="mt-4 w-full rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Continue without boost
          </button>
        </section>
      ) : (
        <>

      {/* HEADER */}
      <div className="bg-accent p-6 text-white sm:p-10">
        <h2 className="mb-2 text-3xl font-bold">What are you looking for?</h2>
        <p className="mb-6 opacity-90">
          Get matched with verified real estate professionals
        </p>

        <div className="flex items-center justify-center gap-4">
          {[1, 2, 3].map((number, index) => (
            <div key={number} className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition ${
                  step >= number
                    ? 'bg-white text-accent'
                    : 'bg-white/30 text-white'
                }`}
              >
                {number}
              </div>
              {index < 2 && (
                <div
                  className={`h-1 w-10 sm:w-16 transition ${
                    step > number ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mx-auto mt-3 flex max-w-md justify-between text-xs opacity-90">
          <span>Your Info</span>
          <span>Property</span>
          <span>Details</span>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-10">

        {/* STEP 1 */}
        {step === 1 && (
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900">Let&apos;s get started</h2>
              <p className="mb-6 text-gray-600">
                We need a few details to connect you with the right agent.
              </p>
              <div className="space-y-5">
                {[
                  ['name', 'Full Name', 'text', 'eg. John Brown'],
                  ['email', 'Email Address', 'email', 'eg. example@gmail.com'],
                  ['phone', 'Phone Number', 'tel', 'eg. 8761234567'],
                ].map(([name, label, type, placeholder]) => (
                  <div key={name}>
                    <label htmlFor={`visitor-${name}`} className="mb-2 block text-sm font-medium text-gray-700">
                      {label} *
                    </label>
                    <input
                      id={`visitor-${name}`}
                      type={type}
                      name={name}
                      value={formData[name]}
                      onChange={handleInputChange}
                      placeholder={placeholder}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent"
                      required
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-4 block text-sm font-medium text-gray-700">
                What do you need help with? *
              </label>
              <div className="grid grid-cols-2 gap-4">
                {["buy", "rent", "sell", "lease", "valuation"].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, requestType: type }))}
                    className={`rounded-lg border-2 px-5 py-4 font-semibold transition ${
                      formData.requestType === type
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-gray-300 text-gray-700 hover:border-accent hover:bg-accent/5"
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
              <button type="button" onClick={nextStep} className="mt-8 w-full rounded-lg bg-accent py-4 font-semibold text-white transition hover:opacity-90">
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="mx-auto max-w-2xl space-y-6">
            <h2 className="text-center text-2xl font-bold text-gray-900">
              Property Details
            </h2>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Property Type <span className="text-red-500">*</span>
              </label>
              <select
                name="propertyType"
                value={formData.propertyType}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent"
              >
                <option value="house">House</option>
                <option value="apartment">Apartment</option>
                <option value="land">Land</option>
                <option value="commercial">Commercial</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Parish <span className="text-red-500">*</span>
              </label>
              <select
                name="parish"
                value={formData.parish}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent"
                required
              >
                <option value="">Select Parish</option>
                {[
                  'Kingston',
                  'St. Andrew',
                  'St. Thomas',
                  'Portland',
                  'St. Mary',
                  'St. Ann',
                  'Trelawny',
                  'St. James',
                  'Hanover',
                  'Westmoreland',
                  'St. Elizabeth',
                  'Manchester',
                  'Clarendon',
                  'St. Catherine',
                ].map((parish) => (
                  <option key={parish} value={parish}>
                    {parish}
                  </option>
                ))}
              </select>
            </div>


            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Location / Area <span className="text-red-500">*</span>
              </label>
              <input
                placeholder='eg. Patrick City'
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Bedrooms
                </label>
                <input
                  type="number"
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleInputChange}
                  placeholder="Bedrooms"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Bathrooms
                </label>
                <input
                  type="number"
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleInputChange}
                  placeholder="Bathrooms"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={prevStep} className="flex-1 rounded-lg border border-gray-300 py-4 font-semibold transition hover:bg-gray-100">
                Back
              </button>
              <button type="button" onClick={nextStep} className="flex-1 rounded-lg bg-accent py-4 font-semibold text-white transition hover:opacity-90">
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="mx-auto max-w-3xl space-y-6">
            <h2 className="text-center text-2xl font-bold text-gray-900">
              Additional Details
            </h2>

            <div>
              <h3 className="mb-1 text-sm font-semibold text-gray-900">Request priority</h3>
              <p className="text-xs leading-5 text-gray-600">
                Higher-priority requests are shown to agents before standard requests.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3" role="group" aria-label="Choose request priority">
                {[
                  { value: 'normal', label: 'Standard', price: 'Free', detail: 'Regular review' },
                  {
                    value: 'high',
                    label: 'High',
                    price: urgencyPricesAvailable ? formatUsd(urgencyPrices.high) : urgencyPricesLoaded ? 'Unavailable' : 'Loading…',
                    detail: 'Higher priority'
                  },
                  {
                    value: 'urgent',
                    label: 'Urgent',
                    price: urgencyPricesAvailable ? formatUsd(urgencyPrices.urgent) : urgencyPricesLoaded ? 'Unavailable' : 'Loading…',
                    detail: 'Highest priority'
                  }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={formData.urgency === option.value}
                    disabled={option.value !== 'normal' && !urgencyPricesAvailable}
                    onClick={() => setFormData((prev) => ({ ...prev, urgency: option.value }))}
                    className={`flex min-h-28 flex-col justify-between rounded-xl bg-white p-3 text-left ring-1 transition sm:p-4 ${
                      formData.urgency === option.value
                        ? 'bg-accent/5 ring-2 ring-accent'
                        : 'ring-gray-200 hover:ring-accent'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-gray-900">{option.label}</span>
                      <span className="mt-1 block text-[11px] leading-4 text-gray-500 sm:text-xs">{option.detail}</span>
                    </span>
                    <span className="mt-3 block text-sm font-bold text-gray-900">{option.price}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs leading-5 text-gray-600">
                Paid priority boosts are one-time and non-refundable except where required by law. They do not guarantee that a property will be found or secured.
              </p>
            </div>

            <div className="space-y-5 rounded-2xl bg-gray-50 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">Your budget</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Use the sliders to set your minimum and maximum budget in Jamaican dollars.
                  </p>
                </div>
                <span className="text-xs font-medium text-gray-600">
                  {formatJmd(budgetRange.min)} – {formatJmd(budgetRange.max)}
                </span>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Minimum budget: {formData.budgetMin ? formatJmd(formData.budgetMin) : 'Not set'}
                </label>
                <input
                  type="range"
                  min={budgetRange.min}
                  max={budgetRange.max}
                  step={budgetRange.step}
                  value={Math.min(Math.max(Number(formData.budgetMin || budgetRange.min), budgetRange.min), budgetRange.max)}
                  onChange={(e) => handleBudgetSlider('budgetMin', e.target.value)}
                  className="w-full budget-slider"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Maximum budget: {formData.budgetMax ? formatJmd(formData.budgetMax) : 'Not set'}
                </label>
                <input
                  type="range"
                  min={budgetRange.min}
                  max={budgetRange.max}
                  step={budgetRange.step}
                  value={Math.min(Math.max(Number(formData.budgetMax || formData.budgetMin || budgetRange.min), budgetRange.min), budgetRange.max)}
                  onChange={(e) => handleBudgetSlider('budgetMax', e.target.value)}
                  className="w-full budget-slider"
                />
              </div>
            </div>

            <div>
              <label htmlFor="visitor-request-details" className="mb-2 block text-sm font-medium text-gray-700">
                Additional details (optional)
              </label>
              <textarea
                id="visitor-request-details"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder="Any additional requirements, such as monthly income, occupation, or family size."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={prevStep} className="flex-1 rounded-lg border border-gray-300 py-4 font-semibold transition hover:bg-gray-100">
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-accent py-4 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        )}

      </form>
        </>
      )}
    </div>

    <style jsx global>{`
      .budget-slider {
        -webkit-appearance: none;
        appearance: none;
        height: 12px;
        border-radius: 9999px;
        background: #e5e7eb;
        outline: none;
      }

      .budget-slider::-webkit-slider-runnable-track {
        height: 12px;
        border-radius: 9999px;
        background: linear-gradient(90deg, var(--accent-color) 0%, var(--accent-color-hover) 100%);
      }

      .budget-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 24px;
        height: 24px;
        border-radius: 9999px;
        background: var(--accent-color);
        border: 3px solid #ffffff;
        margin-top: -6px;
        cursor: pointer;
      }

      .budget-slider::-moz-range-track {
        height: 12px;
        border: 0;
        border-radius: 9999px;
        background: linear-gradient(90deg, var(--accent-color) 0%, var(--accent-color-hover) 100%);
      }

      .budget-slider::-moz-range-thumb {
        width: 24px;
        height: 24px;
        border-radius: 9999px;
        background: var(--accent-color);
        border: 3px solid #ffffff;
        cursor: pointer;
      }
    `}</style>
  </div>
);

}
