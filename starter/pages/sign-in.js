import Head from 'next/head';
import { SignIn } from '@clerk/nextjs';
import { useRouter } from 'next/router';

export default function SignInPage() {
  const router = useRouter();
  const buyerRequestId = typeof router.query.buyerRequestId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(router.query.buyerRequestId)
    ? router.query.buyerRequestId
    : '';
  const buyerCheckUrl = buyerRequestId
    ? `/my-requests?completeBuyerProfile=${encodeURIComponent(buyerRequestId)}`
    : '/my-requests';
  const signUpUrl = buyerRequestId
    ? `/sign-up?buyerRequestId=${encodeURIComponent(buyerRequestId)}`
    : '/sign-up';

  return (
    <>
      <Head>
        <title>Sign in — Dosnine</title>
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
        <div className="flex justify-center">
          <SignIn afterSignInUrl={buyerCheckUrl} signUpUrl={signUpUrl} />
        </div>
      </main>
    </>
  );
}
