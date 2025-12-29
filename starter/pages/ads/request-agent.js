import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
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
    propertyType: 'apartment',
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
        name: user.fullName || '',
        email: user.emailAddresses?.[0]?.emailAddress || '',
        phone: user.phoneNumbers?.[0]?.phoneNumber || ''
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

    setLoading(true);

    try {
      const requestData = {
        client_user_id: user?.id || null,
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
        <title>Request an Agent - DoSnine</title>
        <meta name="description" content="Connect with verified real estate agents in Jamaica" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">Connect with an Agent</h1>
            <p className="text-orange-100 mb-4">
              Get matched with verified real estate professionals
            </p>
            
            {/* Progress Indicator */}
            <div className="flex items-center justify-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step >= 1 ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'}`}>
                1
              </div>
              <div className={`h-1 w-12 ${step >= 2 ? 'bg-white' : 'bg-orange-500'}`}></div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step >= 2 ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'}`}>
                2
              </div>
              <div className={`h-1 w-12 ${step >= 3 ? 'bg-white' : 'bg-orange-500'}`}></div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step >= 3 ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'}`}>
                3
              </div>
            </div>
            <div className="flex justify-between text-xs text-orange-100 mt-2">
              <span>Your Info</span>
              <span>Property</span>
              <span>Details</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {/* STEP 1: Basic Info & Request Type */}
          {step === 1 && (
            <>
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Let's get started</h2>
                <p className="text-sm text-gray-600">We'll need a few details to connect you with the right agent</p>
              </div>

              {/* Request Type Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What do you need help with? *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['buy', 'rent', 'sell'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, requestType: type }))}
                      className={`px-4 py-4 rounded-lg border-2 font-semibold transition ${
                        formData.requestType === type
                          ? 'border-orange-600 bg-orange-50 text-orange-700 shadow-md'
                          : 'border-gray-300 text-gray-700 hover:border-orange-400 hover:bg-orange-50'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {['lease', 'valuation'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, requestType: type }))}
                      className={`px-4 py-3 rounded-lg border-2 font-semibold transition text-sm ${
                        formData.requestType === type
                          ? 'border-orange-600 bg-orange-50 text-orange-700 shadow-md'
                          : 'border-gray-300 text-gray-700 hover:border-orange-400 hover:bg-orange-50'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                  placeholder="876-XXX-XXXX"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <button
                type="button"
                onClick={nextStep}
                className="w-full btn-primary py-4 text-lg"
              >
                Continue →
              </button>
            </>
          )}

          {/* STEP 2: Property Details */}
          {step === 2 && (
            <>
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Property Details</h2>
                <p className="text-sm text-gray-600">Help us match you with the perfect property</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type *
                </label>
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
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
                  placeholder="e.g., Kingston, Montego Bay, Portmore..."
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 btn-primary py-4 text-lg"
                >
                  Continue →
                </button>
              </div>

              <button
                type="button"
                onClick={skipToSubmit}
                className="w-full text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Skip optional details and submit now
              </button>
            </>
          )}

          {/* STEP 3: Optional Details (Skippable) */}
          {step === 3 && (
            <>
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Additional Details</h2>
                <p className="text-sm text-gray-600">Optional - Help agents find better matches for you</p>
                <p className="text-xs text-orange-600 font-semibold mt-1">You can skip this step if you prefer</p>
              </div>
            
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Budget Min (JMD)
                  </label>
                  <input
                    type="number"
                    name="budgetMin"
                    value={formData.budgetMin}
                    onChange={handleInputChange}
                    placeholder="50,000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Budget Max (JMD)
                  </label>
                  <input
                    type="number"
                    name="budgetMax"
                    value={formData.budgetMax}
                    onChange={handleInputChange}
                    placeholder="150,000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Bedrooms
                  </label>
                  <select
                    name="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Any</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Bathrooms
                  </label>
                  <select
                    name="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Any</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Additional Details/Requirements
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Any specific requirements, preferences, or timeline..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Urgency
                </label>
                <select
                  name="urgency"
                  value={formData.urgency}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="low">Low - Just browsing</option>
                  <option value="normal">Normal - Within a few months</option>
                  <option value="high">High - Within a few weeks</option>
                  <option value="urgent">Urgent - ASAP</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary py-4 text-lg disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Request ✓'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Skip and submit now
              </button>
            </>
          )}

          {/* Data Sharing Disclaimer */}
          {step === 3 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-gray-700">
              <p className="font-semibold text-blue-900 mb-2">📋 Privacy Notice</p>
              <p>
                By submitting this form, you consent to share your contact information with verified agents 
                who will reach out to assist with your property needs. We respect your privacy and never spam.
              </p>
            </div>
          )}

          <p className="text-center text-xs text-gray-500">
            Response time: Usually within 24 hours
          </p>
        </form>
      </div>
    </div>
    </>
  );
}