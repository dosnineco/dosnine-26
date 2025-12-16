import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminAgentApprovals from '@/components/AdminAgentApprovals';
import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function AdminApprovalsPage() {
  const { user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      setChecking(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('clerk_id', user.id)
        .single();

      if (!error && data?.role === 'admin') {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
    } finally {
      setChecking(false);
    }
  };

  if (!isLoaded || checking) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4 flex items-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-2xl p-8 text-center">
          <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Admin Access Required</h1>
          <p className="text-gray-600 mb-6">
            Please sign in with an administrator account to access this page.
          </p>
          <Link
            href="/sign-in"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded font-semibold transition inline-block"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4 flex items-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-2xl p-8 text-center">
          <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You do not have administrator permissions. This page is restricted to admin users only.
          </p>
          <Link
            href="/"
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded font-semibold transition inline-block"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return <AdminAgentApprovals />;
}
