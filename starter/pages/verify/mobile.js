import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function VerifyMobilePage() {
  const router = useRouter();
  const { t: tokenParam } = router.query;

  const [state, setState] = useState('code'); // code | loading | ready | invalid | expired | completed | submitting
  const [session, setSession] = useState(null);
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  /* --- If a token was passed in the URL, load it directly --- */
  useEffect(() => {
    if (!router.isReady) return;
    if (typeof tokenParam !== 'string' || !tokenParam) return;

    (async () => {
      setState('loading');
      try {
        const res = await fetch(
          `/api/verification/sessions/${encodeURIComponent(tokenParam)}`
        );
        const payload = await res.json();

        if (res.status === 410) return setState('expired');
        if (res.status === 404) return setState('invalid');
        if (!res.ok) return setState('invalid');
        if (payload.alreadyCompleted) return setState('completed');

        setSession(payload.session);
        setToken(tokenParam);
        setState('ready');
      } catch (err) {
        console.error('Token load failed:', err);
        setState('invalid');
      }
    })();
  }, [router.isReady, tokenParam]);

  /* --- Code submission --- */
  const submitCode = async (e) => {
    e?.preventDefault?.();
    const digits = code.replace(/\D/g, '');
    if (digits.length !== 6) {
      setError('Enter the full 6-digit code');
      return;
    }

    setError('');
    setState('loading');

    try {
      const res = await fetch('/api/verification/sessions/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: digits }),
      });
      const payload = await res.json();

      if (res.status === 404) {
        setState('code');
        setError(payload.error || 'Invalid or expired code.');
        return;
      }
      if (res.status === 410) return setState('expired');
      if (res.status === 429) {
        setState('code');
        setError(payload.error || 'Too many attempts. Wait a few minutes.');
        return;
      }
      if (!res.ok || !payload.success) {
        setState('code');
        setError(payload.error || 'Could not verify code.');
        return;
      }

      setSession(payload.session);
      setToken(payload.token);
      setState('ready');
    } catch (err) {
      console.error('Redeem failed:', err);
      setState('code');
      setError('Something went wrong. Try again.');
    }
  };

  /* --- Finish on phone --- */
  const finish = async () => {
    setState('submitting');
    try {
      const res = await fetch(
        `/api/verification/sessions/${encodeURIComponent(token)}`,
        { method: 'PATCH' }
      );
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed');
      setState('completed');
    } catch (err) {
      toast.error(err.message || 'Failed to finish');
      setState('ready');
    }
  };

  /* ---------- Render ---------- */

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-[#2373F4]" size={26} />
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <Screen
        icon={<AlertCircle className="text-red-500" size={36} />}
        title="This link is not valid"
        body="Ask the desktop to generate a new code."
      />
    );
  }

  if (state === 'expired') {
    return (
      <Screen
        icon={<AlertCircle className="text-red-500" size={36} />}
        title="This code has expired"
        body="Ask the desktop for a new code."
      />
    );
  }

  if (state === 'completed') {
    return (
      <Screen
        icon={<CheckCircle2 className="text-emerald-600" size={36} />}
        title="Verification complete"
        body="You can close this tab and return to your computer."
      />
    );
  }

  /* --- Code entry --- */
  if (state === 'code') {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2373F4]/10 text-[#2373F4]">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Enter your code
                </p>
                <p className="text-xs text-gray-600">
                  Find the 6-digit code on your computer
                </p>
              </div>
            </div>

            <form onSubmit={submitCode} className="mt-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                value={code}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                  const spaced = digits.replace(/(\d{3})(\d{1,3})/, '$1 $2');
                  setCode(spaced);
                  if (error) setError('');
                }}
                placeholder="123 456"
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-4 text-center font-mono text-2xl font-bold tracking-[0.2em] text-gray-900 outline-none focus:border-[#2373F4] focus:ring-2 focus:ring-[#2373F4]/20"
              />

              {error && (
                <p role="alert" className="mt-2 text-xs font-medium text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={code.replace(/\D/g, '').length !== 6}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2373F4] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                Continue <ArrowRight size={14} />
              </button>
            </form>

            <p className="mt-4 text-center text-[11px] text-gray-500">
              The code expires in 30 minutes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* --- Ready / submitting --- */
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2373F4]/10 text-[#2373F4]">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Continue verification
              </p>
              <p className="text-xs text-gray-600">
                {session?.verification_type} verification
              </p>
            </div>
          </div>

          {/* Replace with your real mobile capture step */}
          <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
            Your mobile verification steps go here.
            <br />
            (ID capture, form fields, etc.)
          </div>

          <button
            type="button"
            onClick={finish}
            disabled={state === 'submitting'}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2373F4] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {state === 'submitting' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : null}
            {state === 'submitting' ? 'Finishing…' : 'Finish on phone'}
          </button>
          <p className="mt-3 text-center text-xs text-gray-500">
            Your desktop will update automatically when you tap Finish.
          </p>
        </div>
      </div>
    </div>
  );
}

/* Small helper for full-screen states */
function Screen({ icon, title, body }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-5 text-center">
      {icon}
      <p className="mt-3 font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-600">{body}</p>
    </div>
  );
}