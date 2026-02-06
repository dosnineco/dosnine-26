import { useState, useEffect, useRef } from 'react'

const BANKS = [
  {
    bank: 'Scotiabank Jamaica',
    accountName: 'Tahjay Thompson',
    accountNumber: '010860258',
    branch: '50575',
    accountType: 'Savings Account'
  }
]

const YOUTUBE_URL = 'https://youtube.com/shorts/DjbPOvxPIo8?si=UZuJkg7wojdniDil'

function getYoutubeVideoId(value) {
  if (!value) return ''
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value

  try {
    const url = new URL(value)
    if (url.hostname.includes('youtu.be')) return url.pathname.replace('/', '')
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/shorts/')) {
        return url.pathname.replace('/shorts/', '').split('/')[0]
      }
      return url.searchParams.get('v') || ''
    }
  } catch (err) {
    return ''
  }

  return ''
}

export default function CourseLanding() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState(null)
  const [copied, setCopied] = useState(null)
  const [videoSoundOn, setVideoSoundOn] = useState(false)
  const [showStickyBtn, setShowStickyBtn] = useState(false)
  const FULL_PRICE = 18500
  const DISCOUNT = 8000
  const discountedAmount = Math.max(0, FULL_PRICE - DISCOUNT)
  const SPOTS_LEFT = 8

  const formRef = useRef(null)

  useEffect(() => {
    function handleScroll() {
      if (formRef.current) {
        const rect = formRef.current.getBoundingClientRect()
        setShowStickyBtn(rect.top > window.innerHeight)
      }
    }
    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    try {
      const body = {
        name,
        email,
        phone,
        priceChoice: 'JMD 15,000 — Full course',
        buyNow: true,
        discountedAmount
      }
      const res = await fetch('/api/preorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Network response was not ok')
      }
      
      const result = await res.json()
      
      // Check if email was sent
      if (result.emailSent === false) {
        console.warn('Signup saved but email not sent:', result.emailError)
        // Still show success to user, but log the issue
      }
      
      setStatus('thanks')
      setName('')
      setEmail('')
      setPhone('')
    } catch (err) {
      console.error('Submission error:', err)
      setStatus('error')
    }
  }

  function copy(text, label) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(()=>setCopied(null), 2000)
  }

  const whatsappText = encodeURIComponent(`Hello, I want to preorder the Dosnine Course. Name: ${name || 'N/A'}. Email: ${email || 'N/A'}. Phone: ${phone || 'N/A'}. Plan: JMD 15,000 — Full course. Paying now: Yes. Amount: JMD ${discountedAmount}.`)

  

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      {status === 'sending' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm animate-pulse rounded-xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl">
            <div className="text-base font-semibold text-slate-100">Processing...</div>
            <p className="mt-2 text-sm text-slate-300">Securing your spot</p>
          </div>
        </div>
      )}

      {/* Sticky CTA for mobile */}
      {showStickyBtn && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent p-4 pb-safe sm:hidden">
          <button
            onClick={scrollToForm}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-base font-bold text-white shadow-lg hover:from-indigo-700 hover:to-purple-700"
          >
            Get {DISCOUNT.toLocaleString()} OFF — {SPOTS_LEFT} Spots Left
          </button>
        </div>
      )}

      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-12">
        {/* Hero Section */}
        <div className="text-center">
          {/* Urgency Badge */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-rose-200 sm:text-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
            </span>
            Only {SPOTS_LEFT} spots left — Filling fast
          </div>

          <h1 className="text-3xl font-black leading-[1.1] text-white sm:text-5xl lg:text-6xl">
            Build Real Products.<br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Launch. Get Paid.</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:mt-6 sm:text-lg lg:text-xl">
            Stop watching tutorials. Start building production apps that solve real problems and generate real income. From zero to deployed product.
          </p>

          {/* Price & Discount - Prominent */}
          <div className="mx-auto mt-6 max-w-md rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-4 shadow-xl sm:mt-8 sm:p-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-300 sm:text-sm">Preorder Price</div>
            <div className="mt-2 flex items-center justify-center gap-3">
              <span className="text-lg text-slate-400 line-through sm:text-xl">JMD {FULL_PRICE.toLocaleString()}</span>
              <span className="text-3xl font-black text-white sm:text-4xl">JMD {discountedAmount.toLocaleString()}</span>
            </div>
            <div className="mt-2 text-sm font-semibold text-emerald-300 sm:text-base">
              You save JMD {DISCOUNT.toLocaleString()} — {Math.round((DISCOUNT/FULL_PRICE)*100)}% OFF
            </div>
          </div>

          {/* Primary CTA */}
          <button
            onClick={scrollToForm}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-bold text-white shadow-xl transition hover:from-indigo-700 hover:to-purple-700 hover:shadow-2xl sm:w-auto sm:px-10 sm:py-5 sm:text-lg"
          >
            Reserve My Spot Now →
          </button>

          <p className="mt-3 text-xs text-slate-400 sm:text-sm">💳 One-time payment • Lifetime access </p>
        </div>

       
        {/* What You Get - Benefits */}
        <div className="mt-12 sm:mt-16">
          <h2 className="mb-6 text-center text-2xl font-bold text-white sm:mb-8 sm:text-3xl">What You'll Get</h2>
          
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
            {[
              { icon: '🚀', title: 'Live Product Builds', desc: 'Watch me build real apps from scratch. Follow along, code by code.' },
              { icon: '💰', title: 'Monetization Strategy', desc: 'Learn how to turn your projects into income streams that pay you.' },
              { icon: '📱', title: 'Production-Ready Code', desc: 'No toy projects. Ship professional apps people actually want to use.' },
              { icon: '🎯', title: 'Step-by-Step Process', desc: 'My exact workflow from idea validation to deployment and beyond.' },
              { icon: '⚡', title: 'Modern Tech Stack', desc: 'Next.js, React, Tailwind, Supabase — the tools real developers use.' },
              { icon: '🔄', title: 'Lifetime Updates', desc: 'Get all future content and updates at no extra cost. Forever.' }
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-700 sm:p-6">
                <div className="text-3xl sm:text-4xl">{item.icon}</div>
                <h3 className="mt-3 text-base font-bold text-white sm:text-lg">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400 sm:text-base">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Who This Is For */}
        <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:mt-16 sm:p-8">
          <h2 className="mb-4 text-center text-xl font-bold text-white sm:mb-6 sm:text-2xl">This Course Is Perfect For You If...</h2>
          
          <div className="space-y-3 sm:space-y-4">
            {[
              "You're tired of tutorial hell and ready to build real products",
              "You want to earn money from your coding skills on your own schedule",
              "You know basics but struggle to ship complete, production-ready apps",
              "You want to see the entire process from idea to deployment",
              "You're ready to invest in yourself and your future as a developer"
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3 sm:gap-4">
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 sm:h-7 sm:w-7">
                  ✓
                </div>
                <p className="text-sm leading-relaxed text-slate-300 sm:text-base">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Urgency Reminder */}
        <div className="mt-10 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center sm:mt-12 sm:p-6">
          <p className="text-sm font-semibold text-amber-200 sm:text-base">
            ⚠️ {SPOTS_LEFT} spots remaining • Price increases after preorder
          </p>
        </div>

        {/* Form Section - Optimized */}
        <div ref={formRef} className="mt-10 scroll-mt-4 rounded-2xl border-2 border-indigo-500/30 bg-slate-900/90 p-6 shadow-2xl backdrop-blur sm:mt-16 sm:p-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Secure Your Spot Now</h2>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              Join {SPOTS_LEFT + 175 - SPOTS_LEFT} others who've already enrolled
            </p>
            <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300 sm:text-base">
              💰 Pay JMD {discountedAmount.toLocaleString()} today • Save JMD {DISCOUNT.toLocaleString()}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200 sm:text-base">Full Name *</label>
              <input 
                required 
                value={name} 
                onChange={e=>setName(e.target.value)} 
                className="block w-full rounded-lg border-2 border-slate-700 bg-slate-800 px-4 py-3 text-base text-slate-100 placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:py-4 sm:text-lg" 
                placeholder="Jane Doe" 
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200 sm:text-base">Email Address *</label>
              <input 
                required 
                type="email" 
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
                className="block w-full rounded-lg border-2 border-slate-700 bg-slate-800 px-4 py-3 text-base text-slate-100 placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:py-4 sm:text-lg" 
                placeholder="you@example.com" 
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200 sm:text-base">Phone Number (WhatsApp)</label>
              <input 
                value={phone} 
                onChange={e=>setPhone(e.target.value)} 
                className="block w-full rounded-lg border-2 border-slate-700 bg-slate-800 px-4 py-3 text-base text-slate-100 placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:py-4 sm:text-lg" 
                placeholder="876-xxx-xxxx" 
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={status==='sending'}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-base font-bold text-white shadow-xl transition hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 sm:py-5 sm:text-lg"
              >
                {status==='sending' ? 'Securing Your Spot...' : `Yes! Reserve My Spot — JMD ${discountedAmount.toLocaleString()}`}
              </button>
              
              <p className="mt-3 text-center text-xs text-slate-400 sm:text-sm">
                Secure payment • 30-day money-back guarantee • Instant access after payment
              </p>
            </div>
          </form>

          {status==='thanks' && (
            <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <p className="text-base font-semibold text-emerald-300 sm:text-lg">
                🎉 Spot Reserved! Check your email for payment instructions.
              </p>
            </div>
          )}
          {status==='error' && (
            <div className="mt-5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-center">
              <p className="text-base font-semibold text-rose-300">
                ❌ Something went wrong. Please try again or contact support.
              </p>
            </div>
          )}
        </div>

        {/* Payment Instructions */}
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <h3 className="mb-4 text-center text-xl font-bold text-white sm:text-2xl">Payment Instructions</h3>
          
          {/* Prominent Price Display */}
          <div className="mx-auto mb-6 max-w-sm rounded-xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-4 text-center">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-300 mb-2">Transfer Amount</div>
            <div className="text-3xl font-black text-white sm:text-4xl">JMD {discountedAmount.toLocaleString()}</div>
            <div className="mt-1 text-xs text-slate-400 sm:text-sm">Original: JMD {FULL_PRICE.toLocaleString()} • Save: JMD {DISCOUNT.toLocaleString()}</div>
          </div>
          
          <p className="mb-4 text-center text-sm text-slate-400 sm:text-base">
            Transfer to the account below
          </p>

          {BANKS.map((b, i) => (
            <div key={i} className="mb-4 rounded-xl border-2 border-slate-700 bg-slate-800/80 p-4 sm:p-5">
              <div className="mb-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 sm:text-sm mb-3">{b.bank}</div>
                
                <div className="space-y-3">
                  {/* Account Name */}
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/50 p-3">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Account Name</div>
                      <div className="text-sm font-semibold text-white sm:text-base">{b.accountName}</div>
                    </div>
                    <button 
                      type="button"
                      onClick={()=>copy(b.accountName, 'Account Name')} 
                      className="rounded-lg bg-slate-700 p-2 text-white hover:bg-slate-600 transition-colors flex-shrink-0"
                      title="Copy Account Name"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>

                  {/* Account Number */}
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/50 p-3">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Account Number</div>
                      <div className="text-sm font-semibold text-white sm:text-base">{b.accountNumber}</div>
                    </div>
                    <button 
                      type="button"
                      onClick={()=>copy(b.accountNumber, 'Account Number')} 
                      className="rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-700 transition-colors flex-shrink-0"
                      title="Copy Account Number"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>

                  {/* Branch */}
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/50 p-3">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Branch Code</div>
                      <div className="text-sm font-semibold text-white sm:text-base">{b.branch}</div>
                    </div>
                    <button 
                      type="button"
                      onClick={()=>copy(b.branch, 'Branch Code')} 
                      className="rounded-lg bg-slate-700 p-2 text-white hover:bg-slate-600 transition-colors flex-shrink-0"
                      title="Copy Branch Code"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>

                  {/* Account Type */}
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/50 p-3">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Account Type</div>
                      <div className="text-sm font-semibold text-white sm:text-base">{b.accountType}</div>
                    </div>
                    <button 
                      type="button"
                      onClick={()=>copy(b.accountType, 'Account Type')} 
                      className="rounded-lg bg-slate-700 p-2 text-white hover:bg-slate-600 transition-colors flex-shrink-0"
                      title="Copy Account Type"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {copied && (
            <div className="mt-3 text-center text-sm font-semibold text-emerald-400">
              ✓ {copied} copied to clipboard!
            </div>
          )}

          <div className="mt-6 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-200 sm:text-base">After Payment:</div>
            <ol className="space-y-2 text-sm text-slate-400 sm:text-base">
              <li className="flex items-start gap-2">
                <span className="font-bold text-indigo-400">1.</span>
                <span>Take a screenshot of your payment receipt</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-indigo-400">2.</span>
                <span>Click the WhatsApp button below to send proof</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-indigo-400">3.</span>
                <span>Get instant access to the course within 24 hours</span>
              </li>
            </ol>
          </div>

          <div className="mt-6">
            <a 
              href={`https://wa.me/18763369045?text=${whatsappText}`} 
              target="_blank" 
              rel="noreferrer" 
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-green-600 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:bg-green-700 sm:text-lg"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              Send Payment Proof on WhatsApp
            </a>
          </div>
        </div>

     

        {/* Final CTA */}
        <div className="mt-10 text-center">
          <button
            onClick={scrollToForm}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-5 text-base font-bold text-white shadow-xl transition hover:from-indigo-700 hover:to-purple-700 sm:w-auto sm:px-12 sm:text-lg"
          >
            Lock In {DISCOUNT.toLocaleString()} OFF Today
          </button>
          <p className="mt-3 text-xs text-slate-400 sm:text-sm">
            {SPOTS_LEFT} spots left at preorder pricing
          </p>
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-slate-800 pt-8 text-center">
          <p className="text-xs text-slate-500 sm:text-sm">
            © 2026 Dosnine. Questions? WhatsApp us at +1 876 336 9045
          </p>
        </div>
      </div>
    </div>
  )
}
