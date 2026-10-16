import Head from 'next/head';
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
      <main className="min-h-screen  px-4 py-10">
        {isLoadingRequest ? (
          <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center text-sm text-gray-600">
            Loading your purchase request…
          </div>
        ) : requestError ? (
          <div role="alert" className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center text-sm text-red-700">
            {requestError}
          </div>
        ) : (
          <BuyerPrequalificationForm
            key={`${serviceRequestId || 'new'}:${prequalification?.id || 'assessment'}`}
            serviceRequestId={serviceRequestId}
            initialBuyer={initialBuyer}
            initialPrequalificationId={prequalification?.id}
            initialAccessToken={prequalification?.access_token}
          />
        )}
      </main>
    </>
  );
}
