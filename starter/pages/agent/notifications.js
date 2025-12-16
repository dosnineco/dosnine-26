import { useUser, SignedOut, SignedIn } from '@clerk/nextjs';
import AgentNotificationCenter from '@/components/AgentNotificationCenter';
import Link from 'next/link';

export default function AgentNotificationsPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SignedOut>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 flex items-center">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Sign In Required</h1>
            <p className="text-gray-600 mb-6">
              Please sign in to view your service requests.
            </p>
            <Link
              href="/sign-in"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded font-semibold transition inline-block"
            >
              Sign In
            </Link>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <AgentNotificationCenter />
      </SignedIn>
    </>
  );
}
