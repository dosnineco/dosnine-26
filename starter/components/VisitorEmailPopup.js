import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

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

export default function RequestAgentPopup() {
  const { isSignedIn, user } = useUser();

  const [showPopup, setShowPopup] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

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

    if (name === 'budgetMin' && numericValue < range.min) {
      numericValue = range.min;
    }

    setFormData((prev) => {
      const next = { ...prev, [name]: String(numericValue) };

      if (name === 'budgetMin' && Number(next.budgetMax || 0) < numericValue) {
        next.budgetMax = String(numericValue);
      }

      if (name === 'budgetMax' && Number(next.budgetMin || 0) > numericValue) {
        numericValue = Number(next.budgetMin || range.min);
        next.budgetMax = String(numericValue);
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

    if (step === 2 && (!formData.propertyType || !formData.location)) {
      toast.error('Please fill property type and location');
      return;
    }

    setStep(prev => prev + 1);
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

    if (step === 2 && (!formData.propertyType || !formData.parish || !formData.location)) {
      toast.error('Please fill property type, parish and location');
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

      localStorage.setItem('visitor-lead-submitted', 'true');
      toast.success('Request submitted successfully!');
      setSubmitted(true);
      setShowPopup(false);

    } catch (err) {
      toast.error('Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (!showPopup || submitted) return null;

return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">

    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl relative overflow-y-auto max-h-[90vh]">

      {/* CLOSE BUTTON */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
      >
        <X size={18} />
      </button>

      {/* HEADER */}
      <div className="bg-accent text-white p-8">
        <h2 className="text-2xl font-bold">Connect with an Agent</h2>
        <p className="opacity-90">Get matched with verified professionals</p>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="p-8 space-y-6">

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <div>
              <label className="block font-bold mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                placeholder='eg. John Brown'
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block font-bold mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                placeholder='eg. example@gmail.com'
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block font-bold mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                placeholder='eg. 8761234567'
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block font-bold mb-3">
                What do you need help with? <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                {["buy","rent","sell","lease","valuation"].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, requestType: type }))}
                    className={`p-3 border rounded-lg font-semibold ${
                      formData.requestType === type ? "bg-accent text-white" : ""
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" onClick={nextStep} className="btn-primary w-full">
              Continue
            </button>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <div>
              <label className="block font-bold mb-1">
                Property Type <span className="text-red-500">*</span>
              </label>
              <select
                name="propertyType"
                value={formData.propertyType}
                onChange={handleInputChange}
                className="input"
              >
                <option value="house">House</option>
                <option value="apartment">Apartment</option>
                <option value="land">Land</option>
                <option value="commercial">Commercial</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
  <label className="block font-bold mb-1">
    Parish <span className="text-red-500">*</span>
  </label>

  <select
    name="parish"
    value={formData.parish}
    onChange={handleInputChange}
    className="input"
    required
  >
    <option value="">Select Parish</option>
    {[
      "Kingston",
      "St. Andrew",
      "St. Thomas",
      "Portland",
      "St. Mary",
      "St. Ann",
      "Trelawny",
      "St. James",
      "Hanover",
      "Westmoreland",
      "St. Elizabeth",
      "Manchester",
      "Clarendon",
      "St. Catherine"
    ].map(parish => (
      <option key={parish} value={parish}>
        {parish}
      </option>
    ))}
  </select>
</div>


            <div>
              <label className="block font-bold mb-1">
                Location / Area <span className="text-red-500">*</span>
              </label>
              <input
                placeholder='eg. Patrick City'
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="input"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">
                  Bedrooms
                </label>
                <input
                  type="number"
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleInputChange}
                  placeholder="Bedrooms"
                  className="input"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Bathrooms
                </label>
                <input
                  type="number"
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleInputChange}
                  placeholder="Bathrooms"
                  className="input"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={prevStep} className="flex-1 border py-3 rounded-lg">
                Back
              </button>
              <button type="button" onClick={nextStep} className="flex-1 bg-accent text-white py-3 rounded-lg">
                Continue
              </button>
            </div>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            <label className="block font-bold mb-1">
              Urgency Level
            </label>
            <select
              name="urgency"
              value={formData.urgency}
              onChange={handleInputChange}
              className="input"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <input
              placeholder='Minimum Budget (JMD)'
              type="text"
              inputMode="numeric"
              name="budgetMin"
              value={formatBudgetInput(formData.budgetMin)}
              onChange={handleInputChange}
              className="input"
            />

            <input
              placeholder='Maximum Budget (JMD)'
              type="text"
              inputMode="numeric"
              name="budgetMax"
              value={formatBudgetInput(formData.budgetMax)}
              onChange={handleInputChange}
              className="input"
            />

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
              placeholder="Additional details eg. Monthly income, Occupation"
              className="input"
            />

            <div className="flex gap-4">
              <button type="button" onClick={prevStep} className="flex-1 border py-3 rounded-lg">
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-accent text-white py-3 rounded-lg"
              >
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </>
        )}

      </form>
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
