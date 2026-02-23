import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Head from 'next/head'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useRoleProtection } from '../../lib/useRoleProtection'
import { isVerifiedAgent } from '../../lib/rbac'
import { useRouter } from 'next/router'
import { PARISHES as STD_PARISHES } from '../../lib/normalizeParish'
import { Bed, ShowerHead, Navigation2 } from 'lucide-react'

export default function ParishRequests() {

  const { userData } = useRoleProtection({
    checkAccess: isVerifiedAgent,
    redirectTo: '/agent/signup'
  })

  const router = useRouter()
  const resultsRef = useRef(null)

  /* ---------------- STATE ---------------- */

  const [parish, setParish] = useState('ALL')
  const [bedrooms, setBedrooms] = useState('any')
  const [bathrooms, setBathrooms] = useState('any')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [selectedAreas, setSelectedAreas] = useState([])

  const [requests, setRequests] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)

  const [agentId, setAgentId] = useState(null)
  const [agentName, setAgentName] = useState('')
  const [requestCost, setRequestCost] = useState(500)

  /* ---------------- INIT AGENT ---------------- */

  useEffect(() => {
    if (userData?.agent?.id) {
      setAgentId(userData.agent.id)
      setAgentName(userData.agent.name || '')
    }
  }, [userData])

  /* ---------------- FETCH REQUESTS ---------------- */

  const fetchRequests = useCallback(async () => {
    setLoading(true)

    try {
      // 1. Service Requests
      let srQuery = supabase
        .from('service_requests')
        .select(`
          id,
          request_type,
          property_type,
          location,
          parish,
          bedrooms,
          bathrooms,
          budget_min,
          budget_max,
          description,
          created_at
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      // 2. Visitor Emails
      let veQuery = supabase
        .from('visitor_emails')
        .select(`
          id,
          intent,
          bedrooms,
          parish,
          area,
          budget_min,
          created_at
        `)
        .eq('email_status', 'not_contacted')
        .order('created_at', { ascending: false })

      if (parish !== 'ALL') {
        srQuery = srQuery.or(`parish.eq.${parish},location.ilike.%${parish}%,description.ilike.%${parish}%`)
        veQuery = veQuery.or(`parish.eq.${parish},area.ilike.%${parish}%`)
      }

      if (selectedAreas.length > 0) {
        srQuery = srQuery.in('location', selectedAreas)
        veQuery = veQuery.in('area', selectedAreas)
      }

      if (bedrooms !== 'any') {
        srQuery = srQuery.gte('bedrooms', Number(bedrooms))
        veQuery = veQuery.gte('bedrooms', Number(bedrooms))
      }

      if (bathrooms !== 'any') {
        srQuery = srQuery.gte('bathrooms', Number(bathrooms))
      }

      if (budgetMin) {
        srQuery = srQuery.gte('budget_max', Number(budgetMin))
        veQuery = veQuery.gte('budget_min', Number(budgetMin))
      }

      if (budgetMax) {
        srQuery = srQuery.lte('budget_min', Number(budgetMax))
        veQuery = veQuery.lte('budget_min', Number(budgetMax))
      }

      const [srRes, veRes] = await Promise.all([srQuery, veQuery])

      if (srRes.error) throw srRes.error
      if (veRes.error) throw veRes.error

      const srData = (srRes.data || []).map(req => {
        if (req.description) {
            const extracted = {};
            const bedroomsMatch = req.description.match(/Bedrooms:\s*(\d+)/i);
            if (bedroomsMatch) extracted.bedrooms = parseInt(bedroomsMatch[1], 10);

            const parishMatch = req.description.match(/Parish:\s*([\w\s.-]+)/i);
            if (parishMatch) extracted.parish = parishMatch[1].trim().replace(/,$/, '').trim();

            const areaMatch = req.description.match(/Area:\s*([\w\s.-]+)/i);
            if (areaMatch) extracted.area = areaMatch[1].trim().replace(/,$/, '').trim();

            const budgetMatch = req.description.match(/Budget:\s*JMD\s*([\d,]+)/i);
            if (budgetMatch) extracted.budget_min = parseInt(budgetMatch[1].replace(/,/g, ''), 10);

            const newLocation = req.location && req.location.trim() !== '' 
                ? req.location 
                : (extracted.area ? `${extracted.area}, ${extracted.parish || ''}`.replace(/, $/, '').trim() : req.location);

            return {
                ...req,
                bedrooms: req.bedrooms ?? extracted.bedrooms,
                parish: req.parish ?? extracted.parish,
                location: newLocation,
                budget_min: req.budget_min ?? extracted.budget_min,
            };
        }
        return req;
      });

      const veData = (veRes.data || []).map(v => ({
        id: v.id,
        is_visitor: true,
        request_type: v.intent || 'rent',
        property_type: 'Property',
        location: v.area ? `${v.area}, ${v.parish || ''}` : v.parish || 'Unknown',
        bedrooms: v.bedrooms,
        bathrooms: null,
        budget_min: v.budget_min,
        budget_max: null,
        description: '',
        created_at: v.created_at
      }))

      const combined = [...srData, ...veData]
      combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setRequests(combined)

      const set = new Set()
      ;(srRes.data || []).forEach(r => r.location && set.add(r.location))
      ;(veRes.data || []).forEach(v => v.area && set.add(v.area))
      setAreas([...set].sort())

    } catch (err) {
      console.error(err)
      toast.error('Failed to load requests')
    } finally {
      setLoading(false)
    }
  }, [parish, selectedAreas, bedrooms, bathrooms, budgetMin, budgetMax])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  /* ---------------- SCROLL RESULTS ---------------- */

  useEffect(() => {
    if (!selectedAreas.length) return
    resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedAreas])

  /* ---------------- LOAD SETTINGS ---------------- */

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase
        .from('site_settings')
        .select('request_cost')
        .single()

      if (data?.request_cost)
        setRequestCost(data.request_cost)
    }
    loadSettings()
  }, [])

  /* ---------------- PRICING ---------------- */

  const getRequestPrice = (r) => {
    const budget = r.budget_max || r.budget_min || 0
    if (r.request_type === 'buy') return 1100
    if (r.request_type === 'rent' && budget >= 200000) return 750
    return requestCost
  }

  /* ---------------- APPLY REQUEST ---------------- */

  const requestThis = async (reqId) => {
    if (!agentId)
      return toast.error('Agent not loaded')

    try {
      const { error } = await supabase
        .from('agent_request_applications')
        .insert({
          request_id: reqId,
          agent_id: agentId,
          status: 'pending'
        })

      if (error) throw error

      toast.success('Application submitted! Please complete payment in My Applications.')
      router.push('/agent/my-applications')

    } catch (err) {
      if (err.message.includes('duplicate'))
        toast.error('Already requested')
      else
        toast.error('Submission failed')
    }
  }

const getTitle = (r) => {
  const beds = r.bedrooms ? `${r.bedrooms} Bed ` : ''
  const type = r.property_type || 'Property'
  const loc = r.location && r.location !== 'Unknown' ? ` in ${r.location}` : ''

  switch (r.request_type) {
    case 'rent':
      return `${beds}${type} Request to Rent${loc}`
    case 'buy':
      return `Request for ${beds}${type} to Buy${loc}`
    case 'sell':
      return `${beds}${type} for Sale${loc}`
    default:
      return `${beds}${type}${loc}`
  }
}

  /* ---------------- JSX ---------------- */

  return (
    <div className="min-h-screen bg-gray-50">

      <Head>
        <title>Parish Requests</title>
      </Head>

      <div className="max-w-6xl mx-auto px-6 py-8">

        <h1 className="text-3xl font-bold mb-2">Find Requests</h1>

 

        {/* FILTERS */}

        <div className="bg-gray-100 p-4 rounded-lg mb-6 grid md:grid-cols-5 gap-4">

          <select value={parish} onChange={e=>setParish(e.target.value)} className="input">
            <option value="ALL">All Parishes</option>
            {STD_PARISHES.map(p=> <option key={p}>{p}</option>)}
          </select>

          <select value={bedrooms} onChange={e=>setBedrooms(e.target.value)} className="input">
            <option value="any">Bedrooms</option>
            {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}+</option>)}
          </select>

          <select value={bathrooms} onChange={e=>setBathrooms(e.target.value)} className="input">
            <option value="any">Bathrooms</option>
            {[1,2,3,4].map(n=><option key={n} value={n}>{n}+</option>)}
          </select>

          <input value={budgetMin} onChange={e=>setBudgetMin(e.target.value)} placeholder="Min Budget" className="input"/>
          <input value={budgetMax} onChange={e=>setBudgetMax(e.target.value)} placeholder="Max Budget" className="input"/>

        </div>

        {/* AREAS */}

        {areas.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {areas.map(a=>{
              const active = selectedAreas.includes(a)
              return (
                <button
                  key={a}
                  onClick={()=>setSelectedAreas(prev =>
                    prev.includes(a)
                      ? prev.filter(x=>x!==a)
                      : [...prev,a]
                  )}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${active ? 'bg-accent text-white':'bg-white border'}`}
                >
                  {a}
                </button>
              )
            })}
          </div>
        )}

        {/* RESULTS */}

        <div ref={resultsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {loading && <div className="col-span-full text-center py-12"><p className="text-gray-500">Loading requests...</p></div>}

          {!loading && requests.map(r=>(
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group relative">
              
              {/* Request Type Indicator */}
              <div className={`absolute top-0 left-0 w-1 h-full ${
                r.request_type === 'buy' ? 'bg-emerald-500' : 
                r.request_type === 'rent' ? 'bg-blue-500' : 'bg-purple-500'
              }`}></div>

              <div className="p-6 pl-7 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                  
                    <h3 className="font-bold text-gray-900 text-lg capitalize leading-tight">

                      {getTitle(r)}   
                    </h3>
                  </div>
                 
                </div>

                {/* <div className="flex items-start gap-2 text-gray-600 text-sm mb-5">
                  <span className="font-medium leading-snug">
                    {r.location && r.location !== 'Unknown' ? r.location : 'Area: Not specified'}
                  </span>
                </div> */}

                <div className="flex gap-3 mb-5 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <Bed/>
                    <span className="font-medium">{r.bedrooms || 'Any'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <ShowerHead/>
                    <span className="font-medium">{r.bathrooms || 'Any'}</span>
                  </div>
                    <span className={`flex items-center gap-1.5 font-bold px-3 py-1.5 capitalize rounded-lg ${
                      r.request_type === 'buy' ? 'bg-emerald-100 text-emerald-800' : 
                      r.request_type === 'rent' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {r.request_type}
                    </span>
                </div>

                {r.budget_min && (
                  <div className="mb-5 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Budget Range</p>
                    <p className="font-bold text-gray-900 text-lg">
                      J${r.budget_min?.toLocaleString()}
                      {r.budget_max ? ` - ${r.budget_max?.toLocaleString()}` : '+'}
                    </p>
                  </div>
                )}

                {r.description && (
                  <div className="mb-5 relative">
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                      {r.description}
                    </p>
                  </div>
                )}

                <div className="mt-auto">
                  <button
                    onClick={()=>requestThis(r.id)}
                    className="w-full bg-gray-500 hover:bg-accent text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-between group-hover:shadow-lg transform group-hover:-translate-y-0.5"
                  >
                    <span>Request Lead</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
                      J${getRequestPrice(r).toLocaleString()}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}

        </div>

      </div>
    </div>
  )
}