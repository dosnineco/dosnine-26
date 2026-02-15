import { useState, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useRoleProtection } from '../../lib/useRoleProtection';
import { isVerifiedAgent } from '../../lib/rbac';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { CheckCircle } from 'lucide-react';
import { normalizeParish, PARISHES as STD_PARISHES } from '../../lib/normalizeParish';

export default function ParishRequests() {
  const { loading: authLoading, userData: initialUserData } =
    useRoleProtection({ checkAccess: isVerifiedAgent, redirectTo: '/agent/signup' });

  const { user } = useUser();
  const router = useRouter();

  const [parish, setParish] = useState('Kingston');
  const [bedrooms, setBedrooms] = useState('any');
  const [bathrooms, setBathrooms] = useState('any');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [allRequests, setAllRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parishesList, setParishesList] = useState([]);
  const [agentId, setAgentId] = useState(null);
  const [agentPaymentStatus, setAgentPaymentStatus] = useState(null);
  const [requestCost] = useState(500);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [payingForRequest, setPayingForRequest] = useState(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (initialUserData?.agent?.id) {
      setAgentId(initialUserData.agent.id);
      setAgentPaymentStatus(initialUserData.agent.payment_status);
    }
  }, [initialUserData]);

  useEffect(() => {
    let mounted = true;
    async function loadRequests() {
      try {
        const { data, error } = await supabase
          .from('service_requests')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!mounted) return;

        setAllRequests(data || []);

        const parishes = new Set();
        (data || []).forEach(r => {
          STD_PARISHES.forEach(p => {
            if (r.location?.toLowerCase().includes(p.toLowerCase())) {
              parishes.add(p);
            }
          });
        });

        const parishList = Array.from(parishes).sort();
        setParishesList(parishList.length ? parishList : STD_PARISHES);
        setParish(parishList[0] || 'Kingston');
      } catch {
        toast.error('Failed to load requests');
      } finally {
        setLoading(false);
      }
    }
    loadRequests();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    try {
      if (window.innerWidth < 768) setShowFilters(false);
    } catch {}
  }, []);

  useEffect(() => setSelectedAreas([]), [parish]);

  const areasForParish = useMemo(() => {
    const areas = new Set();
    allRequests.forEach(r => {
      if (parish === 'ALL' || r.location?.toLowerCase().includes(parish.toLowerCase())) {
        areas.add(r.location);
      }
    });
    return Array.from(areas).sort();
  }, [parish, allRequests]);

  useEffect(() => {
    let filtered = [...allRequests];

    filtered = filtered.filter(r =>
      parish === 'ALL' || r.location?.toLowerCase().includes(parish.toLowerCase())
    );

    if (selectedAreas.length) {
      filtered = filtered.filter(r => selectedAreas.includes(r.location));
    }

    if (bedrooms !== 'any') filtered = filtered.filter(r => !r.bedrooms || r.bedrooms >= Number(bedrooms));
    if (bathrooms !== 'any') filtered = filtered.filter(r => !r.bathrooms || r.bathrooms >= Number(bathrooms));
    if (budgetMin) filtered = filtered.filter(r => !r.budget_max || r.budget_max >= Number(budgetMin));
    if (budgetMax) filtered = filtered.filter(r => !r.budget_min || r.budget_min <= Number(budgetMax));

    setFilteredRequests(filtered);
  }, [parish, bedrooms, bathrooms, budgetMin, budgetMax, allRequests, selectedAreas]);

  async function requestThis(req) {
    if (!agentId) return toast.error('Agent profile not loaded');

    const isMonthlyPaid = agentPaymentStatus === '30-day';

    if (!isMonthlyPaid) {
      setPayingForRequest(req);
      return;
    }

    try {
      const { error } = await supabase.from('agent_request_applications').insert([
        { request_id: req.id, agent_id: agentId, status: 'pending' }
      ]);
      if (error) throw error;
      toast.success('Request submitted');
    } catch {
      toast.error('Already requested or failed');
    }
  }

  const whatsappText = payingForRequest
    ? encodeURIComponent(
        `Hello Dosnine Team,
I am paying for a request.

Agent: ${user?.primaryEmailAddress?.emailAddress}
Request ID: ${payingForRequest.id}
Location: ${payingForRequest.location}
Budget: J${payingForRequest.budget_min?.toLocaleString()} - J${payingForRequest.budget_max?.toLocaleString()}
Amount: J${requestCost}

I am sending proof now.`
      )
    : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <Head><title>Parish Requests</title></Head>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">Find Requests by Parish</h1>
        <p className="text-gray-600 mb-8">Search for property requests in your service area</p>

        {payingForRequest && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 p-5 rounded-lg">
            <h3 className="font-bold text-yellow-900 mb-2">Payment Required</h3>
            <p className="text-sm text-yellow-800 mb-3">
              This request requires a one-time payment of <strong>J${requestCost.toLocaleString()}</strong>
            </p>

            <div className="text-sm text-gray-700 mb-4">
              <p><strong>Request:</strong> {payingForRequest.request_type}</p>
              <p><strong>Location:</strong> {payingForRequest.location}</p>
              <p><strong>Budget:</strong> J${payingForRequest.budget_min?.toLocaleString()} - J${payingForRequest.budget_max?.toLocaleString()}</p>
            </div>

            <a
              href={`https://wa.me/18763369045?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-accent text-white font-bold px-5 py-3 rounded-lg"
            >
              <CheckCircle size={18} />
              Send Payment Proof on WhatsApp
            </a>
          </div>
        )}

        <div className="space-y-4" ref={resultsRef}>
          {filteredRequests.map(r => (
            <div key={r.id} className="bg-white rounded-lg p-5 border">
              <h3 className="font-semibold">{r.request_type}</h3>
              <p className="text-sm text-gray-600">{r.location}</p>
              <button
                onClick={() => requestThis(r)}
                className="mt-3 px-5 py-2 bg-accent text-white rounded-lg"
              >
                Request This — J${requestCost.toLocaleString()}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
