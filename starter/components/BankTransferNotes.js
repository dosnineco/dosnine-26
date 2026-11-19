import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BankTransferNotes({ reference }) {
  const [payerReference, setPayerReference] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const loadReference = useCallback(async () => {
    setLoading(true);
    setError('');
    setPayerReference('');
    try {
      const response = await fetch('/api/payments/reference', {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success || !payload?.payerReference) {
        throw new Error(payload?.error || 'Unable to load your payment reference.');
      }
      setPayerReference(payload.payerReference);
    } catch (loadError) {
      console.error('Unable to load payment reference:', loadError);
      setError(loadError.message || 'Unable to load your payment reference.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReference();
  }, [loadReference]);

  const copyUserId = async () => {
    if (!payerReference) return;
    try {
      await navigator.clipboard.writeText(payerReference);
      setCopied(true);
      toast.success('User ID copied.');
      window.setTimeout(() => setCopied(false), 1800);
    } catch (copyError) {
      console.error('Unable to copy payment user ID:', copyError);
      toast.error('Unable to copy the user ID.');
    }
  };

  return (
    <div className="mt-3 border-t border-gray-200 pt-3 text-sm text-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            User ID — add this to transfer notes
          </p>
          {loading ? (
            <p className="mt-1 inline-flex items-center gap-2 text-sm text-gray-600">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </p>
          ) : payerReference ? (
            <code className="mt-1 block font-mono text-lg font-bold tracking-wider text-gray-900">
              {payerReference}
            </code>
          ) : (
            <p className="mt-1 text-sm text-gray-600">Use the payment reference shown below.</p>
          )}
          {reference ? (
            <p className="mt-1 break-all text-xs text-gray-600">Payment reference: {reference}</p>
          ) : null}
        </div>
        {payerReference ? (
          <button
            type="button"
            onClick={copyUserId}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
            aria-label={`Copy user ID ${payerReference}`}
          >
            {copied ? <Check size={19} /> : <Copy size={19} />}
            {copied ? 'Copied' : 'Copy ID'}
          </button>
        ) : null}
      </div>
      {error ? (
        <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-red-700">
          <span>{error} Please retry before making the transfer.</span>
          <button
            type="button"
            onClick={loadReference}
            className="min-h-11 rounded-lg bg-white px-4 py-2 font-semibold text-accent ring-1 ring-accent/30 hover:bg-accent/5"
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
