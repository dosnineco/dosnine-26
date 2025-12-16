import { useUser, SignedOut, SignedIn } from '@clerk/nextjs';
import PremiumServiceRequest from '@/components/PremiumServiceRequest';
import Link from 'next/link';

export default function ServiceRequestPage() {
  return (
    <>
      <SignedOut>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 flex items-center">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Sign In Required</h1>
            <p className="text-gray-600 mb-6">
              Please sign in to request a service from one of our verified agents.
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
        <PremiumServiceRequest />
      </SignedIn>
    </>
  );
}
