import { useRouter } from 'next/router';
import { ClerkProvider } from '@clerk/nextjs';
import { SignedIn, SignedOut, SignInButton, SignUpButton, useUser } from '@clerk/nextjs';
import '../styles/globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import VisitorEmailPopup from '../components/VisitorEmailPopup';
import Seo from '../components/Seo';
import SiteProtection from '../components/SiteProtection';
import { useEffect, useRef, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useAnalyticsTracking } from '../lib/useAnalyticsTracking';
import Clarity from '@microsoft/clarity';

// Public routes that don't require sign-in
const PUBLIC_ROUTES = [
  '/',
  '/property',
  '/property/[slug]',
  '/request',
  '/onboarding',
  '/market',
  '/advertise',
  '/ads/[id]',
  '/ads/request-agent',
  '/tools',
  '/blog',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
  '/refund-policy',
  '/about',
  '/requests-marketplace',
  '/listing',
  '/course',
  '/logo',
  '/ads-course'
];

// Pages that should not have header/footer
const NO_LAYOUT_PAGES = ['/advertise', '/ads/request-agent', '/course', '/logo', '/ads-course'];

// Helper function to check if a route is public (fixes pathname collision issue)
const isPublicRoute = (pathname) => {
  return PUBLIC_ROUTES.some((route) => {
    if (route === pathname) return true;
    // Only use startsWith for dynamic routes (containing [...])
    if (route.includes('[')) {
      const baseRoute = route.split('[')[0];
      return pathname.startsWith(baseRoute);
    }
    return false;
  });
};

// Helper function to set redirect path
const setRedirectPath = (path) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('redirectAfterSignIn', path);
  }
};

// Retry logic for Supabase sync with timeout and error handling
const syncUserWithRetry = async (maxRetries = 3) => {

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/user/profile', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to sync user profile');
      }

      return await response.json(); // Return profile data
    } catch (err) {
      console.error(`Sync attempt ${attempt}/${maxRetries} failed:`, err);

      if (attempt === maxRetries) {
        // Last attempt failed
        throw new Error(`Failed to sync user after ${maxRetries} attempts: ${err.message}`);
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};


function MyApp({ Component, pageProps }) {
  const router = useRouter();

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      navigate={(to) => router.push(to)}
    >
      <AppContent Component={Component} pageProps={pageProps} />
    </ClerkProvider>
  );
}
function AppContent({ Component, pageProps }) {
  const { isSignedIn, user, isLoaded: isClerkLoaded } = useUser();
  const router = useRouter();
  const lastSyncedUserIdRef = useRef(null);
  const [isSynced, setIsSynced] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [showLoadingState, setShowLoadingState] = useState(false);
  
  const hideLayout = NO_LAYOUT_PAGES.includes(router.pathname);
  const isCurrentPagePublic = isPublicRoute(router.pathname);
  
  // Use the page-level layout if it exists, otherwise use the default layout
  const getLayout = Component.getLayout || ((page) => page);
  
  // Initialize analytics tracking on all pages
  useAnalyticsTracking();

  // Save intended destination so we can redirect back after sign-in
  useEffect(() => {
    if (isClerkLoaded && !isSignedIn && !isCurrentPagePublic) {
      setRedirectPath(router.asPath);
    }
  }, [isClerkLoaded, isSignedIn, isCurrentPagePublic, router.asPath]);

  // Initialize Microsoft Clarity
  useEffect(() => {
    if (typeof window !== 'undefined') {
      Clarity.init('ujn9fzt88c');
    }
  }, []);

  // Handle redirect after sign-in
  useEffect(() => {
    if (isSignedIn && isClerkLoaded) {
      const redirectPath = sessionStorage.getItem('redirectAfterSignIn');
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterSignIn');
        router.push(redirectPath);
      }
    }
  }, [isSignedIn, isClerkLoaded, router]);

  // Sync Clerk user to Supabase with proper error handling
  useEffect(() => {
    const syncUser = async () => {
      if (!isSignedIn || !user || !isClerkLoaded) {
        lastSyncedUserIdRef.current = null;
        setIsSynced(false);
        return;
      }

      const userId = user.id;
      if (lastSyncedUserIdRef.current === userId) {
        return;
      }

      const isInitialSync = !isSynced;
      if (isInitialSync) {
        setShowLoadingState(true);
      }

      setSyncError(null);

      try {
        const profile = await syncUserWithRetry();
        lastSyncedUserIdRef.current = userId;
        setIsSynced(true);
        setSyncError(null);

        // Immediately redirect verified agents to the agent dashboard
        const agent = Array.isArray(profile?.agent) ? profile.agent[0] : profile?.agent;
        const isVerifiedAgent = agent?.verification_status === 'approved';
        if (isVerifiedAgent && !router.pathname.startsWith('/agent')) {
          router.replace('/agent/dashboard');
          return;
        }
      } catch (err) {
        console.error('Failed to sync user to Supabase:', err);
        setSyncError(err.message || 'Failed to sync user data');
        setIsSynced(true);
        
        // Show error toast to user
        toast.error('There was an issue setting up your account. Please refresh the page.');
      } finally {
        if (isInitialSync) {
          setShowLoadingState(false);
        }
      }
    };

    syncUser();
  }, [isSignedIn, user?.id, isClerkLoaded, isSynced]);

  // If page has custom layout (like ads pages), use it without Header/Footer
  if (Component.getLayout) {
    return getLayout(
      <>
        <Seo />
        <SiteProtection />
        <Toaster position="top-center" />
        <Component {...pageProps} />
      </>
    );
  }

  // Show loading state while Clerk is loading
  if (!isClerkLoaded) {
    return (
      <>
        <Seo />
        <SiteProtection />
        <Toaster position="top-center" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  // Default layout with Header and Footer
  return (
    <>
      <Seo />
      <SiteProtection />
      <Toaster position="top-center" />
      {!hideLayout && <Header />}
      
      {isCurrentPagePublic ? (
        <main className="min-h-screen">
          <Component {...pageProps} />
        </main>
      ) : (
        <>
          {isSignedIn ? (
            <>
              {/* Show loading state during Supabase sync */}
              {showLoadingState && (
                <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                    <p className="text-gray-600">Setting up your account...</p>
                  </div>
                </div>
              )}

              {/* Show content once synced */}
              {isSynced && !showLoadingState && (
                <SignedIn>
                  <main className="min-h-screen">
                    <Component {...pageProps} />
                  </main>
                </SignedIn>
              )}
            </>
          ) : (
            <SignedOut>
              <div 
                className="flex items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat relative"
                style={{
                  backgroundImage: "url('https://etikxypnxjsonefwnzkr.supabase.co/storage/v1/object/public/property-images/avi-waxman-f9qZuKoZYoY-unsplash.jpg')"
                }}
              >
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-50"></div>
                
                {/* Login card */}
                <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4 text-center border border-white/20">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">Dosnine Properties</h1>
                  <p className="text-lg text-gray-600 mb-8">Sign in to access your dashboard and manage properties.</p>
                  <div className="flex flex-row gap-4">
                    <SignInButton>
                      <button className="flex-1 px-6 py-4 font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transition duration-200 transform hover:scale-105 btn-accent">
                        Sign In
                      </button>
                    </SignInButton>
                    <SignUpButton>
                      <button className="flex-1 px-6 py-4 font-bold text-lg rounded-lg shadow-md hover:shadow-lg transition duration-200 transform hover:scale-105 btn-accent-outline">
                        Sign Up
                      </button>
                    </SignUpButton>
                  </div>
                </div>
              </div>
            </SignedOut>
          )}
        </>
      )}
      {!hideLayout && <Footer />}
    </>
  )
}

export default MyApp;
