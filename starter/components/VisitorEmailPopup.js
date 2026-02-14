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

    const parishes = [
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
      "Manchester",
      "Clarendon",
      "St. Catherine",
      "St. Elizabeth",
    ];


  // Budget ranges based on intent
  const budgetRanges = {
    buy: { min: 4000000, max: 150000000, default: 5000000 },
    sell: { min: 500000, max: 150000000, default: 5000000 },
    rent: { min: 70000, max: 1200000, default: 100000 }
  };

  // Update budget when intent changes
  useEffect(() => {
    if (intent && budgetRanges[intent]) {
      setBudgetMin(budgetRanges[intent].default);
    }
  }, [intent]);

  useEffect(() => {
  if (showPopup) {
    document.body.style.overflow = "hidden";
    document.body.style.height = "100vh";
  } else {
    document.body.style.overflow = "";
    document.body.style.height = "";
  }

  return () => {
    document.body.style.overflow = "";
    document.body.style.height = "";
  };
}, [showPopup]);


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
      return;
    }

    // Prevent low-quality rental leads below JMD 70,000
    if (intent === 'rent' && budgetMin < 70000) {
      alert('⚠️ Minimum rental budget is JMD 70,000\n\nTo maintain quality service, we focus on rentals above this threshold. This helps us connect you with verified properties that meet professional standards.');
      return;
    }

    // Prevent low-quality buy leads below JMD 4,000,000
    if (intent === 'buy' && budgetMin < 4000000) {
      alert('⚠️ Minimum buy budget is JMD 4,000,000\n\nTo maintain quality service, we focus on properties above this threshold. This helps us connect you with verified properties that meet professional standards.');
      return;
    }

    setLoading(true);

    try {
      // First, create a service_request entry from the visitor email
      const requestData = {
        client_name: 'Website Submitted',
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
        // Service request insert error logged silently
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
        // Visitor email insert error logged silently
      }

      localStorage.setItem('visitor-lead-submitted', 'true');
      setSubmitted(true);
      setShowPopup(false);
    } catch (err) {
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
<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">

  <div
    className="
      w-full h-full sm:h-auto sm:max-h-[90vh]
      sm:max-w-lg
      bg-white
      sm:rounded-2xl rounded-none
      shadow-none sm:shadow-2xl
      overflow-hidden
      animate-in fade-in zoom-in-95 duration-200
    "
  >
      {/* Header */}
      <div className="relative px-6 pt-6 pb-4 border-b bg-accent">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-bold text-white">
          Find Your Perfect Property
        </h2>
        <p className="text-sm text-white mt-1">
          Tell us what you're looking for and a verified agent will contact you.
        </p>
      </div>

      {/* Scrollable Form Area */}
      <form
        onSubmit={handleSubmit}
        className="px-6 py-6 space-y-6 max-h-[75vh] overflow-y-auto"
      >

        {/* Intent */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-3">
            What do you want to do?
          </label>

          <div className="grid grid-cols-3 gap-2">
            {["buy", "sell", "rent"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setIntent(type)}
                className={`py-3 rounded-xl border text-sm font-semibold transition-all
                  ${
                    intent === type
                      ? "bg-accent text-white border-accent shadow-md"
                      : "bg-white border-gray-300 hover:border-accent"
                  }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-gray-800">
              Budget
            </label>
            <span className="text-sm font-bold text-accent">
              {intent
                ? `JMD ${budgetMin.toLocaleString()}`
                : ""}
            </span>
          </div>

          {intent ? (
            <>
              <input
                type="range"
                min={budgetRanges[intent].min}
                max={budgetRanges[intent].max}
                step={intent === "rent" ? 5000 : 50000}
                value={budgetMin}
                onChange={(e) =>
                  setBudgetMin(parseInt(e.target.value))
                }
                className="w-full accent-accent"
              />

              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>
                  {budgetRanges[intent].min.toLocaleString()}
                </span>
                <span>
                  {budgetRanges[intent].max.toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">
              Select one above first 
            </p>
          )}
        </div>

        {/* Property Preferences */}
        <div className="space-y-4 border-t pt-6">
          {/* <h3 className="text-sm font-semibold text-gray-800">
            Property Preferences
          </h3> */}

          <select
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
          >
            <option value="">Bedrooms (Any)</option>
            <option value="1">1 Bedroom</option>
            <option value="2">2 Bedrooms</option>
            <option value="3">3 Bedrooms</option>
            <option value="4">4 Bedrooms</option>
            <option value="5">5+ Bedrooms</option>
          </select>

            <select
              value={parish}
              onChange={(e) => setParish(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
            >
              <option value="">Select Parish</option>
              {parishes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>


          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Specific Area - eg. Patrick city"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
          />
        </div>

        {/* Contact */}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="eg. johnbrown@gmail.com"
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
          />

          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="eg. 8761234567"
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
          />

        {/* Privacy */}
        <p className="text-xs text-gray-500 leading-relaxed">
          By submitting, you agree to our{" "}
          <a
            href="/privacy-policy"
            className="text-accent font-medium hover:underline"
          >
            Privacy Policy
          </a>.
        </p>

        {/* Submit */}
        <button
          type="submit"
          disabled={
            loading ||
            !intent ||
            (intent === "rent" && budgetMin < 70000) ||
            (intent === "buy" && budgetMin < 4000000)
          }
          className="w-full py-3 rounded-xl bg-accent hover:bg-orange-700 text-white font-semibold transition-all shadow-md disabled:opacity-50"
        >
          {loading
            ? "Saving..."
            : intent
            ? `Connect with ${intent} agent`
            : "Select option above"}
        </button>

      </form>
    </div>
  </div>
);

}
