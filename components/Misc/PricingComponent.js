import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useUser } from "@clerk/nextjs";
import { supabase } from "../../lib/supabase";
import { CheckCircle, Zap, Crown } from "lucide-react";

export default function Payment() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [hasPaid, setHasPaid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push("/dashboard");
      return;
    }

    const checkSubscriptionStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("is_subscribed")
          .eq("clerk_id", user.id)
          .maybeSingle();

        if (!error && data?.is_subscribed) {
          setHasPaid(true);
        }
      } catch (err) {
        console.error("Unexpected error checking subscription status:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSubscriptionStatus();
  }, [isLoaded, user, router]);

  const handlePaymentSuccess = async (paymentid) => {
    if (!user) {
      alert("You must be signed in to complete the payment.");
      return;
    }

    try {
      const { data, error } = await supabase.from("users").upsert(
        {
          clerk_id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          full_name: user.fullName,
          is_subscribed: true,
          subscription_date: new Date().toISOString(),
          payment_id: paymentid,
          is_trial_active: false,
          payment_status: "Paid",
        },
        { onConflict: "clerk_id" }
      );

      if (error) {
        console.error("Error saving subscription:", error);
        alert("There was an issue updating your subscription. Please contact support.");
      } else {
        setHasPaid(true);
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Unexpected error saving subscription:", err);
      alert("An unexpected error occurred. Please try again later.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-700">
        <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-indigo-500"></div>
      </div>
    );
  }

  if (hasPaid) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-white">
        <div className="max-w-lg text-center p-10 bg-white rounded-2xl shadow-xl border border-gray-200">
          <Crown className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
          <h1 className="text-4xl font-extrabold mb-4 text-gray-800">Thank You!</h1>
          <p className="text-lg mb-6 text-gray-600">
            You are now <span className="font-semibold text-indigo-600">Premium</span>.  
            Enjoy all the exclusive features!
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white  px-6">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl font-extrabold mb-4 text-gray-800 flex items-center justify-center gap-2">
          Upgrade to Premium <Zap className="text-yellow-500 h-8 w-8" />
        </h1>
        <p className="text-gray-600 mb-10 text-lg">
          Unlock full access to all tools. No hidden fees. Cancel anytime.
        </p>

        {/* Pricing Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-2">
            <Crown className="text-yellow-500 h-6 w-6" /> Premium Plan
          </h2>
          <p className="text-5xl font-extrabold text-indigo-600 mb-2">$4.99</p>
          <p className="text-gray-500 mb-6">Per Year</p>

          {/* Features */}
          <ul className="text-gray-700 space-y-3 mb-8 text-left max-w-xs mx-auto">
            <li className="flex items-center gap-2">
              <CheckCircle className="text-green-500 w-5 h-5" /> Unlimited Access
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="text-green-500 w-5 h-5" /> Priority Support
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="text-green-500 w-5 h-5" /> Advanced Analytics
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="text-green-500 w-5 h-5" /> Exclusive Tools
            </li>
          </ul>

          {/* PayPal Button */}
          <PayPalScriptProvider options={{ "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID }}>
            <PayPalButtons
              style={{ layout: "vertical", color: "blue", shape: "pill", label: "subscribe" }}
              createOrder={(data, actions) => {
                return actions.order.create({
                  purchase_units: [{ amount: { value: "4.99" } }],
                });
              }}
              onApprove={(data, actions) => {
                return actions.order.capture().then(() => {
                  handlePaymentSuccess(data.orderID);
                });
              }}
              onError={(err) => {
                console.error("PayPal Checkout Error:", err);
                alert("There was an issue processing your payment. Please try again.");
              }}
            />
          </PayPalScriptProvider>
        </div>
      </div>
    </div>
  );
}
