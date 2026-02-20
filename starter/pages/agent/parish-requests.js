import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Head from 'next/head'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useRoleProtection } from '../../lib/useRoleProtection'
import { isVerifiedAgent } from '../../lib/rbac'
import { useRouter } from 'next/router'
import { Check, Copy } from 'lucide-react'
import { PARISHES as STD_PARISHES } from '../../lib/normalizeParish'

export default function ParishRequests() {

  const { userData } = useRoleProtection({
    checkAccess: isVerifiedAgent,
    redirectTo: '/agent/signup'
  })

  const router = useRouter()
  const resultsRef = useRef(null)
  const paymentRef = useRef(null)

  /* ---------------- STATE ---------------- */

  const [parish, setParish] = useState('Kingston')
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

  const [paymentRequired, setPaymentRequired] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [copied, setCopied] = useState(null)

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
      let query = supabase
        .from('service_requests')
        .select(`
          id,
          request_type,
          property_type,
          location,
          bedrooms,
          bathrooms,
          budget_min,
          budget_max,
          description,
          created_at
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      if (parish !== 'ALL')
        query = query.ilike('location', `%${parish}%`)

      if (selectedAreas.length > 0)
        query = query.in('location', selectedAreas)

      if (bedrooms !== 'any')
        query = query.gte('bedrooms', Number(bedrooms))

      if (bathrooms !== 'any')
        query = query.gte('bathrooms', Number(bathrooms))

      if (budgetMin)
        query = query.gte('budget_max', Number(budgetMin))

      if (budgetMax)
        query = query.lte('budget_min', Number(budgetMax))

      const { data, error } = await query
      if (error) throw error

      setRequests(data || [])

      const set = new Set()
      ;(data || []).forEach(r => r.location && set.add(r.location))
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

  /* ---------------- SCROLL PAYMENT ---------------- */

  useEffect(() => {
    if (paymentRequired)
      paymentRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [paymentRequired])

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

      setSelectedRequestId(reqId)
      setPaymentRequired(true)

      toast.success('Application submitted — complete payment')

    } catch (err) {
      if (err.message.includes('duplicate'))
        toast.error('Already requested')
      else
        toast.error('Submission failed')
    }
  }

  /* ---------------- COPY ---------------- */

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  /* ---------------- BANK DETAILS ---------------- */

  const bankDetails = [
    {
      bank: 'Scotiabank Jamaica',
      accountName: 'Tahjay Thompson',
      accountNumber: '010860258',
      branch: '50575'
    }
  ]

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

        <div ref={resultsRef} className="space-y-4">

          {loading && <p>Loading...</p>}

          {!loading && requests.map(r=>(
            <div key={r.id} className="bg-white p-5 rounded-lg border">

              <h3 className="font-bold text-lg">
                {r.request_type?.toUpperCase()}
              </h3>

              <p className="text-sm text-gray-600 mb-2">
                📍 {r.location} • 🛏 {r.bedrooms || '-'} • 🚿 {r.bathrooms || '-'}
              </p>

              {r.budget_min && (
                <p className="font-semibold text-accent mb-2">
                  J${r.budget_min?.toLocaleString()} — J${r.budget_max?.toLocaleString()}
                </p>
              )}

              <p className="text-sm mb-3">{r.description}</p>

              <button
                onClick={()=>requestThis(r.id)}
                className="bg-accent text-white px-4 py-2 rounded-lg"
              >
                Request — J${requestCost}
              </button>

            </div>
          ))}

        </div>

        {/* PAYMENT PANEL */}

        {paymentRequired && (
          <div ref={paymentRef} className="mt-10 bg-gray-100 border-l-4 border-accent p-6 rounded-lg">

            <h3 className="font-bold mb-4">
              Pay J${requestCost} to Activate Request
            </h3>

            {bankDetails.map((bank,i)=>(
              <div key={i} className="bg-white p-4 rounded border mb-4">

                <h4 className="font-bold mb-3">{bank.bank}</h4>

                {Object.entries(bank)
                  .filter(([k])=>k!=='bank')
                  .map(([k,v])=>(
                    <div key={k} className="flex justify-between text-sm mb-2">

                      <span className="text-gray-600">{k}</span>

                      <div className="flex gap-2 items-center">
                        <span className="font-mono">{v}</span>
                        <button onClick={()=>copyToClipboard(v,`${i}-${k}`)}>
                          {copied===`${i}-${k}` ? <Check size={14}/> : <Copy size={14}/>}
                        </button>
                      </div>

                    </div>
                  ))}
              </div>
            ))}

            {/* NOTE */}

            <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 p-3 rounded mb-4 text-sm">
              <strong>Important:</strong> When sending payment proof include:
              <ul className="list-disc ml-5 mt-1">
                <li>Your Agent Name</li>
                <li>Request ID: <strong>{selectedRequestId}</strong></li>
              </ul>
            </div>

            {/* WHATSAPP */}

            <a
              href={`https://wa.me/18763369045?text=Payment proof for request ${selectedRequestId}%0AAgent Name: ${agentName}`}
              target="_blank"
              className="block text-center bg-accent text-white py-3 rounded-lg font-bold"
            >
              Upload Proof on WhatsApp
            </a>

          </div>
        )}

      </div>
    </div>
  )
}