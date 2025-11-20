import React, { useState, useEffect } from 'react';
import { useForm, ValidationError } from '@formspree/react';

const ForceEmailSignup = () => {
  const [state, handleSubmit] = useForm("xgeggljb");
  const [showModal, setShowModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const alreadySignedUp = localStorage.getItem('expenseGooseSignedUp');
    if (!alreadySignedUp) {
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 30000); // 30 seconds delay
      return () => clearTimeout(timer);
    }
  }, []);

  const handleFormSubmit = async (e) => {
    await handleSubmit(e);
    if (state.succeeded) {
      localStorage.setItem('expenseGooseSignedUp', 'true');
      setSubmitted(true);
      setTimeout(() => {
        setShowModal(false);
      }, 2000); // Show success message for 2 seconds
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 sm:p-8 border border-gray-300">
        {submitted ? (
          <div className="text-center text-green-600 font-semibold text-lg">
            🎉 You're in! Thanks for signing up.
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="space-y-5">
            <h2 className="text-2xl font-bold text-center text-gray-800">
              Join 37,796+ People Using Expense Goose
            </h2>
            <p className="text-center text-sm text-gray-600">
              346 people joined this month. Start using Expense Goose to track your spending and hit your goals.
            </p>

            <div>
              <input
                type="email"
                name="email"
                required
                placeholder="Enter your email"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none"
              />
              <ValidationError
                prefix="Email"
                field="email"
                errors={state.errors}
                className="text-red-600 text-sm mt-1"
              />
            </div>

            <button
              type="submit"
              disabled={state.submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition duration-300"
            >
              {state.submitting ? "Submitting..." : "Join Free Now"}
            </button>

            <p className="text-xs text-center text-gray-400">
              No spam. Unsubscribe any time.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForceEmailSignup;
