import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import toast from 'react-hot-toast';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useRoleProtection } from '../../lib/useRoleProtection';
import { isVerifiedAgent, needsAgentPayment } from '../../lib/rbac';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test";
const UNLOCK_FEE = 0.01; // $50 one-time fee

export default function AgentPayment() {
  // Protect route - only verified agents who need payment
  const { loading: authLoading, userData } = useRoleProtection({
    checkAccess: (data) => isVerifiedAgent(data) && needsAgentPayment(data),
    redirectTo: '/agent/dashboard',
    message: 'Invalid access'
  });

  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    console.log('PayPal Config:', {
      clientId: PAYPAL_CLIENT_ID ? 'Set' : 'Missing',
      fee: UNLOCK_FEE,
      user: user?.id
    });
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const createOrder = (data, actions) => {
    return actions.order.create({
      purchase_units: [{
        description: 'Agent Request Access - One-time unlock fee',
        amount: {
          value: UNLOCK_FEE.toFixed(2),
          currency_code: 'USD'
        },
        shipping: {
          address: {
            address_line_1: 'Kingston',
            admin_area_2: 'Kingston',
            admin_area_1: 'Kingston',
            postal_code: '00000',
            country_code: 'JM'
          }
        }
      }],
      application_context: {
        shipping_preference: 'NO_SHIPPING'
      }
    });
  };

  const onApprove = async (data, actions) => {
    setProcessing(true);
    try {
      const order = await actions.order.capture();
      
      // Process payment in backend
      await axios.post('/api/agent/process-payment', {
        clerkId: user.id,
        transactionId: order.id,
        amount: UNLOCK_FEE
      });

      toast.success('Payment successful! Access unlocked 🎉');
      router.push('/agent/dashboard');
    } catch (error) {
      console.error('Payment processing failed:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const onError = (err) => {
    console.error('PayPal Error:', err);
    toast.error('Payment failed. Please try again.');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Unlock Agent Access — Rentals Jamaica</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Congratulations Banner */}
          <div className="bg-green-50 border-l-4 border-green-400 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-1">🎉 Congratulations! You're Verified</h3>
                <p className="text-green-800">
                  Your agent application has been approved. Complete this one-time payment to unlock full access to client requests and unlimited property postings.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-accent text-white px-8 py-6">
              <h1 className="text-3xl font-bold">Unlock Agent Features</h1>
              <p className="mt-2 text-white/90">One-time payment to access client requests</p>
            </div>

            {/* Content */}
            <div className="px-8 py-6">
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">What You'll Get:</h2>
                <ul className="space-y-3">
                  {[
                    'Access to all client requests (buy, rent, sell, lease)',
                    'Direct client contact information',
                    'Unlimited property postings',
                    'Priority listing placement',
                    'Real-time request notifications',
                    'Client dashboard and messaging'
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <svg className="w-6 h-6 text-accent mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pricing */}
              <div className="bg-gray-50 rounded-lg p-6 mb-8 border-2 border-accent/20">
                <div className="text-center">
                  <p className="text-gray-600 text-sm uppercase tracking-wide">One-Time Payment</p>
                  <p className="text-5xl font-bold text-accent mt-2">${UNLOCK_FEE}</p>
                  <p className="text-gray-500 mt-2">Lifetime access • No recurring fees</p>
                  <p className="text-xs text-gray-400 mt-3">🔒 Secure card payment powered by PayPal</p>
                  <p className="text-xs text-gray-400">Pay directly with your debit or credit card</p>
                  <p className="text-xs text-gray-400">No PayPal account required • Jamaica-friendly checkout</p>
                </div>
              </div>

              {/* PayPal Buttons */}
              {!processing ? (
                <div>
                  {!PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID === "test" ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                      <p className="text-red-800 font-semibold mb-2">⚠️ PayPal Not Configured</p>
                      <p className="text-red-600 text-sm">Payment system is not properly configured. Please contact support.</p>
                      <p className="text-xs text-gray-500 mt-2">Client ID: {PAYPAL_CLIENT_ID}</p>
                    </div>
                  ) : (
                    <PayPalScriptProvider 
                      options={{ 
                        clientId: PAYPAL_CLIENT_ID,
                        currency: "USD",
                        intent: "capture",
                        components: "buttons"
                      }}
                    >
                      <div className="min-h-[50px]">
                        {!sdkReady && (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                            <p className="text-sm text-gray-500 mt-2">Loading payment options...</p>
                          </div>
                        )}
                        <PayPalButtons
                          createOrder={createOrder}
                          onApprove={onApprove}
                          onError={onError}
                          onInit={() => {
                            console.log('PayPal SDK initialized');
                            setSdkReady(true);
                          }}
                          style={{
                            layout: 'vertical',
                            shape: 'rect',
                            height: 48,
                            label: 'pay'
                          }}
                          fundingSource={undefined}
                        />
                      </div>
                    </PayPalScriptProvider>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
                  <p className="mt-4 text-gray-600">Processing payment...</p>
                </div>
              )}

              {/* Additional Security Note */}
              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Bank-level security • Payments processed through PayPal</span>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-lg mb-4">Frequently Asked Questions</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-gray-900">Is this a one-time payment?</p>
                <p className="text-gray-600 mt-1">Yes! Pay once and get lifetime access to all agent features.</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Can I get a refund?</p>
                <p className="text-gray-600 mt-1">Yes, within 7 days if you haven't accessed any client requests.</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">What payment methods are accepted?</p>
                <p className="text-gray-600 mt-1">Credit and debit cards (Visa, Mastercard, Discover, Amex) - optimized for Jamaica.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
