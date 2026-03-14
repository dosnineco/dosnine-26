import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';

const BUDGET_RANGES = {
  rent: { min: 70000, max: 4000000, step: 10000 },
  buy: { min: 7000000, max: 200000000, step: 100000 },
  sell: { min: 500000, max: 300000000, step: 100000 },
  lease: { min: 70000, max: 10000000, step: 10000 },
  valuation: { min: 500000, max: 300000000, step: 100000 },
  default: { min: 70000, max: 100000000, step: 10000 }
};

const formatJmd = (value) => `J$${Number(value || 0).toLocaleString()}`;
const formatBudgetInput = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const numeric = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric.toLocaleString() : '';
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

    if (budgetMin < selectedRange.min) {
      toast.error(`Minimum ${formData.requestType || 'request'} budget is ${formatJmd(selectedRange.min)}.`);
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
        toast.error(payload?.error || 'Failed to submit request');
        return;
      }

      // Mark as submitted to prevent popup on other pages
      if (typeof window !== 'undefined') {
        localStorage.setItem('visitor-lead-submitted', 'true');
      }
      toast.success('Request submitted successfully! A submission email was sent with your details.', {
        duration: 5000,
      });
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

      if (name === 'budgetMin' && numericValue < range.min) {
        toast.error('No properties are available below that amount.');
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

    if (name === 'budgetMin' && numericValue < range.min) {
      toast.error('No properties are available below that amount.');
      return;
    }

    setFormData((prev) => {
      const next = { ...prev, [name]: String(numericValue) };

      if (name === 'budgetMin' && Number(next.budgetMax || 0) < numericValue) {
        next.budgetMax = String(numericValue);
      }

      if (name === 'budgetMax' && Number(next.budgetMin || 0) > numericValue) {
        toast.error('Budget max cannot be smaller than minimum budget.');
        numericValue = Number(next.budgetMin || 0);
        next.budgetMax = String(numericValue);
      }

      return next;
    });
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
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
            <p className="text-gray-600 mb-6">
              A verified agent will contact you soon to help with your {formData.requestType} needs.
            </p>
            <p className="text-gray-600 mb-6">
              A submission email was sent to your inbox with your request details and next steps.
            </p>
            <button
              onClick={() => router.push('/')}
              className="btn-primary"
            >
              Return to Home
            </button>
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
          <h1 className="text-3xl font-bold mb-2">Connect with an Agent</h1>
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

              <div className="grid md:grid-cols-2 gap-6">
                <input
                  type="text"
                  inputMode="numeric"
                  name="budgetMin"
                  value={formatBudgetInput(formData.budgetMin)}
                  onChange={handleInputChange}
                  placeholder="Budget Min (JMD)"
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />

                <input
                  type="text"
                  inputMode="numeric"
                  name="budgetMax"
                  value={formatBudgetInput(formData.budgetMax)}
                  onChange={handleInputChange}
                  placeholder="Budget Max (JMD)"
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-5 space-y-5">
                <div className="flex flex-wrap justify-between gap-2 text-sm text-gray-700">
                  <span>Use sliders to set budget quickly</span>
                  <span className="font-medium">
                    Range: {formatJmd(budgetRange.min)} - {formatJmd(budgetRange.max)}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Budget: {formData.budgetMin ? formatJmd(formData.budgetMin) : 'Not set'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Budget: {formData.budgetMax ? formatJmd(formData.budgetMax) : 'Not set'}
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
  </>
);

}