import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import BuyerPrequalificationForm from '@/components/BuyerPrequalificationForm';

export default function BuyerPrequalificationPage() {
  const router = useRouter();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const serviceRequestId = router.isReady && typeof router.query.serviceRequestId === 'string'
    ? router.query.serviceRequestId
    : undefined;
  const [requestState, setRequestState] = useState({
    requestId: '',
    request: null,
    loading: false,
    error: '',
  });

  useEffect(() => {
    if (!router.isReady || !authLoaded) return undefined;
    if (!serviceRequestId || !isSignedIn) {
      setRequestState({ requestId: serviceRequestId || '', request: null, loading: false, error: '' });
      return undefined;
    }

    let cancelled = false;
    setRequestState({ requestId: serviceRequestId, request: null, loading: true, error: '' });

    const loadRequest = async () => {
      try {
        const response = await fetch('/api/buyer/my-requests', {
          credentials: 'same-origin',
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'Unable to load this property request.');
        }

        const request = (payload.requests || []).find((item) => item.id === serviceRequestId);
        if (!request || String(request.request_type || '').toLowerCase() !== 'buy') {
          throw new Error('This purchase request could not be found for your account.');
        }

        if (!cancelled) {
          setRequestState({ requestId: serviceRequestId, request, loading: false, error: '' });
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Loading buyer verification request failed:', error);
          setRequestState({
            requestId: serviceRequestId,
            request: null,
            loading: false,
            error: error.message || 'Unable to load this property request.',
          });
        }
      }
    };

    loadRequest();
    return () => {
      cancelled = true;
    };
  }, [authLoaded, isSignedIn, router.isReady, serviceRequestId]);

  const requestIsCurrent = requestState.requestId === serviceRequestId;
  const request = requestIsCurrent ? requestState.request : null;
  const isLoadingRequest = Boolean(
    serviceRequestId && (
      !authLoaded ||
      (isSignedIn && (!requestIsCurrent || requestState.loading))
    )
  );
  const requestError = requestIsCurrent ? requestState.error : '';
  const budgetMin = Number(request?.budget_min || 0);
  const budgetMax = Number(request?.budget_max || 0);
  const requestBudget = budgetMin && budgetMax
    ? `J$${budgetMin.toLocaleString()} – J$${budgetMax.toLocaleString()}`
    : budgetMax
      ? `Up to J$${budgetMax.toLocaleString()}`
      : budgetMin
        ? `From J$${budgetMin.toLocaleString()}`
        : 'Not specified';
  const initialBuyer = request
    ? {
        serviceRequestId: request.id,
        buyerName: request.client_name,
        buyerEmail: request.client_email,
        buyerPhone: request.client_phone,
        targetPropertyPrice: request.budget_max || request.budget_min,
      }
    : undefined;
  const prequalification = request?.buyer_prequalification;

  return (
    <>
      <Head>
        <title>Buyer Financial Readiness — Dosnine</title>
        <meta name="description" content="Submit your buyer financial readiness assessment securely to Dosnine." />
      </Head>
      <main className="min-h-screen bg-gray-100 px-4 py-8 sm:py-10">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/my-requests"
            className="inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <span aria-hidden="true" className="mr-2">&larr;</span>
            Back to My Requests
          </Link>
        </div>
        {!authLoaded ? (
          <div className="mx-auto mt-5 max-w-3xl rounded-2xl bg-white p-8 text-center text-sm text-gray-600">
            Loading your account…
          </div>
        ) : !isSignedIn ? (
          <section className="mx-auto mt-5 max-w-3xl rounded-2xl bg-white p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Sign in to complete buyer readiness</h1>
            <p className="mt-3 text-gray-600">Buyer readiness is free for signed-in accounts.</p>
            <Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-accent px-5 py-3 font-semibold text-white hover:bg-accent/90">
              Go to dashboard
            </Link>
          </section>
        ) : isLoadingRequest ? (
          <div className="mx-auto mt-5 max-w-3xl rounded-2xl bg-white p-8 text-center text-sm text-gray-600">
            Loading your purchase request…
          </div>
        ) : requestError ? (
          <div role="alert" className="mx-auto mt-5 max-w-3xl rounded-2xl bg-white p-8 text-center text-sm text-red-700">
            {requestError}
          </div>
        ) : (
          <>
            {request && (
              <div className="mx-auto mt-5 max-w-3xl overflow-hidden rounded-2xl bg-white">
                <section className="bg-white px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                      Linked purchase request
                    </p>
                    <h2 className="mt-1 text-lg font-bold capitalize tracking-tight text-gray-900">
                      {request.property_type} in {request.location || 'location not specified'}
                    </h2>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="min-w-0">
                      <dt className="text-[10px] font-medium text-gray-500">
                        Request type
                      </dt>
                      <dd className="mt-0.5 truncate text-xs font-semibold capitalize text-gray-900 sm:text-sm">
                        {request.request_type}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-medium text-gray-500">
                        Budget
                      </dt>
                      <dd className="mt-0.5 truncate text-xs font-semibold text-gray-900 sm:text-sm">
                        {requestBudget}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-medium text-gray-500">
                        Status
                      </dt>
                      <dd className="mt-0.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                          request.status === 'open'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          <span className={`h-1 w-1 rounded-full ${
                            request.status === 'open' ? 'bg-emerald-500' : 'bg-gray-400'
                          }`} />
                          {String(request.status || 'open').replaceAll('_', ' ')}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </section>
                <div className="border-t border-gray-100 bg-white">
                  <BuyerPrequalificationForm
                    key={`${serviceRequestId || 'new'}:${prequalification?.id || 'assessment'}`}
                    serviceRequestId={serviceRequestId}
                    initialBuyer={initialBuyer}
                    initialPrequalificationId={prequalification?.id}
                    initialAccessToken={prequalification?.access_token}
                  />
                </div>
              </div>
            )}
            {!request && (
              <div className="mx-auto mt-5 max-w-3xl rounded-2xl bg-white">
                <BuyerPrequalificationForm
                  key={`${serviceRequestId || 'new'}:${prequalification?.id || 'assessment'}`}
                  serviceRequestId={serviceRequestId}
                  initialBuyer={initialBuyer}
                  initialPrequalificationId={prequalification?.id}
                  initialAccessToken={prequalification?.access_token}
                />
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
