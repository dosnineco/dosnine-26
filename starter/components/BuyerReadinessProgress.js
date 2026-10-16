import { ShieldCheck } from 'lucide-react';
import { clampBuyerLevel } from '../lib/buyerReadiness';

const BUYER_LEVELS = [
  { number: 1, label: 'Registered', hint: 'No documents yet' },
  { number: 2, label: 'Documents submitted', hint: 'Waiting for review' },
  { number: 3, label: 'Verified', hint: 'Evidence checked' },
  { number: 4, label: 'Financing confirmed', hint: 'Lender evidence verified' },
];

export default function BuyerReadinessProgress({ prequalification }) {
  const level = clampBuyerLevel(prequalification?.qualification_level);
  const current = BUYER_LEVELS[level - 1];
  const documents = Array.isArray(prequalification?.documents)
    ? prequalification.documents
    : [];
  const pendingDocuments = documents.filter((document) => document.status === 'pending').length;
  const expiresAt = prequalification?.verification_expires_at
    ? new Date(prequalification.verification_expires_at).getTime()
    : NaN;
  const expiresInDays = Number.isFinite(expiresAt)
    ? Math.ceil((expiresAt - Date.now()) / 86_400_000)
    : null;
  const expired = expiresInDays !== null && expiresInDays <= 0;
  const expiringSoon = expiresInDays !== null && expiresInDays > 0 && expiresInDays <= 14;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-700">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" />
          Buyer verification
        </span>
        <span className="text-xs font-semibold text-gray-600">Level {level} of 4</span>
      </div>
      <div
        className="mt-2.5 flex gap-1.5"
        role="progressbar"
        aria-label="Buyer verification progress"
        aria-valuemin={1}
        aria-valuemax={4}
        aria-valuenow={level}
      >
        {BUYER_LEVELS.map((step) => (
          <div
            key={step.number}
            className={`h-1.5 flex-1 rounded-full ${
              step.number < level
                ? 'bg-emerald-500'
                : step.number === level
                  ? 'bg-accent'
                  : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">
          {current.label}
          <span className="ml-1.5 font-normal text-gray-500">· {current.hint}</span>
        </p>
        {documents.length > 0 && (
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600">
            {documents.length} file{documents.length === 1 ? '' : 's'}
            {pendingDocuments > 0 ? ` · ${pendingDocuments} pending` : ''}
          </span>
        )}
      </div>
      {(expired || expiringSoon) && (
        <p className={`mt-2 rounded-md px-2 py-1 text-[11px] font-semibold ${
          expired ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
        }`}>
          {expired
            ? 'Verification expired — upload current documents.'
            : `Verification expires in ${expiresInDays} day${expiresInDays === 1 ? '' : 's'}.`}
        </p>
      )}
    </div>
  );
}
