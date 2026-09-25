import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  useUser,
} from '@clerk/clerk-react';
import '../styles/globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SponsoredAdBanner from '../components/SponsoredAdBanner';
import VisitorEmailPopup from '../components/VisitorEmailPopup';
import Seo from '../components/Seo';
import SiteProtection from '../components/SiteProtection';
import AdminLayout from '../components/AdminLayout';
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
  '/newsletter/unsubscribe',
  '/search/[...slug]',
  '/tools',
  '/blog',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
  '/refund-policy',
  '/about',
  '/verify',
  '/requests-marketplace',
  '/listing',
  '/course',
  '/logo',
  '/ads-course',
  '/fin',
  '/chargeback',
  '/hill-lot',
];

// Pages that should not have header/footer
const NO_LAYOUT_PAGES = ['/ads/request-agent', '/course', '/logo', '/ads-course', '/hill-lot'];

const isPublicRoute = (pathname) => {
  return PUBLIC_ROUTES.some((route) => {
    if (route === pathname) return true;
    if (route.includes('[')) {
      const baseRoute = route.split('[')[0];
      return pathname.startsWith(baseRoute);
    }
    return false;
  });
};

const setRedirectPath = (path) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('redirectAfterSignIn', path);
  }
};

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

      return await response.json();
    } catch (err) {
      console.error(`Sync attempt ${attempt}/${maxRetries} failed:`, err);

      if (attempt === maxRetries) {
        throw new Error(`Failed to sync user after ${maxRetries} attempts: ${err.message}`);
      }

      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      standardBrowser
      touchSession
      navigate={(to) => {
        if (
          typeof window !== 'undefined' &&
          to === window.location.pathname + window.location.search
        ) {
          return;
        }
        router.push(to);
      }}
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
  const [profileData, setProfileData] = useState(null);

  const isAdminRoute = router.pathname.startsWith('/admin');
  const hideLayout = NO_LAYOUT_PAGES.includes(router.pathname) || isAdminRoute;
  const isCurrentPagePublic = isPublicRoute(router.pathname);
  const showAdvertisements =
    isCurrentPagePublic &&
    !hideLayout &&
    !isAdminRoute &&
    router.pathname !== '/ads/[id]';

  const getLayout = Component.getLayout || ((page) => page);

  useAnalyticsTracking();

  useEffect(() => {
    if (isClerkLoaded && !isSignedIn && !isCurrentPagePublic) {
      setRedirectPath(router.asPath);
    }
  }, [isClerkLoaded, isSignedIn, isCurrentPagePublic, router.asPath]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      Clarity.init('ujn9fzt88c');
    }
  }, []);

  useEffect(() => {
    if (isSignedIn && isClerkLoaded) {
      const redirectPath = sessionStorage.getItem('redirectAfterSignIn');
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterSignIn');
        router.push(redirectPath);
      }
    }
  }, [isSignedIn, isClerkLoaded, router]);

  useEffect(() => {
    const syncUser = async () => {
      if (!isSignedIn || !user || !isClerkLoaded) {
        lastSyncedUserIdRef.current = null;
        setIsSynced(false);
        return;
      }

      const userId = user.id;
      if (lastSyncedUserIdRef.current === userId) return;

      const isInitialSync = !isSynced;
      if (isInitialSync) setShowLoadingState(true);

      setSyncError(null);

      try {
        const profile = await syncUserWithRetry();
        lastSyncedUserIdRef.current = userId;
        setIsSynced(true);
        setSyncError(null);
        setProfileData(profile);
      } catch (err) {
        console.error('Failed to sync user to Supabase:', err);
        setSyncError(err.message || 'Failed to sync user data');
        setIsSynced(true);
        toast.error('There was an issue setting up your account. Please refresh the page.');
      } finally {
        if (isInitialSync) setShowLoadingState(false);
      }
    };

    syncUser();
  }, [isSignedIn, user?.id, isClerkLoaded, isSynced, user]);

  useEffect(() => {
    if (!isSignedIn || !isSynced || !profileData) return;
    if (isCurrentPagePublic || router.pathname === '/verify') return;

    const isAdmin = profileData.role === 'admin';
    const isVerified =
      Boolean(profileData.identity_verified) ||
      profileData.id_verification_status === 'approved';

    if (!isAdmin && !isVerified) {
      router.replace('/verify');
    }
  }, [isSignedIn, isSynced, profileData, isCurrentPagePublic, router, user]);

  /**
   * Render the current page inside the appropriate wrapper:
   *   - /admin/* → AdminLayout (with its own sidebar + main)
   *   - everything else → plain <main>
   */
  const renderPage = () => {
    const page = <Component {...pageProps} />;
    if (isAdminRoute) {
      return <AdminLayout>{page}</AdminLayout>;
    }
    return <main className="min-h-screen">{page}</main>;
  };

  // If page has a custom layout (like ads pages), honor it
  if (Component.getLayout) {
    return getLayout(
      <>
        <Head>
          {!isCurrentPagePublic && <meta name="robots" content="noindex, nofollow" />}
        </Head>
        <Seo />
        <SiteProtection />
        <Toaster position="top-center" />
        <Component {...pageProps} />
      </>
    );
  }

  // Clerk not loaded yet
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

  // Default layout
  return (
    <>
      <Head>
        {!isCurrentPagePublic && <meta name="robots" content="noindex, nofollow" />}
      </Head>
      <Seo />
      <SiteProtection />
      <Toaster position="top-center" />
      {!hideLayout && <Header />}
      {showAdvertisements && <SponsoredAdBanner compact />}

      {isCurrentPagePublic ? (
        renderPage()
      ) : (
        <>
          {isSignedIn ? (
            <>
              {showLoadingState && (
                <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                    <p className="text-gray-600">Setting up your account...</p>
                  </div>
                </div>
              )}

              {isSynced && !showLoadingState && (
                <SignedIn>
                  {(() => {
                    const isAdmin = profileData?.role === 'admin';
                    const isVerified =
                      Boolean(profileData?.identity_verified) ||
                      profileData?.id_verification_status === 'approved';
                    const isAllowed =
                      router.pathname === '/verify' || isAdmin || isVerified;

                    if (!isAllowed) {
                      return (
                        <div className="flex items-center justify-center min-h-screen">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                            <p className="text-gray-600">Redirecting to identity verification…</p>
                          </div>
                        </div>
                      );
                    }

                    return renderPage();
                  })()}
                </SignedIn>
              )}
            </>
          ) : (
            <SignedOut>
              <div
                className="flex items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat relative"
                style={{
                  backgroundImage:
                    "url('https://etikxypnxjsonefwnzkr.supabase.co/storage/v1/object/public/property-images/newsletter-images/clay-leconey--cE_WYFod6g-unsplash.jpg')",
                }}
              >
                <div className="absolute inset-0 bg-black bg-opacity-50"></div>

                <div className="relative z-10 bg-black/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4 text-center border border-white/20">
                  <h1 className="text-4xl font-bold text-gray-200 mb-2">Dosnine Limited</h1>
                  <p className="text-lg text-gray-200 mb-8">Sign in to access your properties.</p>
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
  );
}

export default MyApp;