import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { Home, MapPin, DollarSign, Bed, Bath, AlertCircle, Send, Shield, CheckCircle } from 'lucide-react';

const REQUEST_TYPES = [
  { value: 'buy', label: 'Buy' },
  { value: 'rent', label: 'Rent' },
  { value: 'sell', label: 'Sell' }
];

const PROPERTY_TYPES = [
  { value: 'house', label: 'House' },
  { value: 'land', label: 'Land' }
];

const JAMAICAN_PARISHES = [
  'Kingston',
  'St. Andrew',
  'St. Catherine',
  'Clarendon',
  'Manchester',
  'St. Elizabeth',
  'Westmoreland',
  'Hanover',
  'St. James',
  'Trelawny',
  'St. Ann',
  'St. Mary',
  'Portland',
  'St. Thomas'
];

export default function RequestAgent() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [budgetSuggestions, setBudgetSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    request_type: 'buy',
    property_type: 'house',
    location: '',
    budget: '',
    description: ''
  });

  // Pre-fill user data if logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        client_name: user.fullName || '',
        client_email: user.primaryEmailAddress?.emailAddress || ''
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBudgetChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, budget: value }));

    // Only show suggestions for 'buy' request type
    if (formData.request_type === 'buy' && value && !isNaN(value)) {
      const baseNum = parseFloat(value);
      const suggestions = [
        baseNum * 10000, 
        baseNum * 100000, 
        baseNum * 1000000,       // Hundreds of thousands
        baseNum * 10000000,      // Tens of millions  
        baseNum * 100000000      // Hundreds of millions
      ].filter(num => num > 0 && num <= 999999999999);
      
      setBudgetSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectBudgetSuggestion = (amount) => {
    setFormData(prev => ({ ...prev, budget: amount.toString() }));
    setShowSuggestions(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-JM', {
      style: 'currency',
      currency: 'JMD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!consent) {
      toast.error('Please agree to share your information with agents');
      return;
    }

    setLoading(true);

    try {
      // Validate required fields
      if (!formData.client_name || !formData.client_email || !formData.client_phone || !formData.location) {
        toast.error('Please fill in all required fields');
        setLoading(false);
        return;
      }

      const requestData = {
        clerkId: user?.id || null,
        clientName: formData.client_name,
        clientEmail: formData.client_email,
        clientPhone: formData.client_phone,
        requestType: formData.request_type,
        propertyType: formData.property_type,
        location: formData.location,
        budgetMin: formData.budget ? parseFloat(formData.budget) : null,
        budgetMax: formData.budget ? parseFloat(formData.budget) : null,
        description: formData.description,
        urgency: 'normal'
      };

      // Submit request
      await axios.post('/api/service-requests/create', requestData);

      // Fire Google Ads conversion event
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'conversion', {
          'send_to': 'AW-CONVERSION_ID/CONVERSION_LABEL', // Replace with your actual conversion ID
          'value': 1.0,
          'currency': 'JMD',
          'transaction_id': ''
        });
      }

      // Fire custom event for other tracking platforms
      if (typeof window !== 'undefined' && window.dataLayer) {
        window.dataLayer.push({
          'event': 'form_submission',
          'form_name': 'request_agent',
          'request_type': formData.request_type
        });
      }

      // Show success state for 2 seconds before redirecting
      toast.success('✅ Request submitted! An agent will contact you soon.', {
        duration: 2000
      });
      
      // Redirect to homepage after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);
      
    } catch (error) {
      console.error('Failed to submit request:', error);
      toast.error(error.response?.data?.error || 'Failed to submit request');
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Get Matched With a Real Estate Agent | Dosnine</title>
        <meta name="description" content="Find your perfect property in Jamaica. Get matched with verified real estate agents who will help you buy, sell, or rent your dream property." />
      </Head>

      <Toaster position="top-center" />

      <div className="min-h-screen bg-gradient-to-br from-accent/5 via-white to-accent/10">
        {/* Hero Section */}
        <div className="bg-accent text-white py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Tell Us What You're Looking For
            </h1>
        
          
          </div>
        </div>

        {/* Benefits Section */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <CheckCircle className="w-12 h-12 text-accent mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">Verified Agents</h3>
              <p className="text-gray-600 text-sm">Work with licensed and experienced professionals</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <CheckCircle className="w-12 h-12 text-accent mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">Quick Response</h3>
              <p className="text-gray-600 text-sm">Get contacted within 24 hours</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <CheckCircle className="w-12 h-12 text-accent mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">100% Free</h3>
              <p className="text-gray-600 text-sm">No fees for connecting with agents</p>
            </div>
          </div> */}

          {/* Form Section */}
          <div className="bg-white rounded-xl shadow-xl p-8">
            

            <form onSubmit={handleSubmit}>
              {/* Contact Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-accent">*</span>
                  </label>
                  <input
                    type="text"
                    name="client_name"
                    value={formData.client_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-accent">*</span>
                  </label>
                  <input
                    type="email"
                    name="client_email"
                    value={formData.client_email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-accent">*</span>
                  </label>
                  <input
                    type="tel"
                    name="client_phone"
                    value={formData.client_phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="+1 (876) 555-0123"
                  />
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What are you looking for?</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  I want to... <span className="text-accent">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {REQUEST_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, request_type: type.value }))}
                      className={`py-3 px-4 rounded-lg font-semibold transition ${
                        formData.request_type === type.value
                          ? 'bg-accent text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Property Type <span className="text-accent">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {PROPERTY_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, property_type: type.value }))}
                      className={`py-3 px-4 rounded-lg font-semibold transition ${
                        formData.property_type === type.value
                          ? 'bg-accent text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline w-4 h-4 mr-1" />
                  Parish <span className="text-accent">*</span>
                </label>
                <select
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="">Select a parish</option>
                  {JAMAICAN_PARISHES.map(parish => (
                    <option key={parish} value={parish}>{parish}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4 relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget (JMD) {formData.request_type === 'buy' && <span className="text-xs text-gray-500">(Type a number to see suggestions)</span>}
                </label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleBudgetChange}
                  onFocus={() => formData.budget && formData.request_type === 'buy' && setBudgetSuggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="e.g., 2 (see suggestions)"
                />
                
                {/* Budget Suggestions Dropdown */}
                {showSuggestions && budgetSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {budgetSuggestions.map((amount, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectBudgetSuggestion(amount)}
                        className="w-full text-left px-4 py-3 hover:bg-accent hover:text-white transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <span className="font-semibold">{formatCurrency(amount)}</span>
                        <span className="text-xs ml-2 opacity-75">({amount.toLocaleString()})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Details
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="Tell us more about what you're looking for..."
                />
              </div>
            </div>

            {/* Consent */}
            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 w-5 h-5 text-accent border-gray-300 rounded focus:ring-accent"
                  required
                />
                <label htmlFor="consent" className="text-sm text-gray-700 flex-1">
                  <Shield className="inline w-4 h-4 text-accent mr-1" />
                  I consent to share my contact information with verified agents on this platform. 
                  My information will only be used to help me find a property and will not be sold to third parties.
                  <span className="text-accent ml-1">*</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !consent}
              className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-4 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Get Matched with an Agent
                </>
              )}
            </button>
          </form>
        </div>

        {/* Trust Section */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>🔒 Your information is secure and will only be shared with licensed agents</p>
        </div>
      </div>
    </div>
    </>
  );
}

// Hide header and footer on this page
RequestAgent.getLayout = function getLayout(page) {
  return page;
};
