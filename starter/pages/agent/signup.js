import { useUser, SignedOut, SignedIn, SignInButton, SignUpButton } from '@clerk/clerk-react';
import AgentSignup from '@/components/AgentSignup';
import Seo from '@/components/Seo';

export default function AgentSignupPage() {
  const pageUrl = 'https://dosnine.com/agent/signup';
  const ogImage = 'https://dosnine.com/dosnine_preview.png';
  
  return (
    <>
      <Seo
        title="Become a Real Estate Agent | Dosnine Properties"
        description="Join Dosnine as a verified real estate agent. Connect with property seekers, manage listings, and grow your business in Jamaica's leading property platform."
        image={ogImage}
        url={pageUrl}
      />
      <SignedOut>
        <div
          className="flex items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat relative"
          style={{
            backgroundImage: "url('https://etikxypnxjsonefwnzkr.supabase.co/storage/v1/object/public/property-images/avi-waxman-f9qZuKoZYoY-unsplash.jpg')",
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4 text-center border border-white/20">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Sign In Required</h1>
            <p className="text-lg text-gray-600 mb-8">
              Please sign in or sign up to register as an agent on DoSnine.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <SignInButton mode="redirect" redirectUrl="/agent/signup">
                <button className="w-full px-6 py-4 font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transition duration-200 transform hover:scale-105 btn-accent">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="redirect" redirectUrl="/agent/signup">
                <button className="w-full px-6 py-4 font-bold text-lg rounded-lg shadow-md hover:shadow-lg transition duration-200 transform hover:scale-105 btn-accent-outline">
                  Create Account
                </button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <AgentSignup />
      </SignedIn>
    </>
  );
}
