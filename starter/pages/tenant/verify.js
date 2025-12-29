import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import Head from 'next/head'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

export default function TenantVerificationPage() {
  const { isSignedIn, user } = useUser()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    email: '',
    phone: '',
    
    // Step 2: Property Criteria
    requestType: 'rent',
    propertyType: 'apartment',
    location: '',
    budgetMin: '',
    budgetMax: '',
    bedrooms: 1,
    bathrooms: 1,
    moveInDate: '',
    description: '',
    
    // Step 3: Verification Question
    canProvideDocuments: '',
    
    // Step 4: Document Details
    monthlyIncome: '',
    employerName: '',
    employmentDuration: '',
    depositReady: false
  })

  const [documents, setDocuments] = useState({
    idDocument: null,
    jobLetter: null,
    payslip1: null,
    payslip2: null
  })

  const [uploadedUrls, setUploadedUrls] = useState({})
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState({})

  // Auto-fill from Clerk user data
  useEffect(() => {
    if (isSignedIn && user) {
      setFormData(prev => ({
        ...prev,
        name: user.fullName || '',
        email: user.emailAddresses?.[0]?.emailAddress || '',
        phone: user.phoneNumbers?.[0]?.phoneNumber || ''
      }))
    }
  }, [isSignedIn, user])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleFileChange = (e) => {
    const { name, files } = e.target
    if (files && files[0]) {
      // Validate file size (max 5MB)
      if (files[0].size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, [name]: 'File size must be less than 5MB' }))
        return
      }
      
      // Validate file type (images and PDFs only)
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
      if (!validTypes.includes(files[0].type)) {
        setErrors(prev => ({ ...prev, [name]: 'Only JPG, PNG, or PDF files allowed' }))
        return
      }

      setDocuments(prev => ({
        ...prev,
        [name]: files[0]
      }))
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const uploadDocument = async (file, fileName) => {
    if (!user?.id) return null

    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/${fileName}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('tenant-documents')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        })

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tenant-documents')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  const validateStep = () => {
    const newErrors = {}

    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = 'Name is required'
      if (!formData.email.trim()) newErrors.email = 'Email is required'
      if (!formData.phone.trim()) newErrors.phone = 'Phone is required'
      if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.email)) {
        newErrors.email = 'Invalid email format'
      }
    }

    if (step === 2) {
      if (!formData.location.trim()) newErrors.location = 'Location is required'
      if (!formData.budgetMax) newErrors.budgetMax = 'Budget is required'
      if (!formData.moveInDate) newErrors.moveInDate = 'Move-in date is required'
    }

    if (step === 3) {
      if (!formData.canProvideDocuments) {
        newErrors.canProvideDocuments = 'Please select an option'
      }
    }

    if (step === 4 && formData.canProvideDocuments === 'yes') {
      if (!formData.monthlyIncome) newErrors.monthlyIncome = 'Monthly income is required'
      if (!formData.employerName.trim()) newErrors.employerName = 'Employer name is required'
      if (!documents.idDocument) newErrors.idDocument = 'ID document is required'
      if (!documents.jobLetter) newErrors.jobLetter = 'Job letter is required'
      if (!documents.payslip1) newErrors.payslip1 = 'At least one payslip is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    setStep(prev => prev - 1)
    setErrors({})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateStep()) return

    setLoading(true)
    setUploading(true)

    try {
      let documentUrls = {}

      // Upload documents if provided
      if (formData.canProvideDocuments === 'yes') {
        if (documents.idDocument) {
          documentUrls.id_document_url = await uploadDocument(documents.idDocument, 'id_document')
        }
        if (documents.jobLetter) {
          documentUrls.job_letter_url = await uploadDocument(documents.jobLetter, 'job_letter')
        }
        if (documents.payslip1) {
          documentUrls.payslip_1_url = await uploadDocument(documents.payslip1, 'payslip_1')
        }
        if (documents.payslip2) {
          documentUrls.payslip_2_url = await uploadDocument(documents.payslip2, 'payslip_2')
        }
      }

      setUploading(false)

      // Create service request
      const requestData = {
        client_user_id: user?.id || null,
        client_name: formData.name,
        client_email: formData.email,
        client_phone: formData.phone,
        request_type: formData.requestType,
        property_type: formData.propertyType,
        location: formData.location,
        budget_min: parseFloat(formData.budgetMin) || null,
        budget_max: parseFloat(formData.budgetMax) || null,
        bedrooms: parseInt(formData.bedrooms) || null,
        bathrooms: parseInt(formData.bathrooms) || null,
        description: formData.description || null,
        urgency: 'normal',
        move_in_date: formData.moveInDate || null,
        
        // Verification fields
        verified_monthly_income: formData.canProvideDocuments === 'yes' 
          ? parseFloat(formData.monthlyIncome) 
          : null,
        employer_name: formData.employerName || null,
        employment_duration: formData.employmentDuration || null,
        deposit_ready: formData.depositReady,
        
        // Document URLs
        ...documentUrls,
        
        // Set verification status
        verification_status: formData.canProvideDocuments === 'yes' ? 'pending' : 'unverified'
      }

      const { error } = await supabase
        .from('service_requests')
        .insert(requestData)

      if (error) throw error

      // Mark as submitted to prevent popup on other pages
      localStorage.setItem('visitor-lead-submitted', 'true')
      
      setSubmitted(true)
      
      // Redirect to success after 3 seconds
      setTimeout(() => {
        router.push('/')
      }, 3000)

    } catch (error) {
      console.error('Submission error:', error)
      alert('Failed to submit request. Please try again.')
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  // Success screen
  if (submitted) {
    return (
      <>
        <Head>
          <title>Request Submitted | Dosnine</title>
        </Head>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {formData.canProvideDocuments === 'yes' ? '🎉 Priority Verified!' : 'Request Submitted!'}
            </h2>
            <p className="text-gray-600 mb-6">
              {formData.canProvideDocuments === 'yes' 
                ? 'Your documents are being reviewed. You\'ll be contacted within 24 hours by a verified agent with exclusive properties matching your criteria.'
                : 'We\'ve received your request and will connect you with suitable agents soon.'}
            </p>
            {formData.canProvideDocuments === 'yes' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>✨ Priority Status:</strong> You get first pick of new listings before they go public!
                </p>
              </div>
            )}
            <p className="text-sm text-gray-500">
              Redirecting to homepage...
            </p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Tenant Verification | Get Priority Access | Dosnine</title>
        <meta name="description" content="Get verified and access properties before anyone else. Upload your documents for priority tenant status." />
      </Head>
      <Header />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              🏆 Get Priority Verified
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Upload your documents to become a <strong>Priority Verified Tenant</strong> and get first pick of new properties before they go public!
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {s}
                  </div>
                  {s < 4 && <div className={`w-20 md:w-32 h-1 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600 px-2">
              <span>Basic Info</span>
              <span>Criteria</span>
              <span>Documents?</span>
              <span>Upload</span>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <form onSubmit={handleSubmit}>
              
              {/* Step 1: Basic Information */}
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Basic Information</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="John Doe"
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="john@example.com"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="+1 876-XXX-XXXX"
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={nextStep}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
                  >
                    Continue →
                  </button>
                </div>
              )}

              {/* Step 2: Property Criteria */}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">🏠 Property Criteria</h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Looking to...</label>
                      <select
                        name="requestType"
                        value={formData.requestType}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="rent">Rent</option>
                        <option value="buy">Buy</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                      <select
                        name="propertyType"
                        value={formData.propertyType}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="apartment">Apartment</option>
                        <option value="house">House</option>
                        <option value="townhouse">Townhouse</option>
                        <option value="studio">Studio</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.location ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Kingston, Portmore, Montego Bay..."
                    />
                    {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Budget (Min)</label>
                      <input
                        type="number"
                        name="budgetMin"
                        value={formData.budgetMin}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="80,000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Budget (Max) *</label>
                      <input
                        type="number"
                        name="budgetMax"
                        value={formData.budgetMax}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors.budgetMax ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="120,000"
                      />
                      {errors.budgetMax && <p className="text-red-500 text-sm mt-1">{errors.budgetMax}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                      <select
                        name="bedrooms"
                        value={formData.bedrooms}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {[1, 2, 3, 4, 5].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                      <select
                        name="bathrooms"
                        value={formData.bathrooms}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {[1, 2, 3, 4].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Move-in Date *</label>
                    <input
                      type="date"
                      name="moveInDate"
                      value={formData.moveInDate}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.moveInDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.moveInDate && <p className="text-red-500 text-sm mt-1">{errors.moveInDate}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Details</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Any specific requirements? (e.g., pet-friendly, parking, security...)"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
                    >
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Document Verification Question */}
              {step === 3 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">🎯 Get Priority Status</h2>
                  <p className="text-gray-600 mb-6">
                    Verified tenants save agents 10 hours per week. They get first access to exclusive properties!
                  </p>

                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-6 mb-6">
                    <h3 className="font-bold text-lg mb-3">🌟 Why Get Verified?</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>✅ See new listings <strong>before</strong> they go public</li>
                      <li>✅ Agents call <strong>you first</strong> with perfect matches</li>
                      <li>✅ Skip the "time-wasters" - prove you're serious</li>
                      <li>✅ Landlords trust verified tenants instantly</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-lg font-medium text-gray-900 mb-3">
                      Can you provide these documents?
                    </label>

                    <div className="space-y-3">
                      <label className={`block border-2 rounded-lg p-4 cursor-pointer transition ${
                        formData.canProvideDocuments === 'yes' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-300 hover:border-blue-300'
                      }`}>
                        <input
                          type="radio"
                          name="canProvideDocuments"
                          value="yes"
                          checked={formData.canProvideDocuments === 'yes'}
                          onChange={handleInputChange}
                          className="mr-3"
                        />
                        <span className="font-semibold">✅ Yes - I have:</span>
                        <ul className="ml-8 mt-2 text-sm text-gray-600">
                          <li>• Government ID (Driver's License/Passport)</li>
                          <li>• Job Letter from Employer</li>
                          <li>• Recent Payslips (1-2 months)</li>
                          <li className="text-xs text-gray-500 mt-1">
                            🔒 All documents are encrypted and only shown to agents you choose
                          </li>
                        </ul>
                      </label>

                      <label className={`block border-2 rounded-lg p-4 cursor-pointer transition ${
                        formData.canProvideDocuments === 'no' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-blue-300'
                      }`}>
                        <input
                          type="radio"
                          name="canProvideDocuments"
                          value="no"
                          checked={formData.canProvideDocuments === 'no'}
                          onChange={handleInputChange}
                          className="mr-3"
                        />
                        <span className="font-semibold">❌ No - I'll skip verification</span>
                        <p className="ml-8 mt-2 text-sm text-gray-600">
                          That's okay! We'll still connect you with agents, but they'll need to verify you themselves.
                        </p>
                      </label>
                    </div>

                    {errors.canProvideDocuments && (
                      <p className="text-red-500 text-sm mt-2">{errors.canProvideDocuments}</p>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep()) {
                          if (formData.canProvideDocuments === 'yes') {
                            setStep(4)
                          } else {
                            handleSubmit({ preventDefault: () => {} })
                          }
                        }
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
                    >
                      {formData.canProvideDocuments === 'yes' ? 'Continue →' : 'Submit Request'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Document Upload */}
              {step === 4 && formData.canProvideDocuments === 'yes' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">📤 Upload Documents</h2>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-yellow-800 mb-2">🔒 Privacy & Security</h3>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• You can redact/black out your bank account numbers</li>
                      <li>• We only need to see your name and final balance</li>
                      <li>• Documents are encrypted and stored securely</li>
                      <li>• Only agents you approve can view them</li>
                    </ul>
                  </div>

                  {/* Employment Details */}
                  <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900">Employment Information</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income (JMD) *</label>
                      <input
                        type="number"
                        name="monthlyIncome"
                        value={formData.monthlyIncome}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors.monthlyIncome ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="400,000"
                      />
                      {errors.monthlyIncome && <p className="text-red-500 text-sm mt-1">{errors.monthlyIncome}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employer Name *</label>
                      <input
                        type="text"
                        name="employerName"
                        value={formData.employerName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors.employerName ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="ABC Company Ltd."
                      />
                      {errors.employerName && <p className="text-red-500 text-sm mt-1">{errors.employerName}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">How long with current employer?</label>
                      <select
                        name="employmentDuration"
                        value={formData.employmentDuration}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        <option value="0-6months">0-6 months</option>
                        <option value="6-12months">6-12 months</option>
                        <option value="1-2years">1-2 years</option>
                        <option value="2-5years">2-5 years</option>
                        <option value="5+years">5+ years</option>
                      </select>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="depositReady"
                        checked={formData.depositReady}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-blue-600 mr-3"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        💰 I have my deposit ready (first month + last month + security)
                      </label>
                    </div>
                  </div>

                  {/* Document Uploads */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">Required Documents</h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        1. Government ID (Driver's License or Passport) *
                      </label>
                      <input
                        type="file"
                        name="idDocument"
                        onChange={handleFileChange}
                        accept="image/*,.pdf"
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {documents.idDocument && (
                        <p className="text-sm text-green-600 mt-1">✓ {documents.idDocument.name}</p>
                      )}
                      {errors.idDocument && <p className="text-red-500 text-sm mt-1">{errors.idDocument}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        2. Job Letter from Employer *
                      </label>
                      <input
                        type="file"
                        name="jobLetter"
                        onChange={handleFileChange}
                        accept="image/*,.pdf"
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {documents.jobLetter && (
                        <p className="text-sm text-green-600 mt-1">✓ {documents.jobLetter.name}</p>
                      )}
                      {errors.jobLetter && <p className="text-red-500 text-sm mt-1">{errors.jobLetter}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        3. Recent Payslip (Month 1) *
                      </label>
                      <input
                        type="file"
                        name="payslip1"
                        onChange={handleFileChange}
                        accept="image/*,.pdf"
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {documents.payslip1 && (
                        <p className="text-sm text-green-600 mt-1">✓ {documents.payslip1.name}</p>
                      )}
                      {errors.payslip1 && <p className="text-red-500 text-sm mt-1">{errors.payslip1}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        4. Recent Payslip (Month 2) - Optional
                      </label>
                      <input
                        type="file"
                        name="payslip2"
                        onChange={handleFileChange}
                        accept="image/*,.pdf"
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {documents.payslip2 && (
                        <p className="text-sm text-green-600 mt-1">✓ {documents.payslip2.name}</p>
                      )}
                    </div>

                    <p className="text-xs text-gray-500">
                      Max file size: 5MB per file. Formats: JPG, PNG, PDF
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={prevStep}
                      disabled={loading}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        uploading ? 'Uploading Documents...' : 'Submitting...'
                      ) : (
                        '🎉 Submit & Get Verified'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 mb-4">
              🔒 Your documents are encrypted and secure. We never share them without your permission.
            </p>
            <div className="flex justify-center gap-6 text-xs text-gray-500">
              <span>✓ SSL Encrypted</span>
              <span>✓ GDPR Compliant</span>
              <span>✓ Secure Storage</span>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </>
  )
}
