'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  Smartphone,
  X,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  Mail,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const PHONE_URL =
  (typeof window !== 'undefined' ? window.location.origin : '') +
  '/verify/mobile';

export default function ContinueOnPhone({
  verificationType,
  contextId,
  metadata,
  onComplete,
}) {
  const { getToken, isLoaded: authLoaded, isSignedIn } = useAuth();
  const [session, setSession] = useState(null);
  const [opening, setOpening] = useState(false);
  const [status, setStatus] = useState('idle');
  const [copied, setCopied] = useState(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState(null);
  const [emailError, setEmailError] = useState(null);
  const channelRef = useRef(null);

  /* ---------------- Start session ---------------- */
  const startSession = async () => {
    if (!authLoaded) return;
    if (!isSignedIn) {
      toast.error('Please sign in first');
      return;
    }

    setOpening(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired — please sign in again.');

      const res = await fetch('/api/verification/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ verificationType, contextId, metadata }),
      });

      const text = await res.text();
      let payload = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          res.status === 401
            ? 'Not signed in — please refresh and try again.'
            : `Request failed (${res.status}).`
        );
      }

      if (!res.ok || !payload.success) {
        throw new Error(payload.error || `Request failed (${res.status})`);
      }

      setSession(payload);
      setStatus('pending');
    } catch (err) {
      console.error('[ContinueOnPhone] startSession:', err);
      if (/401|not signed in|expired/i.test(err.message)) {
        toast.error('Please sign in again');
        setTimeout(() => window.location.reload(), 800);
        return;
      }
      toast.error(err.message || 'Could not start session');
    } finally {
      setOpening(false);
    }
  };

  /* ---------------- Realtime subscription ---------------- */
  useEffect(() => {
    if (!session?.sessionId) return;

    const channel = supabase
      .channel(`verification-${session.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'verification_sessions',
          filter: `id=eq.${session.sessionId}`,
        },
        (payload) => {
          const next = payload.new.status;
          setStatus(next);
          if (next === 'mobile_opened') {
            toast.success('Phone connected — finish verification there.');
          }
          if (next === 'completed') {
            toast.success('Verification complete!');
            onComplete?.(payload.new);
          }
          if (next === 'expired' || next === 'cancelled') {
            toast.error('Code expired or cancelled.');
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.sessionId, onComplete]);

  /* ---------------- Expiry timer ---------------- */
  useEffect(() => {
    if (!session?.expiresAt) return;
    const ms = new Date(session.expiresAt).getTime() - Date.now();
    if (ms <= 0) {
      setStatus('expired');
      return;
    }
    const t = setTimeout(() => setStatus('expired'), ms);
    return () => clearTimeout(t);
  }, [session?.expiresAt]);

  /* ---------------- Actions ---------------- */
  const cancel = async () => {
    if (!session?.token) return;
    await fetch(`/api/verification/sessions/${session.token}`, {
      method: 'DELETE',
    });
    setSession(null);
    setStatus('idle');
    setSentTo(null);
    setEmailError(null);
  };

  const copy = async (kind, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      toast.success(kind === 'code' ? 'Code copied' : 'Link copied');
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  const sendEmail = async () => {
    if (!session?.token) return;
    setSending(true);
    setEmailError(null);
    try {
      const bearer = await getToken();
      if (!bearer) throw new Error('Session expired — please sign in again.');

      const res = await fetch(
        `/api/verification/sessions/${session.token}/send-email`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${bearer}`,
          },
          credentials: 'include',
        }
      );
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.error || `Request failed (${res.status})`);
      }
      setSentTo(payload.sentTo);
      toast.success('Code emailed');
    } catch (err) {
      console.error('[ContinueOnPhone] sendEmail:', err);
      setEmailError(err.message || 'Could not send email');
      toast.error(err.message || 'Could not send email');
    } finally {
      setSending(false);
    }
  };

  /* ---------------- UI ---------------- */

  if (!session) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2373F4]/10 text-[#2373F4]">
            <Smartphone size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">
              Complete verification on your phone
            </p>
            <p className="mt-1 text-xs text-gray-600">
              We'll show a short code. Open Dosnine on your phone, enter the
              code, and this page will update automatically when you finish.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={startSession}
          disabled={opening || !authLoaded || !isSignedIn}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2373F4] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {opening ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Smartphone size={14} />
          )}
          {opening
            ? 'Preparing…'
            : !isSignedIn
              ? 'Sign in to continue'
              : 'Continue on phone'}
        </button>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <CheckCircle2 className="mx-auto text-emerald-600" size={36} />
        <p className="mt-3 text-sm font-semibold text-emerald-900">
          Verification complete
        </p>
        <p className="mt-1 text-xs text-emerald-800">
          This page will update in a moment.
        </p>
      </div>
    );
  }

  const displayCode = String(session.shortCode || '').replace(
    /(\d{3})(\d{3})/,
    '$1 $2'
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Enter this code on your phone
          </p>
          <p className="mt-1 text-xs text-gray-600">
            {status === 'mobile_opened'
              ? 'Phone connected. Finish verification on your phone — this page updates automatically.'
              : 'Open Dosnine on your phone and enter the code below.'}
          </p>
        </div>
        <button
          type="button"
          onClick={cancel}
          className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          aria-label="Cancel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Big code */}
      <div className="mt-4 flex flex-col items-center gap-3">
        <div className="w-full max-w-sm rounded-2xl border border-[#2373F4]/20 bg-[#2373F4]/5 px-6 py-5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2373F4]">
            Your code
          </p>
          <p className="mt-2 font-mono text-4xl font-bold tracking-[0.15em] text-gray-900 sm:text-5xl">
            {displayCode || '------'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => copy('code', session.shortCode)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          {copied === 'code' ? (
            <Check size={12} className="text-emerald-600" />
          ) : (
            <Copy size={12} />
          )}
          Copy code
        </button>
      </div>

      {/* URL */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Then go to
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate font-mono text-xs font-semibold text-gray-900">
            {PHONE_URL}
          </p>
          <button
            type="button"
            onClick={() => copy('url', PHONE_URL)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[10px] font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
          >
            {copied === 'url' ? (
              <Check size={10} className="text-emerald-600" />
            ) : (
              <Copy size={10} />
            )}
            Copy link
          </button>
        </div>
      </div>

      {/* Email option */}
      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900">
              Send the code to your email
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              {sentTo
                ? `Sent to ${sentTo}. Check your inbox — then tap the link or enter the code.`
                : 'We’ll email it to the address on your Dosnine account.'}
            </p>
          </div>
          <button
            type="button"
            onClick={sendEmail}
            disabled={sending}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {sending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Mail size={13} />
            )}
            {sending ? 'Sending…' : sentTo ? 'Resend' : 'Email me'}
          </button>
        </div>
        {emailError && (
          <p role="alert" className="mt-2 text-[11px] font-medium text-red-600">
            {emailError}
          </p>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] text-gray-500">
        Expires{' '}
        {new Date(session.expiresAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>

      <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-gray-50 py-2.5 text-xs font-medium text-gray-700">
        {status === 'mobile_opened' ? (
          <>
            <Loader2 size={12} className="animate-spin text-[#2373F4]" />
            Waiting for you to finish on your phone…
          </>
        ) : (
          <>
            <Loader2 size={12} className="animate-spin text-gray-400" />
            Waiting for your phone to connect…
          </>
        )}
      </div>
    </div>
  );
}