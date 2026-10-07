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
import {
  ShieldCheck,
  MessageSquare,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

/* ============================================================
 * Static assets
 * ============================================================ */
const HERO_IMAGE =
  'https://etikxypnxjsonefwnzkr.supabase.co/storage/v1/object/public/property-images/hero.jpg';

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
const NO_LAYOUT_PAGES = [
  '/ads/request-agent',
  '/course',
  '/logo',
  '/ads-course',
  '/fin',
  '/invest',
  '/chargeback',
];

/* ============================================================
 * Header sizing
 * ============================================================ */
const HEADER_HEIGHT_CLASS = 'pt-16';

/* Pages that already handle the header offset themselves via a
 * full-bleed hero or their own top padding. */
const PAGES_WITH_OWN_HEADER_OFFSET = ['/'];

/* ============================================================
 * Sponsored banner exclusions
 * ============================================================ */
const NO_SPONSORED_BANNER_ROUTES = [
  '/',
  '/post-property',
  '/listing/new',
  '/agent/signup',
  '/agent/register',
  '/market',
  '/htv',
  '/dosnine-htv',
  '/resources',
  '/privacy-policy',
  '/terms-of-service',
  '/refund-policy',
  '/about',
  '/advertise',
  '/chargeback',
  '/fin',
  '/verify',
];

const NO_SPONSORED_BANNER_PREFIXES = [
  '/dashboard',
  '/agent/dashboard',
  '/landlord',
  '/tenant',
  '/chargeback',
  '/fin',
];

const shouldHideSponsoredBanner = (pathname) => {
  if (NO_SPONSORED_BANNER_ROUTES.includes(pathname)) return true;
  return NO_SPONSORED_BANNER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
};

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
        throw new Error(
          `Failed to sync user after ${maxRetries} attempts: ${err.message}`
        );
      }

      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
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
    router.pathname !== '/ads/[id]' &&
    !shouldHideSponsoredBanner(router.pathname);

  const needsHeaderOffset =
    !hideLayout && !PAGES_WITH_OWN_HEADER_OFFSET.includes(router.pathname);

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
        toast.error(
          'There was an issue setting up your account. Please refresh the page.'
        );
      } finally {
        if (isInitialSync) setShowLoadingState(false);
      }
    };

    syncUser();
  }, [isSignedIn, user?.id, isClerkLoaded, isSynced, user]);

  useEffect(() => {
    if (!isSignedIn || !isSynced || !profileData) return;
    if (router.pathname === '/verify') return;

    const isAdmin = profileData.role === 'admin';
    const isVerified =
      Boolean(profileData.identity_verified) ||
      profileData.id_verification_status === 'approved';

    if (!isAdmin && !isVerified) {
      router.replace('/verify');
    }
  }, [isSignedIn, isSynced, profileData, router, user]);

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
          {!isCurrentPagePublic && (
            <meta name="robots" content="noindex, nofollow" />
          )}
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
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-accent" />
            <p className="text-sm text-slate-600">Loading…</p>
          </div>
        </div>
      </>
    );
  }

  const renderPublicContent = () => (
    <div className={needsHeaderOffset ? HEADER_HEIGHT_CLASS : ''}>
      {showAdvertisements && <SponsoredAdBanner compact />}
      {renderPage()}
    </div>
  );

  // Default layout
  return (
    <>
      <Head>
        {!isCurrentPagePublic && (
          <meta name="robots" content="noindex, nofollow" />
        )}
      </Head>
      <Seo />
      <SiteProtection />
      <Toaster position="top-center" />
      {!hideLayout && <Header />}

      {isCurrentPagePublic ? (
        renderPublicContent()
      ) : (
        <>
          {isSignedIn ? (
            <>
              {showLoadingState && (
                <div className="flex min-h-screen items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-accent" />
                    <p className="text-sm text-slate-600">
                      Setting up your account…
                    </p>
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
                        <div className="flex min-h-screen items-center justify-center">
                          <div className="text-center">
                            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-accent" />
                            <p className="text-sm text-slate-600">
                              Redirecting to identity verification…
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        className={
                          needsHeaderOffset ? HEADER_HEIGHT_CLASS : ''
                        }
                      >
                        {renderPage()}
                      </div>
                    );
                  })()}
                </SignedIn>
              )}
            </>
          ) : (
            <SignedOut>
              <div
                className="relative flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat px-5 py-10 sm:px-6 lg:px-8"
                style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
              >
                {/* Layered scrim: darker on the left for text, softer on the right */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/30"
                  aria-hidden="true"
                />

                {/* Content */}
                <div className="relative z-10 grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
                  {/* ---------- Left: brand + value props (desktop) ---------- */}
                  <div className="hidden text-white lg:block">
                    <div className="flex items-center gap-3">
                      <img
                        src="/logo.png"
                        alt="Dosnine"
                        className="h-10 w-auto"
                      />
                    
                    </div>

                    <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                      Jamaica&apos;s property platform, built for people who
                      move fast.
                    </h1>

                    <p className="mt-4 max-w-lg text-base text-slate-200">
                      Verified listings, direct agent connections, and a
                      marketplace that keeps your search moving — all in one
                      place.
                    </p>

                    <ul className="mt-8 space-y-4">
                      {[
                        {
                          icon: ShieldCheck,
                          title: 'Verified listings only',
                          body: 'Every property and agent is checked before it goes live.',
                        },
                        {
                          icon: MessageSquare,
                          title: 'Direct agent contact',
                          body: 'Message vetted agents without a middleman.',
                        },
                        {
                          icon: MapPin,
                          title: 'Island-wide coverage',
                          body: 'From Kingston to Montego Bay and every parish in between.',
                        },
                      ].map(({ icon: Icon, title, body }) => (
                        <li key={title} className="flex items-start gap-3.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-accent backdrop-blur">
                            <Icon size={16} />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {title}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-300">
                              {body}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <span>Trusted by Jamaican agents</span>
                      <span className="h-1 w-1 rounded-full bg-slate-500" />
                      <span>Secure payments</span>
                      <span className="h-1 w-1 rounded-full bg-slate-500" />
                      <span>Locally owned</span>
                    </div>
                  </div>

                  {/* ---------- Right: auth card ---------- */}
                  <div className="mx-auto w-full max-w-md lg:mx-0 lg:ml-auto">
                    {/* Mobile brand strip */}
                    <div className="mb-6 flex flex-col items-center text-center lg:hidden">
                      <img
                        src="/logo.png"
                        alt="Dosnine"
                        className="h-10 w-auto"
                      />
                   
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 backdrop-blur sm:p-8">
                      <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                        Welcome back
                      </h2>
                      <p className="mt-1.5 text-sm text-slate-600">
                        Sign in to access your dashboard, listings, and requests.
                      </p>

                      <div className="mt-6 space-y-3">
                        <SignInButton mode="modal">
                          <button
                            type="button"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent/90"
                          >
                            Sign in
                          </button>
                        </SignInButton>

                        <SignUpButton mode="modal">
                          <button
                            type="button"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            Create a free account
                          </button>
                        </SignUpButton>
                      </div>

                      <div className="my-5 flex items-center gap-3">
                        <span className="h-px flex-1 bg-slate-100" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Takes under a minute
                        </span>
                        <span className="h-px flex-1 bg-slate-100" />
                      </div>

                    
                    </div>

                    <p className="mt-4 text-center text-[11px] text-slate-400 lg:text-left">
                      By continuing you agree to our{' '}
                      <a
                        href="/terms-of-service"
                        className="font-semibold text-slate-300 hover:text-white"
                      >
                        Terms
                      </a>{' '}
                      and{' '}
                      <a
                        href="/privacy-policy"
                        className="font-semibold text-slate-300 hover:text-white"
                      >
                        Privacy Policy
                      </a>
                      .
                    </p>
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