import { useEffect, useState } from 'react';
import { Check, Copy, Loader2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import BankTransferNotes from './BankTransferNotes';

const bankDetails = [
  {
    bank: 'Scotiabank Jamaica',
    accountName: 'Dosnine Limited',
    accountNumber: '000991881',
    branch: '50575',
    accountType: 'Business Savings',
  },
];

export default function BankTransferPaymentPanel({
  amount,
  currency = 'JMD',
  reference,
  receipt,
  onSubmit,
  description = 'Transfer the amount below and upload your receipt.',
}) {
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState('');
  const [localPreview, setLocalPreview] = useState('');

  useEffect(() => {
    if (!file) {
      setLocalPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const copyToClipboard = async (value, key) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
    } catch (error) {
      console.error('Unable to copy bank transfer detail:', error);
      toast.error('Unable to copy this detail.');
    }
  };

  const submit = async () => {
    if (!file) return toast.error('Choose a receipt image first.');
    if (!onSubmit) return toast.error('Receipt upload is not available for this payment.');
    setSubmitting(true);
    try {
      await onSubmit(file);
      setFile(null);
    } catch (error) {
      toast.error(error?.message || 'Unable to submit payment receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatAmount = () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) return '—';
    return currency === 'USD'
      ? `US$${numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `J$${numericAmount.toLocaleString('en-JM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const previewUrl = file ? localPreview : receipt?.url;
  const receiptLocked = ['pending', 'approved'].includes(receipt?.status);

  return (
    <div className="mb-10 rounded-lg border-l-4 border-accent bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Payment Required</h3>
          <p className="text-gray-600">{description}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Due</p>
          <p className="text-3xl font-bold text-accent">{formatAmount()}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          {bankDetails.map((bank, index) => (
            <div key={bank.bank} className="rounded bg-gray-50 p-4">
              <h4 className="mb-3 font-bold">{bank.bank}</h4>
              {Object.entries(bank).filter(([key]) => key !== 'bank').map(([key, value]) => {
                const copyKey = `${index}-${key}`;
                return (
                  <div key={key} className="mb-2 flex justify-between gap-3 text-sm">
                    <span className="capitalize text-gray-600">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono font-medium">{value}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(value, copyKey)}
                        aria-label={`Copy ${key}`}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-accent/10 p-3 text-accent transition hover:bg-accent/20"
                      >
                        {copied === copyKey ? <Check size={19} /> : <Copy size={19} />}
                      </button>
                    </span>
                  </div>
                );
              })}
              <BankTransferNotes reference={reference} />
            </div>
          ))}
          <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-900">
            Add the User ID shown below Account Type to your bank transfer notes, then upload your receipt.
          </div>
        </div>

        <div className="flex flex-col justify-between">
          {receipt ? (
            <div className={`mb-4 rounded-lg p-4 text-sm ${
              receipt.status === 'rejected' ? 'bg-red-50 text-red-900'
                : receipt.status === 'approved' ? 'bg-emerald-50 text-emerald-900'
                  : 'bg-yellow-50 text-yellow-900'
            }`}>
              <p className="font-semibold capitalize">Receipt {receipt.status || 'submitted'}</p>
              {receipt.submittedAt ? <p className="mt-1">{new Date(receipt.submittedAt).toLocaleString()}</p> : null}
              {receipt.status === 'rejected' ? <p className="mt-1">Upload a corrected receipt to try again.</p> : null}
            </div>
          ) : null}
          <label className="mb-3 block text-sm font-semibold text-gray-700">
            Transfer receipt
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const selected = event.target.files?.[0] || null;
                if (selected && !['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
                  toast.error('Choose a JPG, PNG, or WebP receipt image.');
                  event.target.value = '';
                  setFile(null);
                } else if (selected && selected.size > 5 * 1024 * 1024) {
                  toast.error('Receipt image must be 5 MB or smaller.');
                  event.target.value = '';
                  setFile(null);
                } else {
                  setFile(selected);
                }
              }}
              className="mt-2 block w-full rounded-lg bg-white px-3 py-2 text-sm"
              disabled={submitting || receiptLocked}
            />
          </label>
          {previewUrl ? (
            <a href={previewUrl} target="_blank" rel="noreferrer" className="mb-4 block">
              <img src={previewUrl} alt="Payment receipt preview" className="max-h-56 rounded-lg object-contain" />
            </a>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={!file || submitting || receiptLocked}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            {submitting
              ? 'Submitting receipt...'
              : receipt?.status === 'pending'
                ? 'Receipt awaiting review'
                : receipt?.status === 'approved'
                  ? 'Payment verified'
                  : 'Submit payment receipt'}
          </button>
        </div>
      </div>
    </div>
  );
}
