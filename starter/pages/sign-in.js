import Head from 'next/head';
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <>
      <Head>
        <title>Sign in — Dosnine</title>
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
        <div className="flex justify-center">
          <SignIn afterSignInUrl="/my-requests" signUpUrl="/sign-up" />
        </div>
      </main>
    </>
  );
}
