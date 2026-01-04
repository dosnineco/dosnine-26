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
        .select('role, agents(verification_status, payment_status)')
        .eq('clerk_id', user.id)
        .single();

      // Check if user is verified agent or admin
      const isAgent = data?.agents?.verification_status === 'approved' && 
                      data?.agents?.payment_status === 'paid';
      const isAdmin = data?.role === 'admin';

      if (isAgent || isAdmin) {
        setIsVerified(true);
      } else if (data?.agents?.verification_status === 'approved' && data?.agents?.payment_status !== 'paid') {
        toast.error('Payment required to access bulk create. Please complete your payment.');
        setTimeout(() => router.push('/agent/payment'), 2000);
      } else {
        toast.error('Access denied: Verified paid agents only');
        setTimeout(() => router.push('/'), 2000);
      }
    } catch (error) {
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
                This feature is only available to verified agents.
              </p>
              <p className="text-sm text-gray-500">
                Redirecting to home...
              </p>
            </div>
          </div>
        )}
      </SignedIn>
    </>
  );
}
