import { useUser, SignedOut, SignedIn } from '@clerk/nextjs';
import AgentSignup from '@/components/AgentSignup';
import Link from 'next/link';
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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 flex items-center">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Sign In Required</h1>
            <p className="text-gray-600 mb-6">
              Please sign in to register as an agent on DoSnine.
            </p>
            <Link
              href="/sign-in"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded font-semibold transition inline-block"
            >
              Sign In / Create Account
            </Link>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <AgentSignup />
      </SignedIn>
    </>
  );
}
