import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { Home, DollarSign, Key, Bed, MapPin, Search, Loader2, X } from 'lucide-react';

export default function VisitorEmailPopup() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();

  const [showPopup, setShowPopup] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [intent, setIntent] = useState(''); // buy, sell, rent
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  
  // Property preferences
  const [budgetMin, setBudgetMin] = useState(5000000); // 5M JMD default
  const [bedrooms, setBedrooms] = useState('');
  const [parish, setParish] = useState('');
  const [area, setArea] = useState('');

  // Budget ranges based on intent
  const budgetRanges = {
    buy: { min: 500000, max: 150000000, default: 5000000 },
    sell: { min: 500000, max: 150000000, default: 5000000 },
    rent: { min: 10000, max: 1200000, default: 100000 }
  };

  // Update budget when intent changes
  useEffect(() => {
    if (intent && budgetRanges[intent]) {
      setBudgetMin(budgetRanges[intent].default);
    }
  }, [intent]);

  /* -----------------------------
     Check if signed-in user is agent
  ------------------------------*/
  useEffect(() => {
    const checkAgent = async () => {
      if (!user) return;

      // Query through users table since agents table uses user_id, not clerk_id
      const { data, error } = await supabase
        .from('users')
        .select('agent:agents(id, verification_status)')
        .eq('clerk_id', user.id)
        .maybeSingle();

      if (data?.agent && !error) {
        setIsAgent(true);
      }
    };

    if (isSignedIn) {
      checkAgent();
    }
  }, [isSignedIn, user]);

  /* -----------------------------
     Auto-fill email and phone from user data
  ------------------------------*/
  useEffect(() => {
    if (isSignedIn && user) {
      // Auto-fill from Clerk user data
      const userEmail = user.emailAddresses?.[0]?.emailAddress;
      const userPhone = user.phoneNumbers?.[0]?.phoneNumber;
      
      if (userEmail) setEmail(userEmail);
      if (userPhone) setPhone(userPhone);
    }
  }, [isSignedIn, user]);

  /* -----------------------------
     Popup trigger logic
  ------------------------------*/
  useEffect(() => {
    if (isSignedIn || isAgent) return;

    const hasSubmitted = localStorage.getItem('visitor-lead-submitted');
    if (hasSubmitted) {
      setSubmitted(true);
      return;
    }

    // Check if dismissed recently (within 10 minutes)
    const dismissedUntil = sessionStorage.getItem('visitor-lead-dismissed-until');
    if (dismissedUntil) {
      const now = Date.now();
      if (now < parseInt(dismissedUntil)) {
        return; // Still in cooldown period
      } else {
        // Cooldown expired, remove the flag
        sessionStorage.removeItem('visitor-lead-dismissed-until');
      }
    }

    const timer = setTimeout(() => {
      setShowPopup(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isSignedIn, isAgent]);

  /* -----------------------------
     Submit handler - Save to both visitor_emails and service_requests
  ------------------------------*/
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields including phone
    if (!email || !phone || !intent) {
      console.warn('Missing required fields');
      return;
    }

    setLoading(true);

    try {
      // First, create a service_request entry from the visitor email
      const requestData = {
        client_name: 'Website Visitor',
        client_email: email,
        client_phone: phone,
        request_type: intent, // buy, sell, rent
        property_type: 'house',
        location: area || parish || 'TBD',
        status: 'open',
        urgency: 'normal',
        description: `Lead from homepage popup. Bedrooms: ${bedrooms || 'Not specified'}, Parish: ${parish || 'Not specified'}, Area: ${area || 'Not specified'}, Budget: JMD ${budgetMin.toLocaleString()}`
      };

      const { data: requestData_response, error: requestError } = await supabase
        .from('service_requests')
        .insert(requestData)
        .select();

      if (requestError) {
        console.error('Service request insert error:', requestError);
      }

      // Also save to visitor_emails for tracking
      const { data, error } = await supabase
        .from('visitor_emails')
        .insert({
          email,
          phone,
          intent,
          budget_min: budgetMin,
          bedrooms: bedrooms ? parseInt(bedrooms) : null,
          parish,
          area,
          page: router.pathname,
          source: 'popup',
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          referrer: typeof document !== 'undefined' ? document.referrer : null,
        });

      if (error) {
        console.error('Visitor email insert error:', error);
      }

      localStorage.setItem('visitor-lead-submitted', 'true');
      setSubmitted(true);
      setShowPopup(false);
    } catch (err) {
      console.error('Lead submit error:', err);
      localStorage.setItem('visitor-lead-submitted', 'true');
      setSubmitted(true);
      setShowPopup(false);
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------
     Dismiss handler (soft - 10 minute cooldown)
  ------------------------------*/
  const handleDismiss = () => {
    const tenMinutesFromNow = Date.now() + (10 * 60 * 1000); // 10 minutes
    sessionStorage.setItem('visitor-lead-dismissed-until', tenMinutesFromNow.toString());
    setShowPopup(false);
  };

  if (!showPopup || submitted) return null;

  return (
    <div className="fixed inset-0 bg-gray-100  flex items-center justify-center z-50 p-4">
      <div className="bg-white  max-w-md rounded-2xl w-full overflow-hidden relative">

        {/* Close X Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          aria-label="Close popup"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6 text-white">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Search size={28} />
            Get Property Alerts
          </h2>
          <p className="text-orange-100 text-sm mt-1">
            Verified listings sent directly to you
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Intent Buttons */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              I'm interested in:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setIntent('buy')}
                className={`px-4 py-3 rounded-lg border-2 font-semibold transition flex items-center justify-center gap-2 ${
                  intent === 'buy'
                    ? 'border-orange-600 bg-orange-50 text-orange-700'
                    : 'border-gray-300 text-gray-700 hover:border-orange-400'
                }`}
              >
                <Home size={18} />
                Buy
              </button>
              <button
                type="button"
                onClick={() => setIntent('sell')}
                className={`px-4 py-3 rounded-lg border-2 font-semibold transition flex items-center justify-center gap-2 ${
                  intent === 'sell'
                    ? 'border-orange-600 bg-orange-50 text-orange-700'
                    : 'border-gray-300 text-gray-700 hover:border-orange-400'
                }`}
              >
                <DollarSign size={18} />
                Sell
              </button>
              <button
                type="button"
                onClick={() => setIntent('rent')}
                className={`px-4 py-3 rounded-lg border-2 font-semibold transition flex items-center justify-center gap-2 ${
                  intent === 'rent'
                    ? 'border-orange-600 bg-orange-50 text-orange-700'
                    : 'border-gray-300 text-gray-700 hover:border-orange-400'
                }`}
              >
                <Key size={18} />
                Rent
              </button>
            </div>
          </div>

          {/* Budget Slider */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <DollarSign size={18} className="text-orange-600" />
              Budget: <span className="text-orange-600 font-bold">{intent ? budgetRanges[intent] ? budgetMin.toLocaleString('en-US', { style: 'currency', currency: 'JMD' }).replace('JMD', 'JMD') : 'Select intent' : 'Select intent'}</span>
            </label>
            {intent && budgetRanges[intent] ? (
              <>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                    JMD {budgetRanges[intent].min.toLocaleString()}
                  </span>
                  <input
                    type="range"
                    min={budgetRanges[intent].min}
                    max={budgetRanges[intent].max}
                    step={intent === 'rent' ? 5000 : 50000}
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                  <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                    JMD {budgetRanges[intent].max.toLocaleString()}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {intent === 'rent' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setBudgetMin(50000)}
                        className="text-xs px-3 py-1 bg-gray-100 hover:bg-orange-100 rounded transition font-medium"
                      >
                        50K
                      </button>
                      <button
                        type="button"
                        onClick={() => setBudgetMin(300000)}
                        className="text-xs px-3 py-1 bg-gray-100 hover:bg-orange-100 rounded transition font-medium"
                      >
                        300K
                      </button>
                      <button
                        type="button"
                        onClick={() => setBudgetMin(800000)}
                        className="text-xs px-3 py-1 bg-gray-100 hover:bg-orange-100 rounded transition font-medium"
                      >
                        800K
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setBudgetMin(5000000)}
                        className="text-xs px-3 py-1 bg-gray-100 hover:bg-orange-100 rounded transition font-medium"
                      >
                        5M
                      </button>
                      <button
                        type="button"
                        onClick={() => setBudgetMin(30000000)}
                        className="text-xs px-3 py-1 bg-gray-100 hover:bg-orange-100 rounded transition font-medium"
                      >
                        30M
                      </button>
                      <button
                        type="button"
                        onClick={() => setBudgetMin(100000000)}
                        className="text-xs px-3 py-1 bg-gray-100 hover:bg-orange-100 rounded transition font-medium"
                      >
                        100M
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 italic">Select Buy, Sell, or Rent above</p>
            )}
          </div>

          {/* Property Details Section */}
          <div className="border-t pt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <MapPin size={18} className="text-orange-600" />
              Property Preferences
            </h3>
            
            {/* Bedrooms */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Bed size={16} />
                Bedrooms
              </label>
              <select
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option value="">Any</option>
                <option value="1">1 Bedroom</option>
                <option value="2">2 Bedrooms</option>
                <option value="3">3 Bedrooms</option>
                <option value="4">4 Bedrooms</option>
                <option value="5">5+ Bedrooms</option>
              </select>
            </div>

            {/* Parish */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MapPin size={16} />
                Parish
              </label>
              <select
                value={parish}
                onChange={(e) => setParish(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option value="">Select Parish</option>
                <option value="Kingston">Kingston</option>
                <option value="St. Andrew">St. Andrew</option>
                <option value="St. Thomas">St. Thomas</option>
                <option value="Portland">Portland</option>
                <option value="St. Mary">St. Mary</option>
                <option value="St. Ann">St. Ann</option>
                <option value="Trelawny">Trelawny</option>
                <option value="St. James">St. James</option>
                <option value="Hanover">Hanover</option>
                <option value="Westmoreland">Westmoreland</option>
                <option value="Manchester">Manchester</option>
                <option value="Clarendon">Clarendon</option>
                <option value="St. Catherine">St. Catherine</option>
              </select>
            </div>

            {/* Area */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MapPin size={16} />
                Area in {parish || 'Parish'}
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g., New Kingston, Half Way Tree, Constant Spring"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="border-t pt-5 space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Data Sharing Disclaimer */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-700">
            <p className="font-medium text-blue-900 mb-1">📋 Data Sharing & Capture Notice</p>
            <p>
              By submitting, you agree to share your contact information with verified agents 
              who can help with your property needs.
            </p> 
          </div>

          <button
            type="submit"
            disabled={loading || !intent}
            className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-bold rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Saving...
              </>
            ) : intent ? (
              `Connect with ${intent.charAt(0).toUpperCase() + intent.slice(1)} Agent`
            ) : (
              'Select an option above'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
