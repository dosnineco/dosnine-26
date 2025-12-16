import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * Hook to protect routes based on role requirements
 * 
 * @param {Object} options - Protection options
 * @param {Function} options.checkAccess - Function that returns true if user has access
 * @param {string} options.redirectTo - Path to redirect if access denied
 * @param {string} options.message - Toast message to show on access denial
 * @param {boolean} options.requireAuth - Require user to be authenticated
 */
export function useRoleProtection({ 
  checkAccess, 
  redirectTo = '/dashboard', 
  message = 'Access denied',
  requireAuth = true 
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    async function checkUserAccess() {
      // Wait for Clerk to load
      if (!isLoaded) return;

      // Check if auth is required
      if (requireAuth && !user) {
        router.push('/');
        return;
      }

      // If no user but auth not required, allow access
      if (!user && !requireAuth) {
        setLoading(false);
        setHasAccess(true);
        return;
      }

      try {
        // Fetch user data from database
        const { data } = await axios.get('/api/user/profile', {
          params: { clerkId: user.id }
        });

        console.log('useRoleProtection - Fetched user data:', data);
        console.log('useRoleProtection - Agent data:', data?.agent);
        console.log('useRoleProtection - User role:', data?.role);

        setUserData(data);

        // Check access using provided function
        const access = checkAccess ? checkAccess(data) : true;
        console.log('useRoleProtection - Access check result:', access);
        
        setHasAccess(access);

        if (!access) {
          toast.error(message);
          router.push(redirectTo);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        toast.error('Failed to verify access');
        router.push('/');
      } finally {
        setLoading(false);
      }
    }

    checkUserAccess();
  }, [user, isLoaded, checkAccess, redirectTo, message, requireAuth]);

  return { loading, hasAccess, userData, user };
}

/**
 * HOC to protect pages with role-based access
 */
export function withRoleProtection(Component, options) {
  return function ProtectedComponent(props) {
    const { loading, hasAccess, userData, user } = useRoleProtection(options);

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
            <p className="mt-4 text-gray-600">Verifying access...</p>
          </div>
        </div>
      );
    }

    if (!hasAccess) {
      return null; // Will redirect
    }

    return <Component {...props} userData={userData} user={user} />;
  };
}
