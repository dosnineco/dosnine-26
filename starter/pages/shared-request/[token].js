import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ExternalLink, FileText, MapPin } from 'lucide-react';

export default function SharedBuyerRequestPage() {
  const router = useRouter();
  const { token } = router.query;
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady || typeof token !== 'string') return;
    let cancelled = false;

    async function loadRequest() {
      setLoading(true);
      try {
        const response = await fetch(`/api/shared-request/${encodeURIComponent(token)}`, {
          credentials: 'omit',
          cache: 'no-store',
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'Unable to load the shared request');
        }
        if (!cancelled) setRequest(payload.request);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Unable to load the shared request');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRequest();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, token]);

  const assessment = request?.buyer_prequalification;

  return (
    <>
      <Head>
        <title>Shared buyer request — Dosnine</title>
        <meta name="referrer" content="no-referrer" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main className="min-h-screen bg-gray-100 px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-4">
          <header className="rounded-2xl bg-white p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Dosnine · private share</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Buyer request shared with you</h1>
            <p className="mt-2 text-sm text-gray-600">
              This link gives view-only access to the request and documents. It expires after seven days.
            </p>
          </header>

          {loading ? (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">Loading shared request…</div>
          ) : error ? (
            <div role="alert" className="rounded-xl bg-white p-8 text-center text-sm text-red-700">{error}</div>
          ) : request && assessment ? (
            <article className="rounded-2xl bg-white p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold capitalize text-gray-900">
                    Buy · {request.property_type || 'Property'}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">{assessment.buyer_name || 'Buyer'}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold uppercase text-blue-800">
                  View only
                </span>
              </div>

              <p className="mt-4 flex items-center gap-2 text-sm text-gray-700">
                <MapPin size={16} className="text-gray-400" />
                {request.location || 'Location not provided'}
              </p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-gray-50 p-3">
                  <dt className="text-xs text-gray-500">Budget</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-800">
                    {request.budget_min ?? '—'} – {request.budget_max ?? '—'}
                  </dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <dt className="text-xs text-gray-500">Readiness</dt>
                  <dd className="mt-1 text-sm font-medium capitalize text-gray-800">
                    {assessment.status?.replaceAll('_', ' ') || 'Not provided'} · Level {assessment.qualification_level || '—'}
                  </dd>
                </div>
                {assessment.financing_progress && (
                  <div className="rounded-lg bg-gray-50 p-3">
                    <dt className="text-xs text-gray-500">Financing progress</dt>
                    <dd className="mt-1 text-sm font-medium capitalize text-gray-800">
                      {assessment.financing_progress.replaceAll('_', ' ')}
                    </dd>
                  </div>
                )}
                {request.description && (
                  <div className="rounded-lg bg-gray-50 p-3 sm:col-span-2">
                    <dt className="text-xs text-gray-500">Request details</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{request.description}</dd>
                  </div>
                )}
              </dl>

              <section className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900">
                  Supporting documents ({assessment.documents.length})
                </h3>
                {assessment.documents.length ? (
                  <ul className="mt-3 space-y-2">
                    {assessment.documents.map((document) => (
                      <li key={document.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                        <FileText size={16} className="shrink-0 text-gray-500" />
                        <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{document.file_name}</span>
                        <span className="text-xs text-gray-500">{document.status}</span>
                        <a
                          href={`/api/shared-request/${encodeURIComponent(token)}/documents/${encodeURIComponent(document.id)}`}
                          target="_blank"
                          rel="noreferrer"
                          referrerPolicy="no-referrer"
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:text-accent"
                        >
                          <ExternalLink size={14} /> Open
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">No supporting documents are available.</p>
                )}
              </section>
              <p className="mt-6 text-xs text-gray-500">
                This is a private, read-only invitation. Do not forward the link; anyone with it can view this information until it expires or the buyer removes access.
              </p>
            </article>
          ) : null}
        </div>
      </main>
    </>
  );
}
