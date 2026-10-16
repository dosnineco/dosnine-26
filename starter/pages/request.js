import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SignUpButton, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';

const BUDGET_RANGES = {
  rent: { min: 50000, max: 4000000, step: 10000 },
  buy: { min: 7000000, max: 200000000, step: 1000000 },
  sell: { min: 500000, max: 300000000, step: 100000 },
  lease: { min: 50000, max: 10000000, step: 10000 },
  valuation: { min: 500000, max: 300000000, step: 100000 },
  default: { min: 500000, max: 100000000, step: 10000 }
};

const formatJmd = (value) => `J$${Number(value || 0).toLocaleString()}`;
const formatBudgetInput = (value) => String(value || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const parseOptionalInteger = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

export default function RequestAgentPage() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    requestType: '', // buy, sell, rent, lease, valuation
    propertyType: 'house', // lowercase to match database constraint
    location: '',
    budgetMin: '',
    budgetMax: '',
    bedrooms: '',
    bathrooms: '',
    description: '',
    urgency: 'normal'
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState(null);

  const getBudgetRange = (requestType) => BUDGET_RANGES[requestType] || BUDGET_RANGES.default;
  const budgetRange = getBudgetRange(formData.requestType);

  /* -----------------------------
     Auto-fill email, phone, and name from user data
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

  useEffect(() => {
    if (!router.isReady) return;

    const queryValue = (value) => Array.isArray(value) ? value[0] : value;
    const location = queryValue(router.query.location) || '';
    const parish = queryValue(router.query.parish) || '';
    const bedrooms = queryValue(router.query.bedrooms) || '';
    const budgetMin = queryValue(router.query.budgetMin) || '';
    const budgetMax = queryValue(router.query.budgetMax) || '';
    const requestType = queryValue(router.query.requestType) || '';

    if (!location && !parish && !bedrooms && !budgetMin && !budgetMax && !requestType) return;

    setFormData(prev => ({
      ...prev,
      requestType: ['buy', 'rent', 'sell', 'lease', 'valuation'].includes(requestType)
        ? requestType
        : prev.requestType,
      location: prev.location || [location, parish].filter(Boolean).join(', '),
      bedrooms: prev.bedrooms || bedrooms,
      budgetMin: prev.budgetMin || budgetMin,
      budgetMax: prev.budgetMax || budgetMax,
    }));
  }, [router.isReady, router.query]);

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
     Submit handler
  ------------------------------*/
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.requestType || !formData.propertyType || !formData.location) {
      toast.error('Please fill in all required fields');
      return;
    }

    const selectedRange = getBudgetRange(formData.requestType);
    const budgetMin = parseInt(formData.budgetMin, 10);
    const budgetMax = parseInt(formData.budgetMax, 10);

    if (!budgetMin) {
      toast.error('Please set a minimum budget before submitting.');
      return;
    }

    if (budgetMin < selectedRange.min || budgetMin > selectedRange.max) {
      toast.error(`Minimum ${formData.requestType || 'request'} budget must be between ${formatJmd(selectedRange.min)} and ${formatJmd(selectedRange.max)}.`);
      return;
    }

    if (!budgetMax) {
      toast.error('Please set a maximum budget before submitting.');
      return;
    }

    if (budgetMax < budgetMin) {
      toast.error('Budget max must be greater than or equal to budget min.');
      return;
    }

    if (budgetMax > selectedRange.max) {
      toast.error(`Maximum budget cannot exceed ${formatJmd(selectedRange.max)}.`);
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
          location: formData.location,
          budgetMin: Number(String(formData.budgetMin).replace(/,/g, '')),
          budgetMax: Number(String(formData.budgetMax).replace(/,/g, '')),
          bedrooms: parseOptionalInteger(formData.bedrooms),
          bathrooms: parseOptionalInteger(formData.bathrooms),
          description: formData.description || null,
          urgency: formData.urgency || 'normal'
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        toast.error([payload?.error, payload?.details].filter(Boolean).join(': ') || 'Failed to submit request');
        return;
      }
      // Mark as submitted to prevent popup on other pages
      if (typeof window !== 'undefined') {
        localStorage.setItem('visitor-lead-submitted', 'true');
      }
      toast.success('Request submitted successfully!', {
        duration: 5000,
      });
      const requestId = payload.request?.id || null;
      setSubmittedRequestId(requestId);
      if (requestId && formData.requestType === 'buy') {
        sessionStorage.setItem(
          `dosnine:buyer-prequalification:${requestId}`,
          JSON.stringify({
            serviceRequestId: requestId,
            buyerName: formData.name,
            buyerEmail: formData.email,
            buyerPhone: formData.phone,
            targetPropertyPrice: formData.budgetMax || formData.budgetMin,
          })
        );
      }
      setSubmitted(true);
    } catch (err) {
      console.error('Lead submit error:', err);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'budgetMin' || name === 'budgetMax') {
      const rawDigits = String(value).replace(/[^0-9]/g, '');
      setFormData(prev => ({ ...prev, [name]: rawDigits }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const nextStep = () => {
    // Validate current step
    if (step === 1 && (!formData.name || !formData.email || !formData.phone || !formData.requestType)) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (step === 2 && (!formData.propertyType || !formData.location)) {
      toast.error('Please fill in property type and location');
      return;
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  const skipToSubmit = () => {
    handleSubmit({ preventDefault: () => {} });
  };

  if (submitted) {
    return (
      <>
        <Head>
          <title>Request Submitted - DoSnine</title>
        </Head>
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-9">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
            <p className="text-center text-gray-600 mb-3">
              A verified agent will contact you soon to help with your {formData.requestType} needs.
            </p>
            <p className="text-center text-gray-600 mb-6">
              <Link className="font-semibold text-accent underline" href="/dashboard">
                Create a free account to track your request and access your dashboard.
              </Link>
            </p>
            {formData.requestType === 'buy' && (
              <section className="space-y-5 rounded-2xl bg-gray-50 p-5 text-left sm:p-6">
                    <div>
                  <p className="text-sm font-semibold text-gray-800">Documents you can provide</p>
                  <ol className="mt-2 grid gap-1.5 text-sm text-gray-600 sm:grid-cols-2">
                    <li>Mortgage prequalification or approval</li>
                    <li>Proof of savings or funds</li>
                    <li>NHT eligibility or financing documents</li>
                    <li>Income or bank confirmation</li>
                  </ol>
                  <p className="mt-3 text-xs leading-5 text-gray-500">
                    Upload only documents relevant to your situation. They help us understand your readiness,
                    but do not guarantee a home, financing, or selection by a seller.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Strengthen your buyer profile</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Create an account to keep track of your request, then share your financial readiness
                    and supporting documents with Dosnine and your assigned agent.
                  </p>
                </div>
                {!isSignedIn && (
                  <SignUpButton mode="modal" afterSignUpUrl="/dashboard">
                    <button type="button" className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-accent ring-1 ring-gray-200 hover:bg-gray-100">
                      Create a free account
                    </button>
                  </SignUpButton>
                )}
                <button
                  onClick={() => router.push({
                    pathname: '/buyer-prequalification',
                    query: submittedRequestId ? { serviceRequestId: submittedRequestId } : {},
                  })}
                  className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white hover:bg-accent/90"
                >
                  Complete buyer profile &amp; upload documents
                </button>

              </section>
            )}

          </div>
        </div>
      </>
    );
  }

 return (
  <>
    <Head>
      <title>Request an Agent - Dosnine</title>
      <meta
        name="description"
        content="Connect with verified real estate agents in Jamaica"
      />
    </Head>

    <div className="min-h-screen bg-gray-50 flex items-center justify-center sm:p-6">
      <div className="bg-white sm:rounded-2xl w-full max-w-4xl overflow-hidden">

        {/* Header */}
        <div className="bg-accent p-10 text-white">
          <h1 className="text-3xl font-bold mb-2">What are you looking for?</h1>
          <p className="opacity-90 mb-6">
            Get matched with verified real estate professionals
          </p>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3].map((num, index) => (
              <div key={num} className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition
                    ${
                      step >= num
                        ? "bg-white text-accent"
                        : "bg-white/30 text-white"
                    }`}
                >
                  {num}
                </div>
                {index < 2 && (
                  <div
                    className={`h-1 w-16 transition ${
                      step > num ? "bg-white" : "bg-white/40"
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between text-xs opacity-90 mt-3 max-w-md mx-auto">
            <span>Your Info</span>
            <span>Property</span>
            <span>Details</span>
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-10">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="grid md:grid-cols-2 gap-10">

              {/* LEFT */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Let's get started
                </h2>
                <p className="text-gray-600 mb-6">
                  We need a few details to connect you with the right agent.
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  What do you need help with? *
                </label>

                <div className="grid grid-cols-2 gap-4">
                  {["buy", "rent", "sell", "lease", "valuation"].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setFormData(prev => ({
                          ...prev,
                          requestType: type
                        }))
                      }
                      className={`px-5 py-4 rounded-lg border-2 font-semibold transition
                        ${
                          formData.requestType === type
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-gray-300 text-gray-700 hover:border-accent hover:bg-accent/5"
                        }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={nextStep}
                  className="mt-8 w-full bg-accent text-white py-4 rounded-lg font-semibold hover:opacity-90 transition"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6 max-w-2xl mx-auto">

              <h2 className="text-2xl font-bold text-gray-900 text-center">
                Property Details
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type *
                </label>
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                >
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="land">Land</option>
                  <option value="commercial">Commercial</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location/Area *
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 border border-gray-300 py-4 rounded-lg font-semibold hover:bg-gray-100 transition"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 bg-accent text-white py-4 rounded-lg font-semibold hover:opacity-90 transition"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6 max-w-3xl mx-auto">

              <h2 className="text-2xl font-bold text-gray-900 text-center">
                Additional Details
              </h2>

              <div className="rounded-2xl bg-gray-50 p-5 sm:p-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">Your budget</h3>
                    <p className="mt-1 text-sm text-gray-600">Enter your minimum and maximum budget in Jamaican dollars.</p>
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    {formatJmd(budgetRange.min)} – {formatJmd(budgetRange.max)}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ['budgetMin', 'Minimum budget'],
                    ['budgetMax', 'Maximum budget'],
                  ].map(([name, label]) => (
                    <label key={name} htmlFor={name} className="block">
                      <span className="mb-2 block text-sm font-medium text-gray-700">{label} *</span>
                      <span className="flex items-center rounded-xl bg-white ring-1 ring-gray-200 focus-within:ring-2 focus-within:ring-accent">
                        <span className="pl-4 text-sm font-semibold text-gray-500">J$</span>
                        <input
                          id={name}
                          type="text"
                          inputMode="numeric"
                          name={name}
                          value={formatBudgetInput(formData[name])}
                          onChange={handleInputChange}
                          placeholder={name === 'budgetMin' ? '7,000,000' : '20,000,000'}
                          aria-label={`${label} in Jamaican dollars`}
                          className="w-full rounded-xl bg-transparent px-3 py-3 text-base font-semibold text-gray-900 outline-none"
                        />
                      </span>
                      <span className="mt-1.5 block text-xs text-gray-500">
                        {formData[name] ? formatJmd(formData[name]) : 'Required'}
                      </span>
                    </label>
                  ))}
                </div>

              </div>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                placeholder="Any additional requirements..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              />

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 border border-gray-300 py-4 rounded-lg font-semibold hover:bg-gray-100 transition"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-accent text-white py-4 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-gray-500 mt-8">
            Response time: Usually within 24 hours
          </p>

        </form>
      </div>
    </div>

  </>
);

}