import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Head from 'next/head';
import toast from 'react-hot-toast';

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

  /* -----------------------------
     Submit handler
  ------------------------------*/
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.requestType || !formData.propertyType || !formData.location) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Prevent low-quality rental leads below JMD 70,000
    if (formData.requestType === 'rent' && formData.budgetMin && parseInt(formData.budgetMin) < 70000) {
      toast.error('⚠️ Minimum rental budget is JMD 70,000\n\nTo maintain quality service, we focus on rentals above this threshold.');
      return;
    }

    // Prevent low-quality buy leads below JMD 4,000,000
    if (formData.requestType === 'buy' && formData.budgetMin && parseInt(formData.budgetMin) < 4000000) {
      toast.error('⚠️ Minimum buy budget is JMD 4,000,000\n\nTo maintain quality service, we focus on properties above this threshold.');
      return;
    }

    setLoading(true);

    try {
      const requestData = {
        client_user_id: null, // Don't use Clerk ID - it's not a valid UUID
        client_name: formData.name,
        client_email: formData.email,
        client_phone: formData.phone,
        request_type: formData.requestType,
        property_type: formData.propertyType,
        location: formData.location,
        budget_min: formData.budgetMin ? parseFloat(formData.budgetMin) : null,
        budget_max: formData.budgetMax ? parseFloat(formData.budgetMax) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        description: formData.description || null,
        urgency: formData.urgency || 'normal',
        status: 'open'
      };

      const { data, error } = await supabase
        .from('service_requests')
        .insert(requestData)
        .select();

      if (error) {
        console.error('Insert error:', error);
        toast.error(`Failed to submit: ${error.message}`);
        return;
      }

      // Mark as submitted to prevent popup on other pages
      if (typeof window !== 'undefined') {
        localStorage.setItem('visitor-lead-submitted', 'true');
      }
      toast.success('Request submitted successfully! An agent will contact you soon.');
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
                  type="number"
                  name="budgetMin"
                  value={formData.budgetMin}
                  onChange={handleInputChange}
                  placeholder="Budget Min (JMD)"
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />

                <input
                  type="number"
                  name="budgetMax"
                  value={formData.budgetMax}
                  onChange={handleInputChange}
                  placeholder="Budget Max (JMD)"
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
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