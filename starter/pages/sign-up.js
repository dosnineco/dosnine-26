import Head from 'next/head';
import { SignUp } from '@clerk/nextjs';
import { useRouter } from 'next/router';

export default function SignUpPage() {
  const router = useRouter();
  const buyerRequestId = typeof router.query.buyerRequestId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(router.query.buyerRequestId)
    ? router.query.buyerRequestId
    : '';
  const buyerCheckUrl = buyerRequestId
    ? `/my-requests?completeBuyerProfile=${encodeURIComponent(buyerRequestId)}`
    : '/my-requests';
  const signInUrl = buyerRequestId
    ? `/sign-in?buyerRequestId=${encodeURIComponent(buyerRequestId)}`
    : '/sign-in';

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
            <SignUp afterSignUpUrl={buyerCheckUrl} signInUrl={signInUrl} />
          </div>
        </div>
      </main>
    </>
  );
}
