import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';

// Global cache for user data to persist across component remounts
const userDataCache = new Map();
const verificationCache = new Map();

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
  const hasCheckedRef = useRef(false);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    async function checkUserAccess() {
      // Wait for Clerk to load
      if (!isLoaded) return;

      // Prevent duplicate checks
      if (hasCheckedRef.current || isCheckingRef.current) return;
      isCheckingRef.current = true;

      // Check if auth is required
      if (requireAuth && !user) {
        router.push('/');
        isCheckingRef.current = false;
        return;
      }

      // If no user but auth not required, allow access
      if (!user && !requireAuth) {
        setLoading(false);
        setHasAccess(true);
        hasCheckedRef.current = true;
        isCheckingRef.current = false;
        return;
      }

      const cacheKey = user.id;
      const cachedData = userDataCache.get(cacheKey);
      const cachedVerification = verificationCache.get(cacheKey);

      // Use cached data if available and recent (within 5 minutes)
      if (cachedData && cachedVerification !== undefined) {
        const cacheAge = Date.now() - (cachedData._cacheTime || 0);
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes
          console.log('useRoleProtection - Using cached data');
          setUserData(cachedData);
          setHasAccess(cachedVerification);
          setLoading(false);
          hasCheckedRef.current = true;
          isCheckingRef.current = false;
          return;
        }
      }

      try {
        // Fetch user data from database
        const { data } = await axios.get('/api/user/profile', {
          params: { clerkId: user.id }
        });

        console.log('useRoleProtection - Fetched fresh user data:', data);
        console.log('useRoleProtection - Agent data:', data?.agent);
        console.log('useRoleProtection - User role:', data?.role);

        // Cache the data with timestamp
        const dataWithCache = { ...data, _cacheTime: Date.now() };
        userDataCache.set(cacheKey, dataWithCache);
        setUserData(dataWithCache);

        // Check access using provided function
        const access = checkAccess ? checkAccess(data) : true;
        console.log('useRoleProtection - Access check result:', access);
        
        // Cache verification result
        verificationCache.set(cacheKey, access);
        setHasAccess(access);
        hasCheckedRef.current = true;

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
        isCheckingRef.current = false;
      }
    }

    checkUserAccess();
  }, [user?.id, isLoaded, requireAuth]);

  // Memoized function to clear cache (useful for logout or when user data changes)
  const clearCache = useCallback(() => {
    if (user?.id) {
      userDataCache.delete(user.id);
      verificationCache.delete(user.id);
      hasCheckedRef.current = false;
    }
  }, [user?.id]);

  return { loading, hasAccess, userData, user, clearCache };
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

/**
 * Clear all cached user data and verification results
 * Call this on logout or when user data needs to be refreshed globally
 */
export function clearAllVerificationCache() {
  userDataCache.clear();
  verificationCache.clear();
  console.log('Cleared all verification cache');
}

/**
 * Clear cache for a specific user
 */
export function clearUserCache(userId) {
  if (userId) {
    userDataCache.delete(userId);
    verificationCache.delete(userId);
    console.log('Cleared cache for user:', userId);
  }
}
