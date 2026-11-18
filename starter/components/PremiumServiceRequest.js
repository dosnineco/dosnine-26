import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { SignInButton, useUser } from '@clerk/nextjs';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CheckCircle, LockKeyhole } from 'lucide-react';
import BankTransferOption from './BankTransferOption';

const DEFAULT_PRICE_JMD = 3178.4;

function formatJmd(amount) {
  return `J$${Number(amount).toLocaleString('en-JM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PremiumServiceRequest() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [priceLoaded, setPriceLoaded] = useState(false);
  const [priceJmd, setPriceJmd] = useState(DEFAULT_PRICE_JMD);
  const [isPremium, setIsPremium] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [pricingError, setPricingError] = useState('');

  useEffect(() => {
    if (!isLoaded) return undefined;
    let active = true;

    async function loadPlan() {
      try {
        const { data: priceResponse } = await axios.get('/api/site-settings/payment-prices');
        const currentPrice = Number(priceResponse?.prices?.premium_service_price);
        if (!priceResponse?.success || !Number.isFinite(currentPrice) || currentPrice <= 0) {
          throw new Error('Current Premium pricing is unavailable.');
        }
        if (active) {
          setPriceJmd(currentPrice);
          setPriceLoaded(true);
        }

        if (user?.id) {
          const { data: statusResponse } = await axios.get('/api/user/premium-status');
          if (!statusResponse?.success) throw new Error('Unable to verify your Premium status.');
          if (active) {
            setIsPremium(Boolean(statusResponse.isPremium));
            setExpiresAt(statusResponse.expiresAt || null);
          }
        }
      } catch (error) {
        console.error('Unable to load Premium plan details:', error);
        if (active) {
          setPricingError(error.response?.data?.error || error.message || 'Unable to load Premium details.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPlan();
    return () => { active = false; };
  }, [isLoaded, user?.id]);

  const completePayment = async (data) => {
    try {
      const { data: result } = await axios.post('/api/user/upgrade-premium', {
        orderId: data.orderID,
      });
      if (!result?.success) throw new Error(result?.error || 'Unable to activate Premium.');
      setIsPremium(true);
      setExpiresAt(result.expiresAt || null);
      toast.success('Premium Property Plan activated.');
    } catch (error) {
      console.error('Premium PayPal capture failed:', error);
      toast.error(error.response?.data?.error || error.message || 'Payment could not be confirmed.');
    }
  };

  return (
    <>
      <Head>
        <title>Premium Property Plan — Dosnine</title>
        <meta name="description" content="Post more properties and receive a monthly property visibility boost." />
      </Head>
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <section className="mx-auto max-w-2xl rounded-2xl bg-white p-6 sm:p-10">
          {isPremium ? (
            <div className="text-center">
              <CheckCircle className="mx-auto mb-4 text-emerald-600" size={44} />
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Premium active</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">Your Premium Property Plan is active</h1>
              {expiresAt ? (
                <p className="mt-3 text-gray-600">
                  Access through {new Date(expiresAt).toLocaleDateString('en-JM', { dateStyle: 'long' })}.
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/properties/new" className="rounded-xl bg-accent px-5 py-3 font-semibold text-white hover:bg-accent/90">
                  Post another property
                </Link>
                <Link href="/dashboard" className="rounded-xl bg-gray-100 px-5 py-3 font-semibold text-gray-800 hover:bg-gray-200">
                  Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center">
                <LockKeyhole className="mx-auto mb-4 text-accent" size={40} />
                <p className="text-xs font-bold uppercase tracking-widest text-accent">30-day membership</p>
                <h1 className="mt-2 text-3xl font-bold text-gray-900">Premium Property Plan</h1>
                <p className="mt-3 text-gray-600">
                  Keep your first property listing free. Upgrade when you want to post more than one property.
                </p>
                <p className="mt-6 text-4xl font-bold text-accent">{formatJmd(priceJmd)}</p>
                <p className="mt-1 text-sm text-gray-500">for 30 days</p>
              </div>

              <ul className="mt-8 space-y-3 rounded-xl bg-gray-50 p-5 text-sm text-gray-700">
                <li className="flex gap-2"><CheckCircle size={18} className="shrink-0 text-emerald-600" /> Post and manage more than one property.</li>
                <li className="flex gap-2"><CheckCircle size={18} className="shrink-0 text-emerald-600" /> Get one free property visibility boost per 30-day plan.</li>
                <li className="flex gap-2"><CheckCircle size={18} className="shrink-0 text-emerald-600" /> Each boost lasts up to 30 days and ends early when the property is marked sold.</li>
                <li className="flex gap-2"><CheckCircle size={18} className="shrink-0 text-emerald-600" /> Additional 30-day boosts cost J$500 each.</li>
                <li className="flex gap-2"><CheckCircle size={18} className="shrink-0 text-emerald-600" /> Property requests and buyer readiness stay free.</li>
              </ul>

              <div className="mt-7">
                {!isLoaded || loading ? (
                  <p className="text-center text-sm text-gray-500">Loading Premium checkout…</p>
                ) : !user?.id ? (
                  <SignInButton mode="modal">
                    <button type="button" className="w-full rounded-xl bg-accent px-5 py-3 font-semibold text-white hover:bg-accent/90">
                      Sign in to upgrade
                    </button>
                  </SignInButton>
                ) : pricingError ? (
                  <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{pricingError}</p>
                ) : !process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? (
                  <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                    Debit or credit card checkout is temporarily unavailable.
                  </p>
                ) : priceLoaded ? (
                  <>
                    <p className="mb-2 text-center text-sm font-semibold text-gray-700">Debit or credit card via PayPal</p>
                    <PayPalScriptProvider options={{
                      'client-id': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
                      currency: 'USD',
                      intent: 'capture',
                    }}>
                      <PayPalButtons
                        style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
                        createOrder={async () => {
                          const { data } = await axios.post('/api/user/create-premium-order');
                          return data.orderId;
                        }}
                        onApprove={completePayment}
                        onError={(error) => {
                          console.error('Premium PayPal checkout failed:', error);
                          toast.error('Card checkout failed. Please try again.');
                        }}
                      />
                    </PayPalScriptProvider>
                  </>
                ) : null}
                {user?.id && priceLoaded && !pricingError && (
                  <BankTransferOption service="30-day Premium Property Plan" amountJmd={priceJmd} reference={user.id} />
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}
