import React, { useState, useRef } from 'react'
import { ChevronRight, ChevronLeft, Upload, CheckCircle, Package, Box, Ruler, Sparkles, Lightbulb, Loader, Check, Download } from 'lucide-react'
import toast from 'react-hot-toast'

const PRICING = {
  small: {
    label: 'Small (3 inch wide)',
    description: 'Perfect for pocket-sized logos',
    packs: { 5: 2750, 10: 4400, 20: 7700 },
  },
  large: {
    label: 'Large (6 inch wide)',
    description: 'Great for medium-sized applications',
    packs: { 5: 4400, 10: 8250, 20: 14300 },
  },
  xlarge: {
    label: 'Xtra Large (10 inch wide)',
    description: 'Best for large logos and signs',
    packs: { 5: 7150, 10: 13750, 20: 25300 },
  },
}



const CONVERSION_CHARGE = 500
const SAMPLE_LOGOS = [
  '/logos/c5b4106c-f2ba-4cf0-8bdb-940fb44068a4.png',
  '/logos/2178ecd9-88e7-497b-993b-1ca4c96692ee.png',
  '/logos/291a49f3-a6d9-4540-9752-ef8e8b380e9b.png',
  '/logos/203c52af-39c0-46e4-8c30-2d378e24525c.png',
]

export default function HtvOrderPage() {
  const [step, setStep] = useState(1)
  const [selectedSize, setSelectedSize] = useState(null)
  const [selectedPack, setSelectedPack] = useState(null)
  const [selectedColor, setSelectedColor] = useState('white')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    logo_file: null,
    logo_preview: null,
    business_name: '',
    location: '',
    email: '',
    phone: '',
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

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
      setFormData((prev) => ({
        ...prev,
        logo_file: file,
        logo_preview: event.target.result,
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleDownloadLogo = () => {
    if (!formData.logo_file) return
    const url = URL.createObjectURL(formData.logo_file)
    const link = document.createElement('a')
    link.href = url
    link.download = formData.logo_file.name || 'logo.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Logo downloaded successfully')
  }

  const calculateTotal = () => {
    if (selectedSize && selectedPack) return PRICING[selectedSize].packs[selectedPack] || 0
    return 0
  }

  const totalAmount = calculateTotal() + CONVERSION_CHARGE
  const canProceedStep1 = formData.logo_file
  const canProceedStep2 = formData.business_name
  const canProceedStep3 = true
  const canProceedStep4 = formData.email
  const canProceedStep5 = formData.phone
  const canProceedStep6 = selectedSize
  const canProceedStep7 = selectedSize && selectedPack
  const canProceedStep8 = selectedColor

  const handleSubmitOrder = async () => {
    if (!canProceedStep8) {
      toast.error('Please complete all fields')
      return
    }
    setSubmitting(true)
    try {
      let logoUrl = 'manual-entry'
      let logoFilename = 'manual-entry'

      // Upload logo to Supabase Storage if provided
      if (formData.logo_file && formData.logo_preview) {
        try {
          console.log('Starting logo upload for:', formData.logo_file.name)
          const logoDataUrl = await fileToDataUrl(formData.logo_file)
          
          const uploadResponse = await fetch('/api/admin/upload-logo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file: logoDataUrl,
              filename: formData.logo_file.name,
            }),
          })

          const uploadData = await uploadResponse.json()

          if (uploadResponse.ok && uploadData.logoUrl) {
            logoUrl = uploadData.logoUrl
            logoFilename = uploadData.filename
            console.log('Logo uploaded successfully:', logoUrl)
            toast.success('Logo uploaded successfully')
          } else {
            console.error('Logo upload failed:', uploadData)
            throw new Error(uploadData.error || 'Logo upload failed')
          }
        } catch (uploadErr) {
          console.error('Logo upload error:', uploadErr)
          toast.error('Logo upload failed. Please try again.')
          setSubmitting(false)
          return
        }
      }

      const price = PRICING[selectedSize].packs[selectedPack]
      const payload = {
        business_name: formData.business_name,
        location: formData.location,
        email: formData.email,
        phone: formData.phone,
        color: selectedColor,
        size: selectedSize,
        quantity: selectedPack,
        delivery_area: formData.location || 'Not provided',
        subtotal: price.toFixed(2),
        delivery_fee: '0.00',
        total: (price + CONVERSION_CHARGE).toFixed(2),
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
      }

      console.log('Submitting order with logo_url:', logoUrl)
      const response = await fetch('/api/admin/htv-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok || !data?.success) throw new Error(data?.error || 'Failed to submit order')
      setStep(9)
      toast.success('Order submitted! An agent will contact you via WhatsApp soon.')
    } catch (err) {
      console.error('Order submission failed', err)
      toast.error(err.message || 'Failed to submit order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingTop: '20px', paddingBottom: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', paddingLeft: '16px', paddingRight: '16px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#666' }}>Step {step} of 9</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#666' }}>{Math.round((step / 9) * 100)}% Complete</span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ height: '100%', backgroundColor: '#2563EB', width: `${(step / 9) * 100}%`, transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {step === 1 && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Welcome to Dosnine HTV</h1>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>Let's start with your logo</p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>Upload Your Logo*</label>
              <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed #2563EB', borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#f0f4ff' }}>
                {formData.logo_preview ? (
                  <div>
                    <img src={formData.logo_preview} alt="Logo preview" style={{ maxHeight: '120px', marginBottom: '12px' }} />
                    <p style={{ fontSize: '13px', color: '#666', margin: '0 0 12px 0' }}>Click to change logo</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownloadLogo()
                      }}
                      style={{ padding: '8px 16px', backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload size={40} style={{ color: '#2563EB', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '16px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>Click to upload or drag & drop</p>
                    <p style={{ fontSize: '13px', color: '#999', margin: '0' }}>PNG, JPG up to 10MB</p>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleLogoUpload} />
            </div>

            <button onClick={() => setStep(2)} disabled={!canProceedStep1} style={{ width: '100%', padding: '12px', backgroundColor: canProceedStep1 ? '#2563EB' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: canProceedStep1 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              Next <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Business Name</h1>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>What's your business name?</p>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>Business Name*</label>
              <input type="text" name="business_name" value={formData.business_name} onChange={handleInputChange} placeholder="Your business name" style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} autoFocus />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '12px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><ChevronLeft size={18} /> Back</button>
              <button onClick={() => setStep(3)} disabled={!canProceedStep2} style={{ flex: 1, padding: '12px', backgroundColor: canProceedStep2 ? '#2563EB' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: canProceedStep2 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>Next <ChevronRight size={18} /></button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Location</h1>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>Where are you located?</p>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>Location</label>
              <input type="text" name="location" value={formData.location} onChange={handleInputChange} placeholder="Kingston, Portmore, etc." style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} autoFocus />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: '12px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><ChevronLeft size={18} /> Back</button>
              <button onClick={() => setStep(4)} disabled={!canProceedStep3} style={{ flex: 1, padding: '12px', backgroundColor: canProceedStep3 ? '#2563EB' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: canProceedStep3 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>Next <ChevronRight size={18} /></button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Email Address</h1>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>What's your email address?</p>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>Email*</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="your@email.com" style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} autoFocus />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(3)} style={{ flex: 1, padding: '12px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><ChevronLeft size={18} /> Back</button>
              <button onClick={() => setStep(5)} disabled={!canProceedStep4} style={{ flex: 1, padding: '12px', backgroundColor: canProceedStep4 ? '#2563EB' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: canProceedStep4 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>Next <ChevronRight size={18} /></button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Phone Number</h1>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>What's your phone number?</p>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>Phone Number*</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="876-XXX-XXXX" style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} autoFocus />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(4)} style={{ flex: 1, padding: '12px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><ChevronLeft size={18} /> Back</button>
              <button onClick={() => setStep(6)} disabled={!canProceedStep5} style={{ flex: 1, padding: '12px', backgroundColor: canProceedStep5 ? '#2563EB' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: canProceedStep5 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>Next <ChevronRight size={18} /></button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Select Size</h1>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>Choose the size that works best for your logo</p>

            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}><Ruler size={18} /> Size Options</h2>
              <div style={{ display: 'grid', gap: '12px' }}>
                {Object.entries(PRICING).map(([key, size]) => (
                  <div key={key} onClick={() => setSelectedSize(key)} style={{ padding: '16px', border: selectedSize === key ? '2px solid #2563EB' : '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', backgroundColor: selectedSize === key ? '#fff9f7' : '#fff' }}>
                    <p style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 4px 0', color: '#333' }}>{size.label}</p>
                    <p style={{ fontSize: '13px', color: '#999', margin: '0' }}>{size.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(5)} style={{ flex: 1, padding: '12px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><ChevronLeft size={18} /> Back</button>
              <button onClick={() => setStep(7)} disabled={!canProceedStep6} style={{ flex: 1, padding: '12px', backgroundColor: canProceedStep6 ? '#2563EB' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: canProceedStep6 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>Next <ChevronRight size={18} /></button>
            </div>
          </div>
        )}

        {step === 7 && selectedSize && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Select Quantity</h1>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>{PRICING[selectedSize].label}</p>

            <div style={{ display: 'grid', gap: '12px', marginBottom: '30px' }}>
              {Object.entries(PRICING[selectedSize].packs).map(([packSize, price]) => (
                <div key={packSize} onClick={() => setSelectedPack(Number(packSize))} style={{ padding: '20px', border: selectedPack === Number(packSize) ? '2px solid #2563EB' : '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', backgroundColor: selectedPack === Number(packSize) ? '#fff9f7' : '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Package size={24} style={{ color: '#2563EB' }} />
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>{packSize} Pack</span>
                  </div>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: '#2563EB' }}>JMD {price.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(6)} style={{ flex: 1, padding: '12px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><ChevronLeft size={18} /> Back</button>
              <button onClick={() => setStep(8)} disabled={!canProceedStep7} style={{ flex: 1, padding: '12px', backgroundColor: canProceedStep7 ? '#2563EB' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: canProceedStep7 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>Next <ChevronRight size={18} /></button>
            </div>
          </div>
        )}

        {step === 8 && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Choose Color & Review</h1>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>Your logo will be converted to vinyl in your chosen color</p>

            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}><Sparkles size={18} /> Sample Converted Logos</h2>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>Here's how your logo will look after conversion to vinyl</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '30px' }}>
                {SAMPLE_LOGOS.map((logo, idx) => (
                  <div key={idx} style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                    <img src={logo} alt={`Sample logo ${idx + 1}`} style={{ maxHeight: '120px', margin: '0 auto' }} />
                  </div>
                ))}
              </div>
              <div style={{ padding: '16px', backgroundColor: '#fef3e2', borderRadius: '8px', borderLeft: '4px solid #2563EB', marginBottom: '30px' }}>
                <p style={{ fontSize: '14px', color: '#666', margin: '0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lightbulb size={16} style={{ color: '#2563EB' }} />
                  <span><strong>Logo Conversion:</strong> Your logo will be professionally converted to vinyl format to ensure crisp, clean cuts at any size. This conversion service is included as a JMD {CONVERSION_CHARGE.toLocaleString()} processing fee.</span>
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#333' }}>Select Vinyl Color</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {['white','black'].map((color) => (
                  <div key={color} onClick={() => setSelectedColor(color)} style={{ padding: '20px', border: selectedColor === color ? '2px solid #2563EB' : '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', backgroundColor: selectedColor === color ? '#fff9f7' : '#fff', textAlign: 'center' }}>
                    <div style={{ width: '60px', height: '60px', backgroundColor: color === 'black' ? '#000' : '#fff', border: color === 'white' ? '2px solid #e5e7eb' : 'none', borderRadius: '8px', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '16px', fontWeight: '600', color: '#333', margin: '0', textTransform: 'capitalize' }}>{color}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '30px', border: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#333' }}>📋 Order Summary</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span style={{ color: '#666' }}>Logo Cutting:</span>
                <span style={{ fontWeight: '600', color: '#333' }}>JMD {calculateTotal().toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ color: '#666' }}>Logo Conversion Charge:</span>
                <span style={{ fontWeight: '600', color: '#2563EB' }}>JMD {CONVERSION_CHARGE.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700' }}>
                <span style={{ color: '#333' }}>Total Amount:</span>
                <span style={{ color: '#2563EB' }}>JMD {totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(7)} style={{ flex: 1, padding: '12px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><ChevronLeft size={18} /> Back</button>
              <button onClick={handleSubmitOrder} disabled={!canProceedStep8 || submitting} style={{ flex: 1, padding: '12px', backgroundColor: canProceedStep8 && !submitting ? '#2563EB' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: canProceedStep8 && !submitting ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {submitting ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : <><Check size={16} /> Submit Order</>}
              </button>
            </div>
          </div>
        )}

        {step === 9 && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
            <CheckCircle size={56} style={{ color: '#2563EB', margin: '0 auto 20px' }} />
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Order Submitted!</h1>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>Your order has been received successfully.</p>

            <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '4px solid #10b981', marginBottom: '30px' }}>
              <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                <strong>📱 Next Step:</strong> An agent from our team will contact you via WhatsApp within the next 2 hours with a detailed invoice and delivery instructions.
              </p>
            </div>

            <div style={{ padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '8px', marginBottom: '30px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: '#333' }}>Order Details</h3>
              <div style={{ textAlign: 'left', display: 'inline-block' }}>
                <div style={{ marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: '#666' }}>Business Name:</span> <strong>{formData.business_name}</strong>
                </div>
                <div style={{ marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: '#666' }}>Location:</span> <strong>{formData.location || 'Not provided'}</strong>
                </div>
                <div style={{ marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: '#666' }}>Contact:</span> <strong>{formData.phone}</strong>
                </div>
                <div style={{ marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: '#666' }}>Email:</span> <strong>{formData.email}</strong>
                </div>
                <div style={{ fontSize: '14px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                  <span style={{ color: '#666' }}>Total Amount:</span> <strong style={{ color: '#2563EB', fontSize: '16px' }}>JMD {totalAmount.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            
          </div>
        )}
      </div>
    </div>
  )
}
