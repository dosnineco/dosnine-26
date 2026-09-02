import { useState, useRef } from 'react'
import Head from 'next/head'
import toast from 'react-hot-toast'
import { ChevronLeft, Upload, CheckCircle, Loader, Check, Copy, AlertCircle, Sparkles } from 'lucide-react'

const QUANTITIES = [5, 10, 20]

const SIZES = {
  small: {
    label: '3"',
    sub: 'Small',
    bestFor: 'Best for caps, pockets & small items',
    packs: { 5: 2750, 10: 4400, 20: 7700 },
  },
  large: {
    label: '6"',
    sub: 'Large',
    bestFor: 'Best for t-shirts & bags',
    packs: { 5: 4400, 10: 8250, 20: 14300 },
  },
  xlarge: {
    label: '10"',
    sub: 'Xtra Large',
    bestFor: 'Best for jackets, banners & signage',
    packs: { 5: 7150, 10: 13750, 20: 25300 },
  },
}

const CONVERSION_CHARGE = 500

// Sample before/after pairs showing a raw logo converted into clean, cut-ready vinyl artwork
const CONVERSION_SAMPLES = [
  '/logos/c5b4106c-f2ba-4cf0-8bdb-940fb44068a4.png',
  '/logos/2178ecd9-88e7-497b-993b-1ca4c96692ee.png',
  '/logos/291a49f3-a6d9-4540-9752-ef8e8b380e9b.png',
  '/logos/203c52af-39c0-46e4-8c30-2d378e24525c.png',
]

const KNUTSFORD_LOCATIONS = [
  'Angels (Spanish Town), St. Catherine',
  'Drax Hall, St. Ann',
  'Falmouth, Trelawny',
  'Gutters, St. Elizabeth',
  'Harbour View, Kingston',
  'New Kingston, Kingston',
  'Luana, St. Elizabeth',
  'Lucea, Hanover',
  'Mandeville, Manchester',
  'May Pen, Clarendon',
  'Montego Bay (Pier 1), St. James',
  'Montego Bay Airport, St. James',
  'Negril, Westmoreland',
  'Ocho Rios, St. Ann',
  'Port Antonio, Portland',
  'Port Maria, St. Mary',
  'Portmore, St. Catherine',
  'Savanna-La-Mar, Westmoreland',
  'Washington Boulevard, Kingston',
]

const bankDetails = [
  {
    bank: 'Scotiabank Jamaica',
    accountName: 'Tahjay Thompson',
    accountNumber: '010860258',
    branch: '50575',
  },
]

// Extrapolate a per-unit rate from the nearest pack tier for custom quantities
const computePrice = (sizeKey, qty) => {
  if (!sizeKey || !qty) return 0
  const packs = SIZES[sizeKey].packs
  if (packs[qty] !== undefined) return packs[qty]
  if (qty > 20) return packs[20] + (qty - 20) * Math.round(packs[20] / 20)
  if (qty > 10) return packs[10] + (qty - 10) * Math.round(packs[10] / 10)
  if (qty > 5) return packs[5] + (qty - 5) * Math.round(packs[5] / 5)
  return Math.round((packs[5] / 5) * qty)
}

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return ''
  return input.trim().replace(/[<>]/g, '')
}

const validatePhone = (phone) => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/
  return phoneRegex.test(phone) && phone.length >= 7
}

const escapeHtml = (text) => {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, (char) => map[char])
}

const formatCurrency = (amount) => `JMD ${amount.toLocaleString()}`


export default function LogoPage() {
  const [step, setStep] = useState(1)
  const [quantity, setQuantity] = useState(null)
  const [customQuantity, setCustomQuantity] = useState('')
  const [showMinQtyNotice, setShowMinQtyNotice] = useState(false)
  const [size, setSize] = useState(null)
  const [color, setColor] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [customerName, setCustomerName] = useState('')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const fileInputRef = useRef(null)

  const price = computePrice(size, quantity)
  const total = price + CONVERSION_CHARGE

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      setLogoFile(file)
      setLogoPreview(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    toast.success('Copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmitOrder = async () => {
    if (!customerName || customerName.trim().length < 2) {
      toast.error('Enter your name')
      return
    }
    if (!deliveryLocation) {
      toast.error('Pick a Knutsford Express pickup location')
      return
    }
    if (!validatePhone(phone)) {
      toast.error('Enter a valid WhatsApp number')
      return
    }

    setSubmitting(true)
    try {
      let logoUrl = 'manual-entry'
      let logoFilename = 'manual-entry'

      if (logoFile && logoPreview) {
        try {
          const logoDataUrl = await fileToDataUrl(logoFile)
          const uploadResponse = await fetch('/api/admin/upload-logo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: logoDataUrl, filename: logoFile.name }),
          })
          const uploadData = await uploadResponse.json()
          if (uploadResponse.ok && uploadData.logoUrl) {
            logoUrl = uploadData.logoUrl
            logoFilename = uploadData.filename
          } else {
            throw new Error(uploadData.error || 'Logo upload failed')
          }
        } catch (uploadErr) {
          console.error('Logo upload error:', uploadErr)
          toast.error('Logo upload failed. Please try again.')
          setSubmitting(false)
          return
        }
      }

      const payload = {
        business_name: escapeHtml(customerName.trim()),
        phone: sanitizeInput(phone),
        email: '',
        location: escapeHtml(deliveryLocation),
        color,
        size,
        quantity,
        subtotal: price.toFixed(2),
        delivery_fee: '0.00',
        total: total.toFixed(2),
        expenses: CONVERSION_CHARGE.toFixed(2),
        revenue: price.toFixed(2),
        status: 'pending',
        rush_order: false,
        logo_url: logoUrl,
        logo_filename: logoFilename,
        raw_material_cost: '0.00',
        labor_cost: '0.00',
        other_expenses: '0.00',
        profit: '0.00',
        notes: `Customer: ${escapeHtml(customerName.trim())}`,
      }

      const response = await fetch('/api/admin/htv-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Failed to submit order')

      setOrderPlaced(true)
      setStep(5)
    } catch (err) {
      console.error('Order submission failed', err)
      toast.error(err.message || 'Failed to submit order')
    } finally {
      setSubmitting(false)
    }
  }

  const whatsappText = encodeURIComponent(
    `Hello Dosnine, I just placed a logo cutting order (${quantity} x ${size ? SIZES[size].sub : ''}, ${color || ''}). Name: ${customerName}. Pickup: ${deliveryLocation}. Amount: ${formatCurrency(total)}. Sending payment proof now.`
  )

  const totalSteps = 4
  const progress = Math.min(step, totalSteps) / totalSteps * 100

  return (
    <>
      <Head>
        <title>Custom Logo Cutting — Dosnine</title>
        <meta name="description" content="Order custom vinyl logo cutting from Dosnine. Fast turnaround, simple pricing." />
      </Head>

      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-md mx-auto">
          {step <= totalSteps && (
            <div className="mb-6">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Step 1: Quantity */}
          {step === 1 && (
            <div className="bg-white rounded-2xl p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">How many logos do you need?</h1>
              <p className="text-sm text-gray-600 mb-6">Pick a pack size to get started</p>
              <div className="grid gap-3 mb-4">
                {QUANTITIES.map((qty) => (
                  <button
                    key={qty}
                    onClick={() => { setQuantity(qty); setStep(2) }}
                    className="w-full text-left rounded-xl border-2 border-gray-200 hover:border-accent px-5 py-5 transition"
                  >
                    <span className="text-lg font-bold text-gray-900">{qty} logos</span>
                  </button>
                ))}
              </div>

              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Or enter a custom amount (5 minimum)</p>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={customQuantity}
                  onChange={(e) => setCustomQuantity(e.target.value)}
                  placeholder="e.g. 15"
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-base focus:border-accent focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (Number(customQuantity) < 5) {
                      setShowMinQtyNotice(true)
                      return
                    }
                    setQuantity(Number(customQuantity))
                    setStep(2)
                  }}
                  disabled={!(Number(customQuantity) > 0)}
                  className="rounded-xl bg-accent text-white font-bold px-6 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Go
                </button>
              </div>

              {showMinQtyNotice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                  <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Minimum order is 5</h2>
                    <p className="text-sm text-gray-600 mb-6">We'll set your quantity to 5 logos to continue.</p>
                    <button
                      onClick={() => {
                        setCustomQuantity('5')
                        setQuantity(5)
                        setShowMinQtyNotice(false)
                        setStep(2)
                      }}
                      className="w-full py-3 rounded-xl bg-accent text-white font-bold"
                    >
                      Continue with 5
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Size */}
          {step === 2 && (
            <div className="bg-white rounded-2xl p-6">
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm font-semibold text-gray-500 mb-4">
                <ChevronLeft size={18} /> Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Choose your size</h1>
              <p className="text-sm text-gray-600 mb-6">{quantity} logos — pick a size</p>
              <div className="grid gap-3">
                {Object.entries(SIZES).map(([key, data]) => (
                  <button
                    key={key}
                    onClick={() => { setSize(key); setStep(3) }}
                    className="w-full flex items-center justify-between rounded-xl border-2 border-gray-200 hover:border-accent px-5 py-5 transition"
                  >
                    <div className="text-left">
                      <div className="text-lg font-bold text-gray-900">{data.label} {data.sub}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{data.bestFor}</div>
                    </div>
                    <div className="text-lg font-bold text-accent">{formatCurrency(computePrice(key, quantity))}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Upload logo, preview conversion, pick color */}
          {step === 3 && (
            <div className="bg-white rounded-2xl p-6">
              <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm font-semibold text-gray-500 mb-4">
                <ChevronLeft size={18} /> Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Upload your logo</h1>
              <p className="text-sm text-gray-600 mb-6">{quantity} x {SIZES[size].sub} ({SIZES[size].label}) — {formatCurrency(price)}</p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-accent rounded-xl p-8 text-center cursor-pointer bg-accent/5 mb-6"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="max-h-32 mx-auto" />
                ) : (
                  <>
                    <Upload size={36} className="text-accent mx-auto mb-3" />
                    <p className="font-semibold text-gray-900">Tap to upload</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleLogoUpload} />

              {logoFile && (
                <>
                  <div className="mb-6">
                    <p className="flex items-center gap-1 text-sm font-semibold text-gray-900 mb-2">
                      <Sparkles size={16} className="text-accent" /> Your logo is cut into clean vinyl like this
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {CONVERSION_SAMPLES.map((logo, idx) => (
                        <div key={idx} className="rounded-lg bg-gray-50 p-2">
                          <img src={logo} alt={`Converted sample ${idx + 1}`} className="w-full h-auto" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Choose your vinyl material</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['black', 'white'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setColor(c)}
                          className={`rounded-xl border-2 py-4 flex flex-col items-center gap-2 transition ${color === c ? 'border-accent' : 'border-gray-200'}`}
                        >
                          <span
                            className="w-10 h-10 rounded-full"
                            style={{ backgroundColor: c === 'black' ? '#000' : '#fff', border: c === 'white' ? '2px solid #e5e7eb' : 'none' }}
                          />
                          <span className="text-sm font-bold text-gray-900 capitalize">{c}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={() => setStep(4)}
                disabled={!logoFile || !color}
                className="w-full py-4 rounded-xl bg-accent text-white font-bold text-base disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 4: Customer details */}
          {step === 4 && (
            <div className="bg-white rounded-2xl p-6">
              <button onClick={() => setStep(3)} className="flex items-center gap-1 text-sm font-semibold text-gray-500 mb-4">
                <ChevronLeft size={18} /> Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Your details</h1>
              <p className="text-sm text-gray-600 mb-6">So we can prepare and deliver your order</p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Customer name</label>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-base focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">WhatsApp number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="876-XXX-XXXX"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-base focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Delivery — Knutsford Express location</label>
                  <select
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-base focus:border-accent focus:outline-none"
                  >
                    <option value="">Select a pickup location</option>
                    {KNUTSFORD_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 mb-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{quantity} x {SIZES[size].sub}</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(price)}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-gray-200">
                  <span className="text-gray-600">Logo conversion fee</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(CONVERSION_CHARGE)}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-accent">{formatCurrency(total)}</span>
                </div>
              </div>

              <button
                onClick={handleSubmitOrder}
                disabled={submitting}
                className="w-full py-4 rounded-xl bg-accent text-white font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader size={18} className="animate-spin" /> Placing order...</> : <><Check size={18} /> Place order</>}
              </button>
            </div>
          )}

          {/* Step 5: Payment */}
          {step === 5 && orderPlaced && (
            <div className="bg-white rounded-2xl p-6">
              <div className="text-center mb-6">
                <CheckCircle size={56} className="text-accent mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Order placed!</h1>
                <p className="text-sm text-gray-600">Now let's get you paid up so we can start cutting</p>
              </div>

              <div className="bg-gray-50 border-l-4 border-accent rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-accent flex-shrink-0 mt-0.5" size={18} />
                  <div className="flex-1 text-sm text-gray-700">
                    <p className="font-bold text-gray-900 mb-2">How to pay</p>
                    {bankDetails.map((bank) => (
                      <div key={bank.accountNumber} className="bg-white rounded-lg p-3 space-y-1">
                        {[
                          ['Bank', bank.bank],
                          ['Account name', bank.accountName],
                          ['Account number', bank.accountNumber],
                          ['Branch', bank.branch],
                          ['Amount', formatCurrency(total)],
                        ].map(([label, value]) => {
                          const field = `logo-${label}`
                          return (
                            <div key={label} className="flex items-center justify-between gap-2">
                              <span><strong>{label}:</strong> {value}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(String(value), field)}
                                className="shrink-0 p-1 text-gray-400 hover:text-accent transition"
                                aria-label={`Copy ${label}`}
                              >
                                {copied === field ? <Check size={16} /> : <Copy size={16} />}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                    <p className="text-xs text-gray-500 mt-2">Send your payment proof on WhatsApp after placing the order below.</p>
                  </div>
                </div>
              </div>

              <a
                href={`https://wa.me/18763369045?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-bold py-4 px-4 rounded-xl transition text-base"
              >
                Send Payment Proof on WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

