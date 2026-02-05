import { useState } from 'react'

const BANKS = [
  {
    bank: 'Scotiabank Jamaica',
    accountName: 'Tahjay Thompson',
    accountNumber: '010860258',
    branch: '50575'
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
  const FULL_PRICE = 15000
  const DISCOUNT = 4500
  const discountedAmount = Math.max(0, FULL_PRICE - DISCOUNT)

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
      if (!res.ok) throw new Error('Network response was not ok')
      setStatus('thanks')
      setName('')
      setEmail('')
      setPhone('')
    } catch (err) {
      setStatus('error')
    }
  }

  function copy(text, label) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(()=>setCopied(null), 2000)
  }

  const whatsappText = encodeURIComponent(`Hello, I want to preorder the Dosnine Course. Name: ${name || 'N/A'}. Email: ${email || 'N/A'}. Phone: ${phone || 'N/A'}. Plan: JMD 15,000 — Full course. Paying now: Yes. Amount: JMD ${discountedAmount}.`)

  const videoId = getYoutubeVideoId(YOUTUBE_URL)
  const youtubeSrc = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=${videoSoundOn ? 0 : 1}&playsinline=1&rel=0&modestbranding=1&controls=1&loop=1&playlist=${videoId}`
    : ''

  return (
    <div className="min-h-screen bg-black text-slate-100">
      {status === 'sending' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl">
            <div className="text-sm font-semibold text-slate-100">Checking availability</div>
            <p className="mt-2 text-xs text-slate-300">Checking to see if space is there.</p>
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur">
          <div className="p-6 sm:p-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-200">
              Live product build course
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
              Build and ship real products with Dosnine
            </h1>
            <p className="mt-3 text-base text-slate-300 sm:text-lg">
              Learn the exact workflow I use to design, build, and launch production apps. Walk away with a real project, a repeatable process, and confidence.
            </p>
            <div className="mt-5 inline-flex flex-col items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100 sm:flex-row sm:gap-3">
              <span className="text-emerald-200">One payment:</span>
              <span className="text-emerald-100">JMD {FULL_PRICE.toLocaleString()}</span>
              <span className="text-emerald-200">Preorder now:</span>
              <span className="text-emerald-100">JMD {discountedAmount.toLocaleString()}</span>
              <span className="text-emerald-300">(Save JMD {DISCOUNT.toLocaleString()})</span>
            </div>
            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-slate-200">Learn at your own pace</div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-slate-200">Launch production software</div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-slate-200">Earn on your schedule</div>
            </div>
          </div>

          <div className="px-6 pb-6 sm:px-10 sm:pb-10">
            <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-sm font-semibold text-slate-200 mb-2">Course preview</div>
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                {youtubeSrc ? (
                  <>
                    <iframe
                      key={videoSoundOn ? 'sound-on' : 'muted'}
                      title="Course preview"
                      src={youtubeSrc}
                      className="h-full w-full"
                      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                    {!videoSoundOn && (
                      <button
                        type="button"
                        onClick={() => setVideoSoundOn(true)}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-semibold text-white"
                      >
                        Tap to enable sound
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    Video unavailable.
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Learn at your own pace, launch production software, and start making money on your time.
              </p>
              <a
                href={YOUTUBE_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center justify-center rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500"
              >
                Watch on YouTube
              </a>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 text-left sm:p-6">
              <h2 className="text-lg font-semibold text-slate-100">Reserve your spot</h2>
              <p className="mt-1 text-sm text-slate-400">
                Full course pre-order is JMD {FULL_PRICE.toLocaleString()}. Preorder today to save JMD {DISCOUNT.toLocaleString()} and lock in your spot.
              </p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm text-slate-300">Full name</label>
                  <input required value={name} onChange={e=>setName(e.target.value)} className="mt-1 block w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100" placeholder="Jane Doe" />
                </div>

                <div>
                  <label className="block text-sm text-slate-300">Email</label>
                  <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 block w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100" placeholder="you@example.com" />
                </div>

                <div>
                  <label className="block text-sm text-slate-300">Phone</label>
                  <input value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 block w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100" placeholder="876-123-4567" />
                </div>

                <div className="pt-2">
                  <button type="submit" className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700">
                    {status==='sending' ? 'Sending...' : 'Reserve my seat'}
                  </button>
                  <span className="mt-3 block text-sm text-slate-300 sm:ml-4 sm:mt-0 sm:inline-block">Pay now: JMD {discountedAmount.toLocaleString()}</span>
                </div>
              </form>

              {status==='thanks' && <p className="mt-4 text-emerald-400">Thanks — we&apos;ve recorded your interest and will notify you.</p>}
              {status==='error' && <p className="mt-4 text-rose-400">Something went wrong — please try again later.</p>}
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-200 mb-2">Bank details (copy to pay)</h3>
              {BANKS.map((b, i) => (
                <div key={i} className="bg-slate-800 p-3 rounded mb-2 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-300">{b.bank}</div>
                      <div className="text-sm text-slate-200 font-medium">{b.accountName}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>copy(b.accountNumber, 'accountNumber')} className="px-3 py-1 bg-slate-700 rounded text-sm">Copy acct</button>
                      <button onClick={()=>copy(b.accountName, 'accountName')} className="px-3 py-1 bg-slate-700 rounded text-sm">Copy name</button>
                    </div>
                  </div>
                  <div className="mt-2 text-slate-400 text-sm">Acct: {b.accountNumber} • Branch: {b.branch}</div>
                </div>
              ))}
              {copied && <div className="text-xs text-emerald-400 mt-1">{copied} copied</div>}
            </div>

            <div className="mt-4 text-sm text-slate-400">
              After sending payment, click the WhatsApp button below to send proof and optionally upload the receipt image.
            </div>

            <div className="mt-3">
              <a href={`https://wa.me/18763369045?text=${whatsappText}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
                Send payment proof on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
