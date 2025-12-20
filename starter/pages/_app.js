import { useRouter } from 'next/router';
import { ClerkProvider, SignedIn, SignedOut, SignInButton, SignUpButton, useUser } from '@clerk/nextjs';
import '../styles/globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BoostedPropertyBanner from '../components/BoostedPropertyBanner';
import VisitorEmailPopup from '../components/VisitorEmailPopup';
import Seo from '../components/Seo';
import SiteProtection from '../components/SiteProtection';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Toaster } from 'react-hot-toast';
import { useAnalyticsTracking } from '../lib/useAnalyticsTracking';
import Clarity from '@microsoft/clarity';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  
  // Public routes that don't require sign-in
  const publicRoutes = ['/', '/property', '/tools', '/blog', '/contact', '/privacy-policy', '/terms-of-service', '/refund-policy', '/about'];
  const isPublicRoute = publicRoutes.some(
    (route) => router.pathname === route || router.pathname.startsWith(`${route}/`)
  );

  return (
    <ClerkProvider>
      <AppContent Component={Component} pageProps={pageProps} isPublicRoute={isPublicRoute} />
    </ClerkProvider>
  );
}
function AppContent({ Component, pageProps, isPublicRoute }) {
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  
  // Initialize analytics tracking on all pages
  useAnalyticsTracking();

  // Initialize Microsoft Clarity
  useEffect(() => {
    if (typeof window !== 'undefined') {
      Clarity.init('ujn9fzt88c');
    }
  }, []);

  // Handle redirect after sign-in
  useEffect(() => {
    if (isSignedIn) {
      const redirectPath = sessionStorage.getItem('redirectAfterSignIn');
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterSignIn');
        router.push(redirectPath);
      }
    }
  }, [isSignedIn, router]);

  // Sync Clerk user to Supabase
  useEffect(() => {
    const syncUser = async () => {
      if (!isSignedIn || !user) return;

      const email = user.emailAddresses?.[0]?.emailAddress;
      if (!user.id || !email) return;

      try {
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, role')
          .eq('clerk_id', user.id)
          .single();

        if (existingUser) {
          // User exists, only update email and name (preserve role)
          await supabase
            .from('users')
            .update({
              email,
              full_name: user.username || '',
            })
            .eq('clerk_id', user.id);
        } else {
          // New user, create with default role
          await supabase.from('users').insert({
            clerk_id: user.id,
            email,
            full_name: user.username || '',
            role: 'renter',
          });
        }
      } catch (err) {
        console.error('Unexpected error syncing user:', err);
      }
    };

    syncUser();
  }, [isSignedIn, user]);

  return (
    <>
      <Seo />
      <SiteProtection />
      <VisitorEmailPopup/>
      <Toaster position="top-center" />
      <Header />
      {/* Show boost banner on all pages */}
      <BoostedPropertyBanner />
        {/* Show visitor email capture popup on all pages */}
        {/* <VisitorEmailPopup /> */}
      
      {isPublicRoute ? (
        <main className="min-h-screen">
          <Component {...pageProps} />
        </main>
      ) : (
        <SignedIn>
          <main className="min-h-screen">
            <Component {...pageProps} />
          </main>
        </SignedIn>
      )}

      {!isPublicRoute && (
        <SignedOut>
          <div 
            className="flex items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat relative"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop')"
            }}
          >
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-50"></div>
            
            {/* Login card */}
            <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center border border-white/20">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Dosnine Properties</h1>
              <p className="text-lg text-gray-600 mb-8">Sign in to access your dashboard and manage properties.</p>
              <div className="flex flex-col space-y-4">
                <SignInButton>
                  <button className="w-full px-6 py-3 font-bold rounded-lg shadow-lg hover:shadow-xl transition duration-200 transform hover:scale-105 btn-accent">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button className="w-full px-6 py-3 font-bold rounded-lg shadow-md hover:shadow-lg transition duration-200 transform hover:scale-105 btn-accent-outline">
                    Sign Up
                  </button>
                </SignUpButton>
              </div>
            </div>
          </div>
        </SignedOut>
      )}
      <Footer />
    </>
  );
}

export default MyApp;
