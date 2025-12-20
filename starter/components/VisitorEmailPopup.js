import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

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

    const hasDismissedRecently = sessionStorage.getItem('visitor-lead-dismissed');
    if (hasDismissedRecently) return;

    const timer = setTimeout(() => {
      setShowPopup(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, [isSignedIn, isAgent]);

  /* -----------------------------
     Submit handler
  ------------------------------*/
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !phone || !intent) return;

    setLoading(true);

    try {
      // Insert directly to Supabase (no API)
      const { data, error } = await supabase
        .from('visitor_emails')
        .insert({
          email,
          phone,
          intent,
          page: router.pathname,
          source: 'popup',
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          referrer: typeof document !== 'undefined' ? document.referrer : null,
        });

      if (error) {
        console.error('Insert error:', error);
        // Still mark as submitted to not annoy user
        localStorage.setItem('visitor-lead-submitted', 'true');
        setSubmitted(true);
        setShowPopup(false);
        return;
      }

      localStorage.setItem('visitor-lead-submitted', 'true');
      setSubmitted(true);
      setShowPopup(false);
    } catch (err) {
      console.error('Lead submit error:', err);
      // Still close popup to not annoy user
      localStorage.setItem('visitor-lead-submitted', 'true');
      setSubmitted(true);
      setShowPopup(false);
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------
     Dismiss handler (soft)
  ------------------------------*/
  const handleDismiss = () => {
    sessionStorage.setItem('visitor-lead-dismissed', 'true');
    setShowPopup(false);
  };

  if (!showPopup || submitted) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6 text-white">
          <h2 className="text-2xl font-bold">Get Property Alerts</h2>
          <p className="text-orange-100 text-sm mt-1">
            Verified listings sent directly to you
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Intent Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I'm interested in:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setIntent('buy')}
                className={`px-4 py-3 rounded-lg border-2 font-medium transition ${
                  intent === 'buy'
                    ? 'border-orange-600 bg-orange-50 text-orange-700'
                    : 'border-gray-300 text-gray-700 hover:border-orange-400'
                }`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setIntent('sell')}
                className={`px-4 py-3 rounded-lg border-2 font-medium transition ${
                  intent === 'sell'
                    ? 'border-orange-600 bg-orange-50 text-orange-700'
                    : 'border-gray-300 text-gray-700 hover:border-orange-400'
                }`}
              >
                Sell
              </button>
              <button
                type="button"
                onClick={() => setIntent('rent')}
                className={`px-4 py-3 rounded-lg border-2 font-medium transition ${
                  intent === 'rent'
                    ? 'border-orange-600 bg-orange-50 text-orange-700'
                    : 'border-gray-300 text-gray-700 hover:border-orange-400'
                }`}
              >
                Rent
              </button>
            </div>
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />

          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />

          {/* Data Sharing Disclaimer */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-700">
            <p className="font-medium text-blue-900 mb-1">📋 Data Sharing Notice</p>
            <p>
              By submitting, you agree to share your contact information with verified agents 
              who can help with your property needs. We respect your privacy and never spam.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !intent}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : intent ? `Connect with ${intent.charAt(0).toUpperCase() + intent.slice(1)} Agents` : 'Select an option above'}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full text-sm text-gray-500 hover:underline"
          >
            Maybe later
          </button>
        </form>
      </div>
    </div>
  );
}
