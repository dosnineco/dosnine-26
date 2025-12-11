import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function VisitorEmailPopup() {
  const [showPopup, setShowPopup] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
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
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      // Save to database via API
      const response = await fetch('/api/visitor-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        // Also submit to Formspree
        await fetch('https://formspree.io/f/xgeggljb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, _subject: 'New Visitor Email Capture' }),
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
        {/* <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 p-1"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button> */}

        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
          <h2 className="text-2xl font-bold">Don't Miss Out!</h2>
          <p className="text-green-100 text-sm mt-1">Get exclusive property listings & deals </p>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Saving...' : 'Get Property Alerts'}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
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
