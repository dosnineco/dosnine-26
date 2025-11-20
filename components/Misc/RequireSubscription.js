import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import { differenceInDays } from 'date-fns';
import PricingComponent from "./PricingComponent";

const TRIAL_LENGTH_DAYS = 7;

const RequireSubscription = ({ children }) => {
  const { user, isLoaded } = useUser();
  const [isSubscribed, setIsSubscribed] = useState(null);
  const [trialActive, setTrialActive] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!isLoaded || !user) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('is_subscribed, trial_start_date, is_trial_active')
          .eq('clerk_id', user.id)
          .single();

        if (error) {
          console.error('Error checking subscription status:', error);
          setIsSubscribed(false);
        } else {
          const { is_subscribed, trial_start_date, is_trial_active } = data;

          if (is_subscribed) {
            setIsSubscribed(true);
            setTrialActive(false);
          } else if (is_trial_active && trial_start_date) {
            const daysElapsed = differenceInDays(new Date(), new Date(trial_start_date));
            if (daysElapsed < TRIAL_LENGTH_DAYS) {
              setTrialActive(true);
              setTrialDaysRemaining(TRIAL_LENGTH_DAYS - daysElapsed);
              setIsSubscribed(false);
            } else {
              // Trial expired
              await supabase
                .from('users')
                .update({ is_trial_active: false })
                .eq('clerk_id', user.id);
              setTrialActive(false);
              setIsSubscribed(false);
            }
          } else {
            setIsSubscribed(false);
            setTrialActive(false);
          }
        }
      } catch (err) {
        console.error('Unexpected error checking subscription status:', err);
        setIsSubscribed(false);
        setTrialActive(false);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [isLoaded, user]);

  if (loading) {
    return <div className="p-8 text-gray-500 text-center">Checking subscription status...</div>;
  }

  if (isSubscribed) {
    return <>{children}</>;
  }

  if (trialActive) {
    return (
      <div className="w-full p-2 text-center">
        <p className="text-lg text-blue-600 p-4 mb-4">
          You are using a free trial. {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining.
        </p>
        {children}
      </div>
    );
  }

  // Not subscribed and no trial
  return (
    <div className="w-full p-8 text-center">
      <p className="text-lg text-red-600 p-4 mb-4">
        Your free trial has expired. Please subscribe to continue using the service.
      </p>
      <PricingComponent />
    </div>
  );
};

export default RequireSubscription;