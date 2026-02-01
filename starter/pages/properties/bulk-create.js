import { SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import BulkListingCreator from '../../components/BulkListingCreator';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

export default function BulkCreatePage() {
  const { user } = useUser();
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function checkAccess() {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('users')
        .select('role, agents(verification_status, payment_status, access_expiry)')
        .eq('clerk_id', user.id)
        .single();

      // Check if user is admin
      const isAdmin = data?.role === 'admin';
      
      // Check if user is verified agent with paid plan
      const paidPlans = ['7-day', '30-day', '90-day'];
      const hasPaidPlan = paidPlans.includes(data?.agents?.payment_status);
      const isVerifiedAgent = data?.agents?.verification_status === 'approved';
      
      // Check if access is not expired (for paid plans)
      const hasValidAccess = !data?.agents?.access_expiry || 
                            new Date(data?.agents?.access_expiry) > new Date();
      
      const isAgent = isVerifiedAgent && hasPaidPlan && hasValidAccess;

      if (isAgent || isAdmin) {
        setIsVerified(true);
      } else if (isVerifiedAgent && hasPaidPlan && !hasValidAccess) {
        toast.error('Your access has expired. Please renew your plan to continue.');
        setTimeout(() => router.push('/agent/payment'), 2000);
      } else if (isVerifiedAgent && !hasPaidPlan) {
        toast.error('Upgrade required to access bulk create. Please upgrade your plan.');
        setTimeout(() => router.push('/agent/payment'), 2000);
      } else {
        toast.error('Access denied: Verified agents with paid plans only');
        setTimeout(() => router.push('/'), 2000);
      }
    } catch (error) {
      console.error('Access check error:', error);
      toast.error('Failed to verify access');
      setTimeout(() => router.push('/'), 2000);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      
      <SignedIn>
        {isVerified ? (
          <div className="min-h-screen bg-gray-50">
            <Toaster position="top-center" />
            <div className="py-8">
              <BulkListingCreator />
            </div>
          </div>
        ) : (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center max-w-md p-8">
              <div className="text-6xl mb-4">🔒</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
              <p className="text-gray-600 mb-4">
                This feature is only available to verified agents with an active paid plan.
              </p>
              <p className="text-sm text-gray-500">
                Redirecting...
              </p>
            </div>
          </div>
        )}
      </SignedIn>
    </>
  );
}
