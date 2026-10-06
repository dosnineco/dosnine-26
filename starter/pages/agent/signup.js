import { SignedOut, SignedIn, SignInButton, SignUpButton } from '@clerk/clerk-react';
import AgentSignup from '@/components/AgentSignup';
import Seo from '@/components/Seo';

export default function AgentSignupPage() {
  const pageUrl = 'https://dosnine.com/agent/signup';
  const ogImage = 'https://dosnine.com/dosnine_preview.png';

  return (
    <>
      <Seo
        title="Become a Real Estate Agent | Dosnine Limited"
        description="Join Dosnine as a verified real estate agent. Connect with property seekers, manage listings, and grow your business in Jamaica's leading property platform."
        image={ogImage}
        url={pageUrl}
      />

      <SignedOut>
        <div
          className="relative flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat px-5 py-10 sm:px-6"
          style={{
            backgroundImage:
              "url('https://etikxypnxjsonefwnzkr.supabase.co/storage/v1/object/public/property-images/avi-waxman-f9qZuKoZYoY-unsplash.jpg')",
          }}
        >
          {/* Legibility overlay */}
          <div className="absolute inset-0 bg-slate-900/60" aria-hidden="true" />

          {/* Card */}
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 p-6 backdrop-blur sm:p-8">
            <div className="flex flex-col items-center text-center">
              <img
                src="/logo.png"
                alt="Dosnine"
                className="h-10 w-auto sm:h-12"
              />

              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                Agent Registration
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Sign in required
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                Please sign in or create an account to register as an agent on
                Dosnine.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <SignInButton mode="redirect" redirectUrl="/agent/signup">
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent/90"
                >
                  Sign in
                </button>
              </SignInButton>

              <SignUpButton mode="redirect" redirectUrl="/agent/signup">
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Create account
                </button>
              </SignUpButton>
            </div>

            <p className="mt-5 text-center text-xs text-slate-500">
              Verified agents get priority placement and access to paid plans.
            </p>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <AgentSignup />
      </SignedIn>
    </>
  );
}