import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Head from 'next/head'
import toast from 'react-hot-toast'
import { useAuth } from '@clerk/nextjs'
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
  const { getToken, isLoaded: authLoaded, userId } = useAuth()
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
      const params = new URLSearchParams({
        parish,
        bedrooms,
        bathrooms,
        budgetMin,
        budgetMax,
        selectedAreas: selectedAreas.join(','),
      });
      const response = await fetch(`/api/agent/parish-requests?${params.toString()}`)
      const payload = await response.json()
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to load requests')

      setRequests(payload.requests || [])
      setAreas(payload.areas || [])

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
      const response = await fetch('/api/site-settings/request-cost')
      const payload = await response.json()
      if (response.ok && payload?.requestCost) setRequestCost(payload.requestCost)
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

    if (!authLoaded)
      return toast.error('Authentication still loading, please try again')

    if (!userId) {
      toast.error('Session expired. Please sign in again.')
      router.push('/sign-in')
      return
    }

    try {
      const token = await getToken()

      const response = await fetch('/api/agent/applications', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ requestId: reqId })
      })
      const raw = await response.text()
      let payload = null

      try {
        payload = raw ? JSON.parse(raw) : null
      } catch {
        payload = null
      }

      if (!response.ok || !payload?.success) {
        const message =
          payload?.error ||
          payload?.message ||
          (raw && !raw.startsWith('<!DOCTYPE') ? raw : '') ||
          'Submission failed'

        if (response.status === 401) {
          toast.error('Session expired. Please sign in again.')
          router.push('/sign-in')
          return
        }

        throw new Error(message)
      }

      toast.success('Application submitted! Please complete payment in My Applications.')
      router.push('/agent/my-applications')

    } catch (err) {
      const message = (err?.message || '').toLowerCase()

      if (message.includes('duplicate') || message.includes('already'))
        toast.error('Already requested')
      else if (err?.message)
        toast.error(err.message)
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