import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function NewsletterUnsubscribePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (router.isReady && router.query.email) {
      setEmail(String(router.query.email || ''));
    }
  }, [router.isReady, router.query.email]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unsubscribe failed');
      }
      setMessage(payload.message || 'You have been unsubscribed.');
    } catch (err) {
      setError(err.message || 'Unable to unsubscribe right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Unsubscribe from Dosnine Newsletter</title>
      </Head>
      <main className="min-h-screen bg-gray-50 py-16">
        <div className="mx-auto w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Unsubscribe from Newsletter</h1>
          <p className="text-gray-600 mb-6">
            Enter the email address where you receive Dosnine newsletters and we will remove you from the mailing list.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">Email address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900 focus:border-accent focus:outline-none"
                placeholder="you@example.com"
                required
              />
            </label>

            {message && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">{message}</div>}
            {error && <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">{error}</div>}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center rounded-3xl bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
            >
              {submitting ? 'Processing…' : 'Unsubscribe'}
            </button>
          </form>

          <div className="mt-6 rounded-3xl bg-gray-50 p-4 text-sm text-gray-700">
            <p>If you do not see an immediate confirmation, your request has still been received and will be processed shortly.</p>
          </div>
        </div>
      </main>
    </>
  );
}
