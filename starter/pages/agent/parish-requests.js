import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const { loading: authLoading, userData: initialUserData } = useRoleProtection({ checkAccess: isVerifiedAgent, redirectTo: '/agent/signup' });
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
  const resultsRef = useRef(null);

  useEffect(() => {
    if (initialUserData?.agent?.id) {
      setAgentId(initialUserData.agent.id);
      setAgentPaymentStatus(initialUserData.agent.payment_status);
    }
  }, [initialUserData]);

  // Fetch all open requests once and cache them
  useEffect(() => {
    let mounted = true;
    async function loadRequests() {
      try {
        const { data, error } = await supabase
          .from('service_requests')
          .select('id, request_type, property_type, location, bedrooms, bathrooms, budget_min, budget_max, description, created_at, status')
          .eq('status', 'open')
          .order('created_at', { ascending: false });
        
        if (error) throw error;

        if (!mounted) return;
        setAllRequests(data || []);
        
        // Extract unique parishes from locations
        const parishes = new Set();
        (data || []).forEach(r => {
          STD_PARISHES.forEach(p => {
            if (r.location?.toLowerCase().includes(p.toLowerCase())) {
              parishes.add(p);
            }
          });
        });
        
        const parishList = Array.from(parishes).sort();
        setParishesList(parishList.length > 0 ? parishList : STD_PARISHES);
        setParish(parishList[0] || 'Kingston');
      } catch (err) {
        console.error('Failed to load requests:', err);
        toast.error('Failed to load requests');
      } finally {
        setLoading(false);
      }
    }

    loadRequests();
    return () => { mounted = false; };
  }, []);

  // Initialize filter visibility based on screen (client-side only)
  useEffect(() => {
    try {
      if (window.innerWidth < 768) setShowFilters(false);
    } catch (e) {
      // ignore in SSR
    }
  }, []);

  // Clear selected areas when parish changes
  useEffect(() => {
    setSelectedAreas([]);
  }, [parish]);

  // Auto-scroll to results when any area selection changes (and there is at least one)
  useEffect(() => {
    if (!selectedAreas || selectedAreas.length === 0) return;
    try {
      const el = resultsRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      // ignore
    }
  }, [selectedAreas]);

  // Get areas for selected parish (memoized)
  const areasForParish = useMemo(() => {
    const areas = new Set();
    if (parish === 'ALL') {
      allRequests.forEach(r => { if (r.location) areas.add(r.location); });
    } else {
      allRequests.forEach(r => {
        if (r.location?.toLowerCase().includes(parish.toLowerCase())) {
          areas.add(r.location);
        }
      });
    }
    return Array.from(areas).sort();
  }, [parish, allRequests]);

  // Load site settings (request cost)
  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      try {
        const settings = await getSiteSettings();
        if (!mounted) return;
        setRequestCost(settings.request_cost?.amount ?? 500);
      } catch (e) {
        console.error('Failed to load site settings:', e);
      }
    }
    loadSettings();
    return () => { mounted = false; };
  }, []);

  // Apply filters in real-time when any filter changes (memoized)
  useEffect(() => {
    let filtered = [...allRequests];

    // Parish/Location filter (skip when 'ALL' selected)
    filtered = filtered.filter(r => {
      if (!r.location) return false;
      if (parish === 'ALL') return true;
      return r.location.toLowerCase().includes(parish.toLowerCase());
    });

    // Area filter (if any areas selected, show requests matching any of them)
    if (selectedAreas && selectedAreas.length > 0) {
      filtered = filtered.filter(r => selectedAreas.includes(r.location));
    }

    // Bedrooms filter
    if (bedrooms !== 'any') {
      const minBeds = Number(bedrooms);
      filtered = filtered.filter(r => !r.bedrooms || r.bedrooms >= minBeds);
    }

    // Bathrooms filter
    if (bathrooms !== 'any') {
      const minBaths = Number(bathrooms);
      filtered = filtered.filter(r => !r.bathrooms || r.bathrooms >= minBaths);
    }

    // Budget min filter
    if (budgetMin) {
      const minBudget = Number(budgetMin);
      filtered = filtered.filter(r => r.budget_max === null || r.budget_max >= minBudget);
    }

    // Budget max filter
    if (budgetMax) {
      const maxBudget = Number(budgetMax);
      filtered = filtered.filter(r => r.budget_min === null || r.budget_min <= maxBudget);
    }

    setFilteredRequests(filtered);
  }, [parish, bedrooms, bathrooms, budgetMin, budgetMax, allRequests]);

  async function requestThis(reqId) {
    if (!agentId) {
      toast.error('Agent profile not loaded');
      return;
    }

    // Check if monthly paid agent (free requests) or need to pay
    const isMonthlyPaid = agentPaymentStatus === '30-day';
    
    if (!isMonthlyPaid) {
      // Inform the agent about the cost and send them to the payment page
      toast.error(`Request cost: J${requestCost.toLocaleString()}. Payment integration coming soon! Redirecting to payment...`);
      setTimeout(() => router.push('/agent/payment'), 1200);
      return;
    }

    try {
      const { error } = await supabase.from('agent_request_applications').insert([{ 
        request_id: reqId, 
        agent_id: agentId,
        status: 'pending' 
      }]);
      if (error) throw error;
      toast.success('Request submitted to admin');
    } catch (err) {
      console.error(err);
      if (err.message && err.message.toLowerCase().includes('duplicate')) toast.error('Already requested');
      else toast.error('Failed to request');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head><title>Parish Requests</title></Head>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">Find Requests by Parish</h1>
        <p className="text-gray-600 mb-8">Search for property requests in your service area</p>

        {/* Search & Filter Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Filters</h2>
            <button onClick={() => setShowFilters(s => !s)} className="md:hidden text-sm text-accent font-medium">
              {showFilters ? 'Hide' : 'Show'} filters
            </button>
          </div>

          <div className={`bg-gray-100 rounded-lg p-4 ${showFilters ? 'block' : 'hidden'} md:block`}> 
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Parish</label>
              <select value={parish} onChange={(e)=>setParish(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="ALL">Other (All locations)</option>
                {parishesList.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {areasForParish.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  <p className="font-medium mb-1">Areas in {parish}:</p>
                  <div className="flex flex-wrap gap-1">
                    {areasForParish.map(area => {
                      const active = selectedAreas.includes(area);
                      return (
                        <button
                          key={area}
                          type="button"
                          onClick={() => setSelectedAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area])}
                          aria-pressed={active}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition ${active ? 'bg-accent text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                          {area}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
              <select value={bedrooms} onChange={(e)=>setBedrooms(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="any">Any bedrooms</option>
                {[1,2,3,4,5].map(n=> <option key={n} value={n}>{n}+</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
              <select value={bathrooms} onChange={(e)=>setBathrooms(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="any">Any bathrooms</option>
                {[1,2,3,4].map(n=> <option key={n} value={n}>{n}+</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Budget (JMD)</label>
              <input value={budgetMin} onChange={(e)=>setBudgetMin(e.target.value)} placeholder="Minimum" className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Budget (JMD)</label>
              <input value={budgetMax} onChange={(e)=>setBudgetMax(e.target.value)} placeholder="Maximum" className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setBedrooms('any'); setBathrooms('any'); setBudgetMin(''); setBudgetMax(''); }} className="text-sm text-accent underline">Reset filters</button>
          </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4" ref={resultsRef} tabIndex={-1}>
          {loading ? (
            <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
              <div className="inline-flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-accent rounded-full animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-600">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-600 font-medium">No requests found</p>
              <p className="text-sm text-gray-500 mt-2">Try adjusting your search filters</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">{filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} found</p>
              {filteredRequests.map(r => (
                <div key={r.id} className="bg-white rounded-lg p-5 border border-gray-200 hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">{(r.request_type||'Request').toUpperCase()}</h3>
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">{r.property_type}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">📍 {r.location}</span> • 
                        <span className="ml-2">🛏️ {r.bedrooms || '-'} bed</span> • 
                        <span className="ml-2">🚿 {r.bathrooms || '-'} bath</span>
                      </p>
                      {r.budget_min && (
                        <p className="text-sm font-medium text-gray-800 mb-3">
                          💰 Budget: <span className="text-accent">J${r.budget_min?.toLocaleString()} - J${r.budget_max?.toLocaleString()}</span>
                        </p>
                      )}
                      {r.description && <p className="text-sm text-gray-700 leading-relaxed">{r.description}</p>}
                    </div>
                    <div className="flex flex-col gap-2 items-stretch sm:items-end w-full sm:w-auto">
                      <button
                        onClick={() => requestThis(r.id)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition font-medium"
                      >
                        Request This — J$ {requestCost.toLocaleString()}
                      </button>
                      <p className="text-xs text-gray-500 text-right sm:text-right">Posted {new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
