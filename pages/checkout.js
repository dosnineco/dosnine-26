import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../lib/supabase';
import PricingComponent from '../components/Misc/PricingComponent';
import { CheckCircle, Zap, Crown } from "lucide-react";


export default function Payment() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [hasPaid, setHasPaid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push('/dashboard');
      return;
    }

    const checkSubscriptionStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('is_subscribed')
          .eq('clerk_id', user.id)
          .maybeSingle(); // Use maybeSingle instead of single

        if (error) {
          console.error('Error fetching subscription status:', error);
        } else if (data?.is_subscribed) {
          setHasPaid(true);
        }
      } catch (err) {
        console.error('Unexpected error checking subscription status:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSubscriptionStatus();
  }, [isLoaded, user, router]);

  const handlePaymentSuccess = async (paymentid) => {
    if (user) {
      try {
        const { data, error } = await supabase
          .from('users')
          .upsert(
            {
              clerk_id: user.id,
              email: user.primaryEmailAddress?.emailAddress,
              full_name: user.fullName,
              is_subscribed: true,
              subscription_date: new Date().toISOString(),
              payment_id: paymentid,
              is_trial_active: false,
              payment_status: 'Paid',
            },
            { onConflict: 'clerk_id' }
          );

        if (error) {
          console.error('Error saving subscription:', error);
          alert('There was an issue updating your subscription. Please contact support.');
        } else {
          console.log('Subscription saved:', data);
          setHasPaid(true);
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Unexpected error saving subscription:', err);
        alert('An unexpected error occurred. Please try again later.');
      }
    } else {
      console.error('User is not authenticated.');
      alert('You must be signed in to complete the payment.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-700">
        <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  if (hasPaid) {
    return (
      <div className="flex items-center justify-center mt-20 p-3 text-black">
        <div className="max-w-3xl text-center p-8 rounded-lg text-gray-900">
          <h1 className="text-4xl font-extrabold mb-4 text-gray-700">Thank You!</h1>
          <p className="text-lg mb-6">
            You Are premium. Enjoy all the premium features!
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 text-bold text-white bg-gray-700 rounded-lg shadow-lg "
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className=" w-full max-w-screen-md mx-auto px-4 py-8">
      <div className=" text-center  p-8  text-gray-900">
         <h1 className="text-4xl font-extrabold mb-4 text-gray-800 flex items-center justify-center gap-2">
            Upgrade to Premium <Zap className="text-yellow-500 h-8 w-8" />
          </h1>
          <p className="text-gray-600 mb-4 text-lg">
            Unlock full access to all tools. No hidden fees. Cancel anytime.
          </p>
           <h2 className="text-5xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-2">
            <Crown className="text-yellow-500 h-6 w-6" /> 
            <p className="text-3xl mb-4 font-extrabold text-green-600 mb-2">$4.99</p>
          </h2>
    <div
    className="mt-8 w-full"
    >


        <PayPalScriptProvider options={{ "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID }}>
          <PayPalButtons
            style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'subscribe' }}
            createOrder={(data, actions) => {
              return actions.order.create({
                purchase_units: [
                  {
                    amount: {
                      value: '4.99',
                    },
                  },
                ],
              });
            }}
            onApprove={(data, actions) => {
              return actions.order.capture().then(() => {
                handlePaymentSuccess(data.orderID);
              });
            }}
            onError={(err) => {
              console.error('PayPal Checkout Error:', err);
              alert('There was an issue processing your payment. Please try again.');
            }}
          />
        </PayPalScriptProvider>
        </div>
      </div>
    </div>
  );
}