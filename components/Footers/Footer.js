import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';

export default function Footer() {
  const { user } = useUser();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('is_subscribed')
            .eq('clerk_id', user.id)
            .single();

          if (error) {
            console.error('Error fetching subscription status:', error);
          } else {
            setIsSubscribed(data?.is_subscribed || false);
          }
        } catch (err) {
          console.error('Unexpected error checking subscription status:', err);
        }
      }
      setLoading(false);
    };

    checkSubscriptionStatus();
  }, [user]);

  return (
    <footer className="py-8 mt-12">
      <div className="container mx-auto px-4 text-center">
        <p className="text-inherit font-bold text-sm">
          Copyright © {new Date().getFullYear()} Expense Goose Ltd.
        </p>
        <div className="mt-2">
          <a href="/terms-of-service" className="text-base text-green-600 hover:underline mx-2">
            Terms of Service
          </a>
          <a href="/privacy-policy" className="text-green-600 hover:underline mx-2">
            Privacy Policy
          </a>
          <a href="/refund-policy" className="text-base text-green-600 hover:underline mx-2">
            Refund Policy
          </a>
          <a href="/checkout" className="text-base text-green-600 hover:underline mx-2">
            Pricing
          </a>
          <a href="/about" className="text-base text-green-600 hover:underline mx-2">
            About
          </a>
          <a href="/blog" className="text-base text-green-600 hover:underline mx-2">
            Blog
          </a>
          <a href="/admin" className="text-base text-green-600 hover:underline mx-2">
            main
          </a>
        </div>
        {/* {!loading && (
          <div className="mt-4">
            {isSubscribed ? (
              <div className="flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-yellow-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-yellow-500 font-bold">Premium</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-gray-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-gray-500 font-bold">Free</span>
              </div>
            )}
          </div>
        )} */}
      </div>
    </footer>
  );
}