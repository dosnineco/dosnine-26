import { useUser, SignedOut, SignedIn } from '@clerk/nextjs';
import UserRoleSelection from '@/components/UserRoleSelection';
import Link from 'next/link';

export default function OnboardingPage() {
  return (
    <>
      <SignedOut>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 flex items-center">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Welcome to DoSnine</h1>
            <p className="text-gray-600 mb-6">
              Sign in to get started with property search, listing, or agent services.
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
        <UserRoleSelection />
      </SignedIn>
    </>
  );
}
