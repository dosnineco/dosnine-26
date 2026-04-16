import { useState, useRef, useEffect } from 'react'
import { FiUpload, FiCheck, FiX, FiPackage, FiTruck, FiZap, FiImage, FiMinus, FiPlus } from 'react-icons/fi'
import Head from 'next/head'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const COMBO_DEALS = [
  { label: '10 Small + 10 Large', price: 11500, badge: 'MOST POPULAR' },
  { label: '5 Small + 5 Large', price: 6500 },
]

const PRICING = {
  small: {
    label: 'Small (3 inch)',
    quantities: {
      5: 2500,
      10: 4000,
      20: 7000,
    },
  },
  large: {
    label: 'Large (6 inch)',
    quantities: {
      5: 4000,
      10: 7500,
      20: 13000,
    },
  },
}

const DELIVERY = {
  halfWayTree: { label: 'Half Way Tree Area', fee: 0 },
  crossRoads: { label: 'Cross Roads Area', fee: 0 },
  newKingston: { label: 'New Kingston Area', fee: 0 },
  constantSpring: { label: 'Constant Spring Area', fee: 700 },
  portmore: { label: 'Portmore', fee: 1000 },
  knutsford: { label: 'Knutsford Express Pickup', fee: 300 },
]

export default function LogoCutting() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    business: '',
    phone: '',
    email: '',
    size: 'small',
    color: 'black',
    quantity: 5,
    deliveryArea: 'halfWayTree',
    rush: false,
    logoFile: null
  })
  
  const [logoPreview, setLogoPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState(null)
  const [showStickyBtn, setShowStickyBtn] = useState(false)
  const formRef = useRef(null)
  const fileInputRef = useRef(null)

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


  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload PNG, JPG, SVG, or PDF files only')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setFormData({ ...formData, logoFile: file })
    
    // Create preview for images only
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    } else {
      setLogoPreview(null)
    }
  }

  function removeFile() {
    setFormData({ ...formData, logoFile: null })
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function uploadLogoToSupabase(file) {
    if (!file) return null

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${fileName}`

    const { data, error } = await supabase.storage
      .from('htv-logos')
      .upload(filePath, file)

    if (error) {
      console.error('Upload error:', error)
      throw error
    }

    const { data: { publicUrl } } = supabase.storage
      .from('htv-logos')
      .getPublicUrl(filePath)

    return { url: publicUrl, filename: fileName }
  }

  async function saveOrderToDatabase(logoUrl, logoFilename) {
    const pricing = calculateTotal()
    
    const { error } = await supabase
      .from('htv_orders')
      .insert([{
        business_name: formData.business,
        phone: formData.phone,
        email: formData.email || null,
        size: formData.size,
        color: formData.color,
        quantity: parseInt(formData.quantity),
        delivery_area: formData.deliveryArea,
        rush_order: formData.rush,
        logo_url: logoUrl,
        logo_filename: logoFilename,
        subtotal: pricing.subtotal,
        delivery_fee: pricing.deliveryFee,
        total: pricing.total,
        raw_materials: [],
        raw_material_cost: 0,
        labor_cost: 0,
        other_expenses: 0,
        revenue: pricing.total,
        expenses: 0,
        profit: pricing.total,
        status: 'pending'
      }])

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    // Return a placeholder object since we can't read back due to RLS
    return { 
      id: Date.now().toString(36) + Math.random().toString(36).substring(2),
      ...pricing,
      revenue: pricing.total,
      expenses: 0,
      profit: pricing.total
    }
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function calculateTotal() {
    const sizeData = PRICING[formData.size]
    const quantity = Math.max(5, parseInt(formData.quantity) || 5)
    const exactPrice = sizeData.quantities[quantity]

    let subtotal = exactPrice ?? (() => {
      if (quantity >= 20) {
        return sizeData.quantities[20] + (quantity - 20) * Math.round(sizeData.quantities[20] / 20)
      }
      if (quantity >= 10) {
        return sizeData.quantities[10] + (quantity - 10) * Math.round(sizeData.quantities[10] / 10)
      }
      return sizeData.quantities[5] + (quantity - 5) * Math.round(sizeData.quantities[5] / 5)
    })()

    if (formData.rush) {
      subtotal = Math.round(subtotal * 1.5)
    }

    const deliveryFee = subtotal >= 10000 ? 0 : DELIVERY[formData.deliveryArea].fee

    return {
      quantity,
      subtotal: Math.round(subtotal),
      deliveryFee,
      total: Math.round(subtotal + deliveryFee),
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!formData.logoFile) {
      toast.error('Please upload your logo file')
      return
    }

    setStatus('sending')
    setUploading(true)
    
    try {
      // Upload logo to Supabase
      const { url: logoUrl, filename: logoFilename } = await uploadLogoToSupabase(formData.logoFile)
      
      // Save order to database
      const order = await saveOrderToDatabase(logoUrl, logoFilename)
      
      toast.success('Order submitted! Opening WhatsApp...')
      
      // Send to WhatsApp
      const pricing = calculateTotal()
      const whatsappText = encodeURIComponent(
        `🔥 HTV Logo Order #${order.id.substring(0, 8)}\n\n` +
        `Business: ${formData.business}\n` +
        `Phone: ${formData.phone}\n` +
        `Email: ${formData.email || 'Not provided'}\n\n` +
        `📦 Order Details:\n` +
        `Size: ${PRICING[formData.size].label}\n` +
        `Color: ${formData.color === 'black' ? '⚫ Black' : '⚪ White'}\n` +
        `Quantity: ${formData.quantity}\n` +
        `Rush: ${formData.rush ? 'Yes (+50%)' : 'No'}\n\n` +
        `🚚 Delivery: ${DELIVERY[formData.deliveryArea].label}\n\n` +
        `💰 Total: JMD ${pricing.total.toLocaleString()}\n` +
        `(Subtotal: ${pricing.subtotal.toLocaleString()} + Delivery: ${pricing.deliveryFee.toLocaleString()})\n\n` +
        `Logo uploaded: ${logoUrl}`
      )
      
      setTimeout(() => {
        window.open(`https://wa.me/18763369045?text=${whatsappText}`, '_blank')
        setStatus('success')
        setUploading(false)
        
        // Reset form
        setTimeout(() => {
          setFormData({
            business: '',
            phone: '',
            email: '',
            size: 'small',
            color: 'black',
            quantity: 5,
            deliveryArea: 'halfWayTree',
            rush: false,
            logoFile: null
          })
          setLogoPreview(null)
          setCurrentStep(1)
          setStatus(null)
        }, 3000)
      }, 1000)
      
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Failed to submit order. Please try again.')
      setStatus(null)
      setUploading(false)
    }
  }

  const pricing = calculateTotal()

  return (
    <>
      <Head>
        <title>Dosnine HTV Logo Cutting | Professional HTV Logos for Jamaica</title>
        <meta name="description" content="Professional HTV logo cutting service in Kingston, Jamaica. Black & White vinyl. Cut + weeded. Ready to press. Perfect for barbers, food spots, churches, and schools." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-white text-black">
        {status === 'sending' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-sm animate-pulse rounded-xl bg-white p-6 text-center">
              <div className="text-base font-semibold text-black">Processing...</div>
              <p className="mt-2 text-sm text-gray-600">Preparing your order</p>
            </div>
          </div>
        )}

        {/* Sticky CTA */}
        {showStickyBtn && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-white via-white to-transparent p-4 sm:hidden">
            <button
              onClick={scrollToForm}
              className="w-full rounded-xl bg-accent px-6 py-4 text-base font-bold text-white hover:bg-accent/90 transition-colors"
            >
              Get Your Logos Cut — From JMD 2,500
            </button>
          </div>
        )}

        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-16">
          {/* Hero Section */}
          <div className="text-center">
            <div className="mb-6">
              <h1 className="text-4xl font-black leading-[1.05] text-black sm:text-6xl lg:text-7xl">
                HTV LOGO CUTTING.<br />
                <span className="text-gray-800">Black or White.</span><br />
                <span className="text-gray-600">Ready to Press.</span>
              </h1>
            </div>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-700 sm:text-xl">
              High-value HTV logo cutting for quick press-ready branding. Simple black or white logos with clean cuts, fast turnaround and transparent pricing.
            </p>

            {/* Quick Stats */}
            <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-4 sm:gap-6">
              <div className="rounded-xl bg-gray-100 p-4 sm:p-6">
                <div className="text-2xl font-black text-black sm:text-3xl">1-2 Days</div>
                <div className="mt-1 text-xs font-medium text-gray-600 sm:text-sm">Delivery</div>
              </div>
              <div className="rounded-xl bg-accent p-4 text-white sm:p-6">
                <div className="text-2xl font-black sm:text-3xl">From JMD 2,500</div>
                <div className="mt-1 text-xs font-medium text-gray-300 sm:text-sm">For 5 small logos</div>
              </div>
              <div className="rounded-xl bg-gray-100 p-4 sm:p-6">
                <div className="text-2xl font-black text-black sm:text-3xl">Single-color</div>
                <div className="mt-1 text-xs font-medium text-gray-600 sm:text-sm">Black or White</div>
              </div>
            </div>

            <button
              onClick={scrollToForm}
              className="mt-10 rounded-xl bg-accent px-10 py-5 text-lg font-bold text-white transition hover:bg-accent/90"
            >
              Order Now — From JMD 2,500 →
            </button>
          </div>

          {/* Pricing Grid */}
          <div className="mt-20">
            <h2 className="mb-8 text-center text-3xl font-black text-black sm:text-4xl">Simple Pricing</h2>
            
            <div className="grid gap-6 sm:grid-cols-3">
              {Object.entries(PRICING).map(([key, data]) => {
                const quantities = Object.entries(data.quantities)
                return (
                  <div 
                    key={key}
                    className="rounded-2xl p-8 transition hover:scale-105 bg-gray-100"
                  >
                    <div className="text-sm font-bold uppercase tracking-wide text-gray-500">
                      {data.label}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">Single-size pricing</div>
                    <div className="mt-4 text-4xl font-black">
                      From JMD {quantities[0][1].toLocaleString()}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">for 5 logos</div>
                    <div className="mt-6 space-y-2 text-sm">
                      {quantities.map(([qty, price]) => (
                        <div key={qty} className="flex items-center gap-2 text-gray-700">
                          <FiCheck className="flex-shrink-0" />
                          <span>{qty} logos — JMD {price.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <FiCheck className="flex-shrink-0" />
                        <span>Black or White</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiCheck className="flex-shrink-0" />
                        <span>Fast turnaround</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiCheck className="flex-shrink-0" />
                        <span>Clean cuts, easy to press</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Combo Deals */}
            <div className="mt-8 rounded-2xl bg-gray-50 p-6">
              <h3 className="mb-2 text-center text-xl font-bold text-black">Combo Deals (BEST VALUE)</h3>
              <p className="mb-4 text-center text-sm text-gray-600">Best for businesses & bulk orders</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {COMBO_DEALS.map((combo) => (
                  <div key={combo.label} className="rounded-lg bg-gray-100 p-4 text-center">
                    <div className="text-sm font-bold text-black">{combo.label}</div>
                    <div className="mt-2 text-2xl font-black text-black">JMD {combo.price.toLocaleString()}</div>
                    {combo.badge ? (
                      <div className="mt-2 text-xs font-semibold uppercase text-accent">{combo.badge}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

         

        

          {/* Order Form - Step by Step */}
          <div ref={formRef} className="mt-20 scroll-mt-4 rounded-2xl bg-gray-100 p-6 sm:p-10">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-black sm:text-3xl">Quick Order — 3 Steps</h2>
              <div className="mt-4 flex justify-center gap-2">
                {[1, 2, 3].map(step => (
                  <div key={step} className={`h-2 w-16 rounded-full transition-colors ${
                    currentStep >= step ? 'bg-accent' : 'bg-gray-300'
                  }`} />
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Order Details */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-black">Step 1: Order Details</h3>
                  
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-black">Size</label>
                      <select
                        value={formData.size}
                        onChange={e => setFormData({ ...formData, size: e.target.value })}
                        className="block w-full rounded-lg bg-gray-50 px-4 py-3 text-black focus:outline-none"
                      >
                        {Object.entries(PRICING).map(([key, data]) => (
                          <option key={key} value={key}>
                            {data.label} — from JMD {data.quantities[5].toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-black">Color</label>
                      <select
                        value={formData.color}
                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                        className="block w-full rounded-lg bg-gray-50 px-4 py-3 text-black focus:outline-none"
                      >
                        <option value="black">⚫ Black</option>
                        <option value="white">⚪ White</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-black">Quantity (min 5)</label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, quantity: Math.max(5, formData.quantity - 1) })}
                          className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200 text-black hover:bg-gray-300 transition-colors"
                        >
                          <FiMinus className="h-5 w-5" />
                        </button>
                        <input
                          required
                          type="number"
                          min="5"
                          value={formData.quantity}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 5
                            setFormData({ ...formData, quantity: Math.max(5, val) })
                          }}
                          onBlur={e => {
                            const val = parseInt(e.target.value) || 5
                            if (val < 5) setFormData({ ...formData, quantity: 5 })
                          }}
                          className="block w-full rounded-lg bg-gray-50 px-4 py-3 text-center text-black focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                          className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
                        >
                          <FiPlus className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg bg-gray-200 p-4">
                    <input
                      type="checkbox"
                      id="rush"
                      checked={formData.rush}
                      onChange={e => setFormData({ ...formData, rush: e.target.checked })}
                      className="h-5 w-5 rounded"
                    />
                    <label htmlFor="rush" className="text-sm font-medium text-black">
                      Rush Order (+50%) — 1-2 days delivery
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full rounded-xl bg-accent px-6 py-4 text-base font-bold text-white hover:bg-accent/90 transition-colors"
                  >
                    Next: Upload Logo
                  </button>
                </div>
              )}

              {/* Step 2: Logo Upload */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-black">Step 2: Upload Your Logo</h3>
                  
                  {/* Logo Upload Area */}
                  <div>
                    <label className="mb-2 block text-sm font-bold text-black">Logo File *</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    {!formData.logoFile ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full rounded-xl bg-gray-200 p-8 text-center hover:bg-accent/10 transition-colors"
                      >
                        <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="mt-3 text-sm font-bold text-black">Click to upload logo</div>
                        <div className="mt-1 text-xs text-gray-500">PNG, JPG, SVG, or PDF • Max 10MB</div>
                      </button>
                    ) : (
                      <div className="rounded-xl bg-accent/5 p-6">
                        <div className="flex items-start gap-4">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo preview" className="h-20 w-20 rounded-lg object-contain bg-gray-200" />
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-200">
                              <FiImage className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-black truncate">{formData.logoFile.name}</div>
                            <div className="mt-1 text-xs text-gray-600">
                              {(formData.logoFile.size / 1024).toFixed(0)} KB
                            </div>
                            <button
                              type="button"
                              onClick={removeFile}
                              className="mt-2 text-xs font-medium text-red-600 hover:text-red-800"
                            >
                              Remove file
                            </button>
                          </div>
                          <FiCheck className="h-6 w-6 text-green-600 flex-shrink-0" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Design Guidelines */}
                  <div className="rounded-lg bg-gray-200 p-4">
                    <div className="text-sm font-bold text-black mb-2">✓ File Requirements</div>
                    <ul className="space-y-1 text-xs text-gray-700">
                      <li>• Flat, single-color design only</li>
                      <li>• No gradients, shadows, or outlines</li>
                      <li>• High resolution (at least 300 DPI)</li>
                      <li>• Transparent background preferred</li>
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="flex-1 rounded-xl bg-gray-200 px-6 py-4 text-base font-bold text-black hover:bg-gray-300 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!formData.logoFile) {
                          toast.error('Please upload your logo file')
                          return
                        }
                        setCurrentStep(3)
                      }}
                      disabled={!formData.logoFile}
                      className="flex-1 rounded-xl bg-accent px-6 py-4 text-base font-bold text-white hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next: Delivery
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Delivery & Contact */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-black">Step 3: Delivery & Contact</h3>
                  
                  <div>
                    <label className="mb-2 block text-sm font-bold text-black">Delivery Area *</label>
                    <select
                      value={formData.deliveryArea}
                      onChange={e => setFormData({ ...formData, deliveryArea: e.target.value })}
                      className="block w-full rounded-lg bg-gray-50 px-4 py-3 text-black focus:outline-none"
                    >
                      {Object.entries(DELIVERY).map(([key, data]) => (
                        <option key={key} value={key}>
                          {data.label} — JMD {data.fee}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-black">Business Name *</label>
                      <input
                        required
                        value={formData.business}
                        onChange={e => setFormData({ ...formData, business: e.target.value })}
                        className="block w-full rounded-lg bg-gray-50 px-4 py-3 text-black focus:outline-none"
                        placeholder="Elite Cuts Barbershop"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-black">WhatsApp Number *</label>
                      <input
                        required
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="block w-full rounded-lg bg-gray-50 px-4 py-3 text-black focus:outline-none"
                        placeholder="876-xxx-xxxx"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-black">Email (optional)</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="block w-full rounded-lg bg-gray-50 px-4 py-3 text-black focus:outline-none"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg bg-accent/5 p-5">
                    <div className="mb-3 text-sm font-bold text-black">Order Summary</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Subtotal</span>
                        <span className="font-bold text-black">JMD {pricing.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Delivery</span>
                        <span className="font-bold text-black">
                          {pricing.deliveryFee === 0 ? 'FREE' : `JMD ${pricing.deliveryFee.toLocaleString()}`}
                        </span>
                      </div>
                      <div className="pt-2 flex justify-between text-lg">
                        <span className="font-black text-black">Total</span>
                        <span className="font-black text-accent">JMD {pricing.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-700">
                      <span className="font-bold text-black">Next:</span> You'll be contacted via WhatsApp within 1-2 days to confirm delivery.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="flex-1 rounded-xl bg-gray-200 px-6 py-4 text-base font-bold text-black hover:bg-gray-300 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="flex-1 rounded-xl bg-accent px-6 py-4 text-base font-bold text-white hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? 'Uploading...' : `Complete Order`}
                    </button>
                  </div>
                </div>
              )}
            </form>

            {status === 'success' && (
              <div className="mt-6 rounded-lg bg-accent/10 p-4">
                <p className="text-center text-base font-bold text-black">
                  ✓ Order saved! Opening WhatsApp for verification...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
