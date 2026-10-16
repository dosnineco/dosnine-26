import Head from 'next/head';
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <>
      <Head>
        <title>Create a free account — Dosnine</title>
        <meta
          name="description"
          content="Create a free Dosnine account to track your property request and buyer readiness."
        />
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Create your free account</h1>
            <p className="mt-2 text-sm text-gray-700">
              Access your dashboard, track request updates, and complete your buyer readiness profile at no cost.
            </p>
          </div>
          <div className="flex justify-center">
            <SignUp afterSignUpUrl="/my-requests" signInUrl="/sign-in" />
          </div>
        </div>
      </main>
    </>
  );
}
