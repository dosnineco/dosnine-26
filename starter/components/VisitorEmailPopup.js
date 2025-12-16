import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../lib/supabase';

export default function VisitorEmailPopup() {
  const { isSignedIn, user } = useUser();
  const [showPopup, setShowPopup] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isAgent, setIsAgent] = useState(false);

  useEffect(() => {
    // Check if user is an agent
    const checkAgent = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('agents')
        .select('id')
        .eq('clerk_id', user.id)
        .single();
      if (data) setIsAgent(true);
    };
    if (isSignedIn) {
      checkAgent();
    }
  }, [isSignedIn, user]);

  useEffect(() => {
    // Don't show popup if user is signed in or is an agent
    if (isSignedIn || isAgent) return;
    
    // Check if user has already submitted email this session
    const hasSubmitted = sessionStorage.getItem('visitor-email-submitted');
    if (hasSubmitted) {
      setSubmitted(true);
      return;
    }

    // Show popup after 5 seconds
    const timer = setTimeout(() => {
      setShowPopup(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [isSignedIn, isAgent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !phone.trim()) return;

    setLoading(true);
    try {
      // Save to database via API
      const response = await fetch('/api/visitor-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      });

      if (response.ok) {
        // Also submit to Formspree
        await fetch('https://formspree.io/f/xgeggljb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, phone, _subject: 'New Visitor Email Capture' }),
        }).catch(err => console.error('Formspree error:', err));

        // Mark as submitted in session
        sessionStorage.setItem('visitor-email-submitted', 'true');
        setSubmitted(true);
        setShowPopup(false);
      } else {
        console.error('Failed to save email');
      }
    } catch (error) {
      console.error('Error submitting email:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    // Mark as dismissed (don't show again this session)
    sessionStorage.setItem('visitor-email-submitted', 'true');
    setShowPopup(false);
  };

  if (!showPopup || submitted) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
        {/* Close Button */}

        {/* Header with Santa Image */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6 text-white relative">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Don't Miss Out!</h2>
              <p className="text-orange-100 text-sm mt-1">Get exclusive property listings & deals</p>
            </div>
            <img 
              src="/santa-claus.png" 
              alt="Santa Mascot" 
              className="w-20 h-20 flex-shrink-0"
            />
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (876) 555-0000"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition btn-accent"
          >
            {loading ? 'Saving...' : 'Get Property Alerts'}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full px-4 py-2 rounded-lg transition text-sm btn-accent-outline"
          >
            Maybe Later
          </button>

          <p className="text-xs text-gray-500 text-center">
            We respect your privacy. No spam, ever.
          </p>
        </form>
      </div>
    </div>
  );
}
