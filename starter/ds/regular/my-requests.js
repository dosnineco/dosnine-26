import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { useUser } from '@clerk/nextjs';
import BuyerRequestAgentSharing from '@/components/BuyerRequestAgentSharing';
import BuyerReadinessProgress from '@/components/BuyerReadinessProgress';
import { clampBuyerLevel } from '@/lib/buyerReadiness';
import { ArrowRight, FileText } from 'lucide-react';

const fieldClass =
  'w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-accent';

function createEditForm(request) {
  return {
    location: request.location || '',
    budgetMin: request.budget_min ?? '',
    budgetMax: request.budget_max ?? '',
    bedrooms: request.bedrooms ?? '',
    bathrooms: request.bathrooms ?? '',
    description: request.description || '',
    urgency: request.urgency || 'normal',
  };
}

/* ============================================================
 * Circular 4-level indicator
 * Red = no documents, Amber = pending, Green = reviewed
 * ============================================================ */
function LevelCircle({ level, hasDocuments, hasReviewed }) {
  const size = 96;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const segments = 4;
  const segmentLength = circumference / segments;
  const gap = 8;

  const filledColor = hasReviewed
    ? '#10b981'
    : hasDocuments
      ? '#f59e0b'
      : '#ef4444';

  const filled = Math.min(Math.max(level, 0), segments);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {Array.from({ length: segments }).map((_, i) => (
          <circle
            key={`t-${i}`}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={stroke}
            strokeDasharray={`${segmentLength - gap} ${
              circumference - segmentLength + gap
            }`}
            strokeDashoffset={-i * segmentLength}
            strokeLinecap="round"
          />
        ))}
        {Array.from({ length: filled }).map((_, i) => (
          <circle
            key={`f-${i}`}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={filledColor}
            strokeWidth={stroke}
            strokeDasharray={`${segmentLength - gap} ${
              circumference - segmentLength + gap
            }`}
            strokeDashoffset={-i * segmentLength}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold leading-none text-gray-900">
          {level}
        </span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          of 4
        </span>
      </div>
    </div>
  );
}

/* ============================================================
 * Page
 * ============================================================ */
export default function MyRequestsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [requests, setRequests] = useState([]);
  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [editingRequestId, setEditingRequestId] = useState('');
  const [loadError, setLoadError] = useState('');

  const loadRequests = useCallback(async () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/buyer/my-requests', {
        credentials: 'same-origin',
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to load your requests');
      }
      setRequests(payload.requests || []);
      setForms(
        Object.fromEntries(
          (payload.requests || []).map((request) => [
            request.id,
            createEditForm(request),
          ])
        )
      );
    } catch (error) {
      console.error('Loading buyer requests failed:', error);
      setLoadError(error.message || 'Unable to load your requests');
      toast.error(error.message || 'Unable to load your requests');
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const updateField = (requestId, field, value) => {
    setForms((current) => ({
      ...current,
      [requestId]: { ...current[requestId], [field]: value },
    }));
  };

  const saveRequest = async (requestId) => {
    setSaving(requestId);
    try {
      const response = await fetch(`/api/buyer/my-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(forms[requestId]),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to update this request');
      }
      setRequests((current) =>
        current.map((request) =>
          request.id === requestId
            ? { ...request, ...payload.request }
            : request
        )
      );
      setEditingRequestId('');
      toast.success('Request updated');
    } catch (error) {
      toast.error(error.message || 'Unable to update this request');
    } finally {
      setSaving('');
    }
  };

  const openBuyerPrequalification = async (requestId) => {
    try {
      await router.push({
        pathname: '/buyer-prequalification',
        query: { serviceRequestId: requestId },
      });
    } catch (error) {
      console.error('Unable to open buyer financial check:', error);
      toast.error('Unable to open your buyer financial check. Please try again.');
    }
  };

  return (
    <>
      <Head>
        <title>My Requests — Dosnine</title>
        <meta
          name="description"
          content="View and update your property requests."
        />
      </Head>
      <main className="min-h-screen bg-gray-100 px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-5">
          <header className="rounded-2xl bg-white p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Your property journey
            </p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              My requests
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Buying, rental, and other property requests linked to this account
              appear here.
            </p>
            {requests.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
                  {requests.length} request
                  {requests.length === 1 ? '' : 's'}
                </span>
                <span className="rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
                  {
                    requests.filter(
                      (request) =>
                        String(request.request_type).toLowerCase() === 'buy'
                    ).length
                  }{' '}
                  purchase request
                  {requests.filter(
                    (request) =>
                      String(request.request_type).toLowerCase() === 'buy'
                  ).length === 1
                    ? ''
                    : 's'}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
                  {
                    requests.filter((request) =>
                      ['rent', 'lease'].includes(
                        String(request.request_type).toLowerCase()
                      )
                    ).length
                  }{' '}
                  rental request
                  {requests.filter((request) =>
                    ['rent', 'lease'].includes(
                      String(request.request_type).toLowerCase()
                    )
                  ).length === 1
                    ? ''
                    : 's'}
                </span>
              </div>
            )}
          </header>

          {!isLoaded || loading ? (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">
              Loading your requests…
            </div>
          ) : !isSignedIn ? (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-600">
              Sign in to view your requests.
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-600">
              No requests are linked to this account yet.
            </div>
          ) : (
            requests.map((request) => {
              const form = forms[request.id] || createEditForm(request);
              const editable = !['completed', 'cancelled', 'deleted'].includes(
                request.status
              );
              const isEditing = editingRequestId === request.id;
              const isBuyRequest =
                String(request.request_type || '').toLowerCase() === 'buy';
              const buyerLevel = clampBuyerLevel(
                request.buyer_prequalification?.qualification_level
              );

              const documents =
                request.buyer_prequalification?.documents || [];
              const reviewedDocs = documents.filter(
                (document) => document.status === 'reviewed'
              ).length;
              const pendingDocs = documents.filter(
                (document) => document.status === 'pending'
              ).length;
              const hasDocuments = documents.length > 0;
              const hasReviewed = reviewedDocs > 0;
              const isVerified = buyerLevel >= 3;

              return (
                <article
                  key={request.id}
                  className="overflow-hidden rounded-2xl bg-white p-5 sm:p-6"
                >
                  {/* ============ REQUEST HEADER ============ */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold capitalize text-gray-900">
                        {request.request_type} · {request.property_type}
                      </h2>
                      <p className="mt-1 text-xs text-gray-500">
                        Submitted{' '}
                        {new Date(request.created_at).toLocaleDateString()} ·
                        Status: {request.status?.replaceAll('_', ' ')}
                      </p>
                    </div>
                  </div>

                  {/* ============ BUYER VERIFICATION CARD ============ */}
                  {isBuyRequest && (
                    <div className="mt-6 rounded-2xl border border-gray-200 p-6 sm:p-8">
                      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
                        <LevelCircle
                          level={buyerLevel}
                          hasDocuments={hasDocuments}
                          hasReviewed={hasReviewed}
                        />

                        <div className="min-w-0 flex-1 space-y-5">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {isVerified
                                ? "You're a verified buyer"
                                : 'Add documents to get verified'}
                            </h3>
                            <p className="mt-1 text-sm text-gray-600">
                              {isVerified
                                ? 'Sellers and agents see you first.'
                                : 'Prove your budget so sellers take you seriously.'}
                            </p>
                          </div>

                          {!isVerified && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Accepted documents
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <DocPill>Bank statement</DocPill>
                                <DocPill>Job letter</DocPill>
                                <DocPill>Pre-approval letter</DocPill>
                                <DocPill>Proof of deposit</DocPill>
                              </div>
                            </div>
                          )}

                          {hasDocuments && (
                            <p className="text-xs text-gray-600">
                              <span className="font-semibold text-emerald-700">
                                {reviewedDocs} reviewed
                              </span>
                              <span className="mx-1.5 text-gray-300">·</span>
                              <span className="font-semibold text-amber-700">
                                {pendingDocs} pending
                              </span>
                            </p>
                          )}

                          <button
                            type="button"
                            onClick={() => openBuyerPrequalification(request.id)}
                            className="group inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent/90"
                          >
                            {isVerified
                              ? 'Manage documents'
                              : 'Add documents'}
                            <ArrowRight
                              size={15}
                              className="transition group-hover:translate-x-0.5"
                            />
                          </button>
                        </div>
                      </div>

                      <div className="mt-6 border-t border-gray-100 pt-4">
                        <BuyerRequestAgentSharing
                          requestId={request.id}
                          canShare={Boolean(
                            request.buyer_prequalification?.consent_to_share
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* ============ REQUEST DETAILS / EDIT ============ */}
                  {isEditing ? (
                    <>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="text-xs font-medium text-gray-600">
                          Location
                          <input
                            required
                            maxLength={255}
                            value={form.location}
                            onChange={(event) =>
                              updateField(
                                request.id,
                                'location',
                                event.target.value
                              )
                            }
                            className={`${fieldClass} mt-1`}
                          />
                        </label>
                        <label className="text-xs font-medium text-gray-600">
                          Urgency
                          <select
                            value={form.urgency}
                            onChange={(event) =>
                              updateField(
                                request.id,
                                'urgency',
                                event.target.value
                              )
                            }
                            className={`${fieldClass} mt-1`}
                          >
                            {['low', 'normal', 'high', 'urgent'].map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs font-medium text-gray-600">
                          Minimum budget (JMD)
                          <input
                            type="number"
                            min="0"
                            required
                            value={form.budgetMin}
                            onChange={(event) =>
                              updateField(
                                request.id,
                                'budgetMin',
                                event.target.value
                              )
                            }
                            className={`${fieldClass} mt-1`}
                          />
                        </label>
                        <label className="text-xs font-medium text-gray-600">
                          Maximum budget (JMD)
                          <input
                            type="number"
                            min="0"
                            required
                            value={form.budgetMax}
                            onChange={(event) =>
                              updateField(
                                request.id,
                                'budgetMax',
                                event.target.value
                              )
                            }
                            className={`${fieldClass} mt-1`}
                          />
                        </label>
                        <label className="text-xs font-medium text-gray-600">
                          Bedrooms
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={form.bedrooms}
                            onChange={(event) =>
                              updateField(
                                request.id,
                                'bedrooms',
                                event.target.value
                              )
                            }
                            className={`${fieldClass} mt-1`}
                          />
                        </label>
                        <label className="text-xs font-medium text-gray-600">
                          Bathrooms
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={form.bathrooms}
                            onChange={(event) =>
                              updateField(
                                request.id,
                                'bathrooms',
                                event.target.value
                              )
                            }
                            className={`${fieldClass} mt-1`}
                          />
                        </label>
                        <label className="text-xs font-medium text-gray-600 sm:col-span-2">
                          Notes
                          <textarea
                            maxLength={5000}
                            rows={3}
                            value={form.description}
                            onChange={(event) =>
                              updateField(
                                request.id,
                                'description',
                                event.target.value
                              )
                            }
                            className={`${fieldClass} mt-1 resize-y`}
                          />
                        </label>
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={saving === request.id}
                          onClick={() => {
                            setForms((current) => ({
                              ...current,
                              [request.id]: createEditForm(request),
                            }));
                            setEditingRequestId('');
                          }}
                          className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={saving === request.id}
                          onClick={() => saveRequest(request.id)}
                          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
                        >
                          {saving === request.id ? 'Saving…' : 'Save changes'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-medium text-gray-500">
                            Location
                          </dt>
                          <dd className="mt-1 text-sm text-gray-800">
                            {request.location || '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500">
                            Urgency
                          </dt>
                          <dd className="mt-1 text-sm capitalize text-gray-800">
                            {request.urgency || 'normal'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500">
                            Minimum budget (JMD)
                          </dt>
                          <dd className="mt-1 text-sm text-gray-800">
                            {request.budget_min == null
                              ? '—'
                              : Number(request.budget_min).toLocaleString()}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500">
                            Maximum budget (JMD)
                          </dt>
                          <dd className="mt-1 text-sm text-gray-800">
                            {request.budget_max == null
                              ? '—'
                              : Number(request.budget_max).toLocaleString()}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500">
                            Bedrooms
                          </dt>
                          <dd className="mt-1 text-sm text-gray-800">
                            {request.bedrooms ?? '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500">
                            Bathrooms
                          </dt>
                          <dd className="mt-1 text-sm text-gray-800">
                            {request.bathrooms ?? '—'}
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-xs font-medium text-gray-500">
                            Notes
                          </dt>
                          <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                            {request.description || '—'}
                          </dd>
                        </div>
                      </dl>
                      {editable && (
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setForms((current) => ({
                                ...current,
                                [request.id]: createEditForm(request),
                              }));
                              setEditingRequestId(request.id);
                            }}
                            className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                          >
                            Edit request
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </article>
              );
            })
          )}

          {loadError && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >
              Your requests could not be loaded: {loadError}
            </div>
          )}
        </div>
      </main>

    </>
  );
}

/* ============================================================
 * Small component: document type pill
 * ============================================================ */
function DocPill({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700">
      <FileText size={11} className="text-gray-400" />
      {children}
    </span>
  );
}