import { useRouter } from 'next/router';
import { ClerkProvider, SignedIn, SignedOut, SignInButton, SignUpButton, useUser } from '@clerk/nextjs';
import '../styles/globals.css';
import Layout from '../components/Misc/Layout';
import Header from '../components/Headers/Header';
import Footer from '../components/Footers/Footer';
import PageViewTracker from '../components/Misc/PageViewTracker';
import BreadcrumbsMinimal from '../components/BreadCrumbs/BreadcrumbsWithIcons';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Ensure this is correctly configured
import QuickExpense from '../components/Misc/QuickExpense';
import Script from 'next/script';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const publicRoutes = ['/','/demo', '/tools', '/refund-policy', '/privacy-policy','/pro','pro', '/about', '/terms-of-service', '/checkout','/test'];
  // const isPublicRoute = publicRoutes.some((route) =>
  //   router.pathname === route || router.pathname.startsWith(`${route}/`)
  // );


  const isMarkdownPage = router.pathname.startsWith('/blog');

const isPublicRoute = isMarkdownPage || publicRoutes.some((route) =>
  router.pathname === route || router.pathname.startsWith(`${route}/`)
);
  const isHomePage = router.pathname === '/';

  return (
    <ClerkProvider {...pageProps}>
      {process.env.NODE_ENV === 'production' && (
      <PageViewTracker />
       
      )}

      {process.env.NODE_ENV === 'production' && (
              <Script
                id="clarity-script"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                  __html: `(function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i+"?ref=bwt";
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                  })(window, document, "clarity", "script", "soyei8vchm");`,
                }}
              />
            )}
      <AppContent
        Component={Component}
        pageProps={pageProps}
        isPublicRoute={isPublicRoute}
        isMarkdownPage={isMarkdownPage}
        isHomePage={isHomePage}
      />
    </ClerkProvider>
  );
}

function AppContent({ Component,isMarkdownPage, pageProps, isPublicRoute, isHomePage }) {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    const addUserToDatabase = async () => {
      if (!isSignedIn || !user) {
        console.log("User not signed in or user object not ready");
        return;
      }
      console.log("Clerk user object:", user);

      const { emailAddresses, fullName } = user;
      const email = emailAddresses?.[0]?.emailAddress;

      if (!user.id || !email) {
        console.log("Missing clerkId or email", { email, emailAddresses });
        return;
      }

      try {
        // Remove referrer field, only upsert columns that exist in your table
        const { error: upsertError } = await supabase
          .from('users')
          .upsert(
            {
              clerk_id: user.id,
              email,
              full_name: fullName,
              trial_start_date: new Date().toISOString(),
              is_trial_active: true,
            },
            { onConflict: 'clerk_id' }
          );

        if (upsertError) {
          console.error('Error upserting user:', upsertError);
        } else {
          console.log('User upserted to database');
        }
      } catch (err) {
        console.error('Unexpected error adding user:', err);
      }
    };

    addUserToDatabase();
  }, [isSignedIn, user]);

  return (
    <>

    {isMarkdownPage ? (
  <>
    <Header />
    <Layout className="container mx-auto px-4 py-8">
      <Component {...pageProps} />
    </Layout>
    <Footer />
  </>
) : isPublicRoute ? (
  <>
    <Header />
    <Layout className="container mx-auto px-4 py-8">
      <Component {...pageProps} />
    </Layout>
    <Footer />
  </>
) : (
  <SignedIn>
          <Header />
          <Layout className="container mx-auto px-4 py-8">
            {/* {!isHomePage && <BreadcrumbsMinimal />} */}
            <Component {...pageProps} />
          </Layout>
          <QuickExpense />
          <Footer />
        </SignedIn>
)}



      {!isPublicRoute && (
        <SignedOut>
          <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
            <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
              <div className="mb-6">
                <img
                  src="/icon.png"
                  alt="Expense Goose Logo"
                  className="mx-auto h-16 w-16"
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Expense Goose</h1>
              <p className="text-lg text-gray-600 mb-6">Sign in or create an account to manage your expenses effortlessly.</p>
              <div className="flex flex-col space-y-4">
                <SignInButton>
                  <button className="w-full px-6 py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition duration-200">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button className="w-full px-6 py-3 font-bold text-blue-600 bg-white border border-blue-600 hover:bg-blue-50 rounded-lg shadow-md transition duration-200">
                    Sign Up
                  </button>
                </SignUpButton>
              </div>
              <p className="mt-6 text-sm text-gray-500">
                By signing in, you agree to our{' '}
                <a href="/terms-of-service" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy-policy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>.
              </p>
            </div>
          </div>
        </SignedOut>
      )}
    </>
  );
}

export default MyApp;