import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { useRoleProtection } from '../../lib/useRoleProtection';
import { isVerifiedAgent } from '../../lib/rbac';
import { Copy, Check, AlertCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSiteSettings } from '../../lib/siteSettings';

const plans = [
  { id: '7-day', name: '7-Day Access', price: 1500, duration: '7 days' },
  { id: '30-day', name: '1 Month Access', price: 6000, duration: '30 days' },
  { id: '90-day', name: '3 Month Access', price: 15000, duration: '90 days' },
  { id: 'free', name: 'Free Access', price: 0, duration: 'Free' }
];

const formatCurrency = (amount) => `J$${amount.toLocaleString()}`;

export default function AgentPayment() {
  const router = useRouter();
  const { requestId } = router.query;

  const { user } = useUser();
  const { loading: authLoading, userData } = useRoleProtection({
    checkAccess: isVerifiedAgent,
    redirectTo: '/agent/signup',
  });

  const [selectedPlanId, setSelectedPlanId] = useState('30-day');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loadingRequest, setLoadingRequest] = useState(true);
  const [sessionToken, setSessionToken] = useState(null);

  /*
   ============================================
   FETCH SELECTED REQUEST
   ============================================
  */
  useEffect(() => {
    async function fetchRequest() {
      if (!requestId) {
        setLoadingRequest(false);
        return;
      }

      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!error && data) {
        setSelectedRequest(data);
        sessionStorage.setItem('selected_request_id', data.id);
      }

      setLoadingRequest(false);
    }

    fetchRequest();
  }, [requestId]);

  /*
   ============================================
   SESSION TOKEN
   ============================================
  */
  useEffect(() => {
    if (user?.id) {
      const token = `upgrade_${user.id}_${Date.now()}`;
      setSessionToken(token);
      sessionStorage.setItem('agent_upgrade_token', token);
    }
  }, [user?.id]);

  /*
   ============================================
   PLAN SETTINGS OVERRIDE
   ============================================
  */
  useEffect(() => {
    async function applySitePrices() {
      const s = await getSiteSettings();
      if (s?.plan_prices) {
        plans.forEach(p => {
          if (s.plan_prices[p.id] !== undefined) {
            p.price = s.plan_prices[p.id];
          }
        });
      }
    }
    applySitePrices();
  }, []);

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const paymentRequired = selectedPlan.price > 0;
  const userEmail = user?.primaryEmailAddress?.emailAddress || '';

  /*
   ============================================
   WHATSAPP MESSAGE
   ============================================
  */
  const whatsappText = encodeURIComponent(
    paymentRequired
      ? `Hello Dosnine Team, I want ${selectedPlan.name}.
Email: ${userEmail}
Request ID: ${selectedRequest?.id || 'N/A'}
Budget: ${selectedRequest?.budget || 'N/A'}
Amount: ${formatCurrency(selectedPlan.price)}
Session: ${sessionToken}
I am sending payment proof.`
      : `Hello Dosnine Team, activate free access for ${userEmail}.
Request ID: ${selectedRequest?.id || 'N/A'}
Session: ${sessionToken}`
  );

  if (authLoading || loadingRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Agent Access Plans</title>
      </Head>

      <div className="min-h-screen bg-white py-10 px-4">
        <div className="max-w-3xl mx-auto">

          {/* =============================== */}
          {/* SELECTED REQUEST DISPLAY */}
          {/* =============================== */}

          {selectedRequest && (
            <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="font-bold text-blue-900 mb-2">
                Unlocking Request
              </h3>

              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Type:</strong> {selectedRequest.request_type}</p>
                <p><strong>Location:</strong> {selectedRequest.location}</p>
                <p><strong>Budget:</strong> {formatCurrency(selectedRequest.budget)}</p>
                <p><strong>Property:</strong> {selectedRequest.property_type}</p>
              </div>
            </div>
          )}

          {/* =============================== */}
          {/* PLAN SELECTION */}
          {/* =============================== */}

          <div className="space-y-4">
            {plans.map(plan => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`w-full p-4 border rounded-lg text-left transition ${
                  selectedPlanId === plan.id
                    ? 'border-accent bg-accent/5'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-bold">{plan.name}</h3>
                    <p className="text-sm text-gray-500">{plan.duration}</p>
                  </div>
                  <p className="font-bold">
                    {formatCurrency(plan.price)}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* =============================== */}
          {/* PAYMENT CTA */}
          {/* =============================== */}

          <div className="mt-8 text-center">
            <a
              href={`https://wa.me/18763369045?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-accent text-white font-bold py-3 px-6 rounded-lg"
            >
              {paymentRequired ? 'Send Payment Proof' : 'Activate Free Access'}
            </a>
          </div>

        </div>
      </div>
    </>
  );
}
