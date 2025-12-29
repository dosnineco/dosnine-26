import { useState } from 'react'
import Head from 'next/head'
import { supabase } from '@/lib/supabase'
import { FiCopy, FiCheck, FiAlertCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'

export default function AdvertisePage() {
  const [step, setStep] = useState(1) // 1=form, 2=payment
  const [sponsorForm, setSponsorForm] = useState({
    company_name: '',
    category: 'contractor',
    description: '',
    phone: '',
    email: '',
    website: '',
    image_url: '',
    is_featured: false
  })
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [submissionId, setSubmissionId] = useState(null)

  const bankDetails = [
    {
      bank: "Scotiabank Jamaica",
      accountName: "Tahjay Thompson",
      accountNumber: "010860258",
      branch: "50575",
      branchNote: "Branch code for transfer",
      copyInstructions: "Copy account details and paste in your banking app"
    },
    {
      bank: "National Commercial Bank (NCB)",
      accountName: "Tahjay Thompson",
      accountNumber: "404386522",
      branch: "uwi",
      branchNote: "UWI Branch location",
      copyInstructions: "Copy account details and paste in your banking app"
    },
    {
      bank: "Jamaica National Bank (JN)",
      accountName: "Tahjay Thompson",
      accountNumber: "2094746895",
      branch: "Any Branch",
      branchNote: "Available at all JN branches",
      copyInstructions: "Copy account details and paste in your banking app"
    }
  ]

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    toast.success(`${field} copied!`)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSponsorSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { data, error } = await supabase
        .from('sponsor_submissions')
        .insert([{
          ...sponsorForm,
          status: 'pending_payment',
          submitted_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      setSubmissionId(data.id)
      setStep(2) // Move to payment screen
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Submission error:', err)
      toast.error(err.message || 'Error submitting. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const currentPrice = sponsorForm.is_featured ? 14970 : 8970 // JMD prices

  const benefits = [
    'Your business displayed on our homepage',
    'Seen by thousands of property seekers monthly',
    'Direct contact info (phone, email, website)',
    'Company logo & description included',
    '30-day advertising period',
    'Mobile & desktop visibility',
    'Featured spots get gold badge & priority placement',
    'Cancel or renew anytime'
  ]

  return (
    <>
      <Head>
        <title>Advertise Your Business — Dosnine Properties</title>
        <meta name="description" content="Get your business in front of real people looking, selling, and renting homes in Jamaica." />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          
          {step === 2 ? (
            // Payment Screen
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-accent text-white px-8 py-10 text-center">
                <h1 className="text-4xl font-bold mb-4">Complete Your Payment</h1>
                <p className="text-xl text-white/90">
                  Transfer payment to activate your ad
                </p>
              </div>

              <div className="px-8 py-8">
                {/* Order Summary */}
                <div className="bg-gray-50 rounded-xl p-6 mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Order Summary</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Business Name:</span>
                      <span className="font-semibold">{sponsorForm.company_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Package:</span>
                      <span className="font-semibold">{sponsorForm.is_featured ? '⭐ Featured Spot' : 'Regular Spot'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-semibold">30 days</span>
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-gray-800">Total Amount:</span>
                        <span className="text-3xl font-bold text-accent">J${currentPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

            {/*payment instructions */}

                {/* Bank Options */}
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Choose Your Bank:</h3>
                {bankDetails.map((bank, index) => {
                  const cardColors = {
                    "Scotiabank Jamaica": "bg-red-50 border-2 border-red-500",
                    "National Commercial Bank (NCB)": "bg-blue-50 border-2 border-blue-500",
                    "Jamaica National Bank (JN)": "bg-yellow-50 border-2 border-yellow-500"
                  }
                  const headerColors = {
                    "Scotiabank Jamaica": "text-red-700",
                    "National Commercial Bank (NCB)": "text-blue-700",
                    "Jamaica National Bank (JN)": "text-yellow-700"
                  }
                  return (
                    <div key={index} className={`rounded-xl p-6 mb-6 ${cardColors[bank.bank]}`}>
                      <h4 className={`text-xl font-bold mb-4 ${headerColors[bank.bank]}`}>{bank.bank}</h4>
                      <div className="space-y-3">
                        {Object.entries(bank).filter(([key]) => !['bank', 'branchNote', 'copyInstructions'].includes(key)).map(([key, value]) => (
                          <div key={key}>
                            <div className="flex justify-between items-center bg-white rounded-lg p-3">
                              <span className="text-gray-600 font-medium capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-gray-900 text-lg">{value}</span>
                                <button
                                  onClick={() => copyToClipboard(value, `${bank.bank}-${key}`)}
                                  className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-100 rounded transition"
                                >
                                  {copied === `${bank.bank}-${key}` ? <FiCheck size={20} /> : <FiCopy size={20} />}
                                </button>
                              </div>
                            </div>
                         
                          </div>
                        ))}                        
                        {/* Payment Reference Note */}
                        <div className="bg-white/80 rounded-lg p-4 mt-4 border-2 border-gray-300">
                          <h5 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                            Add This to Transfer Notes:
                          </h5>
                          <div className="bg-gray-50 rounded p-3 mb-3">
                            <p className="text-gray-900 font-mono text-xs leading-relaxed">
                              <strong>Business:</strong> {sponsorForm.company_name}<br />
                              <strong>Phone:</strong> {sponsorForm.phone}<br />
                              <strong>Amount:</strong> J${currentPrice.toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(
                              `Business: ${sponsorForm.company_name}\nPhone: ${sponsorForm.phone}\nAmount: J$${currentPrice.toLocaleString()}`,
                              `${bank.bank}-payment-reference`
                            )}
                            className="w-full bg-gray-800 hover:bg-gray-900 text-white py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                          >
                            {copied === `${bank.bank}-payment-reference` ? (
                              <>
                                <FiCheck size={18} />
                                <span className="text-sm font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <FiCopy size={18} />
                                <span className="text-sm font-semibold">Copy for Transfer Notes</span>
                              </>
                            )}
                          </button>
                          <p className="text-gray-600 text-xs mt-2 text-center">
                            💡 Helps us identify your payment faster
                          </p>
                        </div>                      </div>
                    </div>
                  )
                })}

                {/* Confirmation Note */}
                <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6 text-center">
                  <p className="text-green-800 font-semibold mb-2">
                    ✅ Your application has been received!
                  </p>
                  <p className="text-green-700 text-sm">
                    We'll call you at <strong>{sponsorForm.phone}</strong> to confirm once payment is verified.
                  </p>
                  <p className="text-green-700 text-sm mt-2">
                    Confirmation email sent to: <strong>{sponsorForm.email}</strong>
                  </p>
                </div>

                {/* Contact */}
                <div className="mt-8 text-center">
                  <p className="text-gray-600 mb-3">Questions about payment?</p>
                  <div className="flex flex-col items-center justify-center ">
                    <a href="tel:8763369045" className="text-accent font-bold text-lg hover:underline">
                      876-336-9045
                    </a>
                    <a href="mailto:dosnineco@gmail.com" className="text-accent font-bold text-lg hover:underline">
                      dosnineco@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Main Form
            <>
              {/* Header Section */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
                <div className="bg-accent text-white px-8 py-10 text-center">
                  <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    Advertise Your Business
                  </h1>
                  <p className="text-xl text-white/90 mb-2">
                    Get in front of real people looking, selling, and renting homes in Jamaica
                  </p>
                  <p className="text-2xl font-semibold mt-4">
                    20 Spots Available Per Month!
                  </p>
                </div>

                {/* What You Get */}
                <div className="px-8 py-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">What You'll Get:</h2>
                  <div className="grid md:grid-cols-2 gap-4 mb-8">
                    {benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Options */}
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Choose Your Plan:</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="border-2 border-gray-300 rounded-xl p-6 hover:border-accent transition">
                      <div className="text-center">
                        <div className="text-5xl font-bold text-gray-800">J$8,970</div>
                        <div className="text-gray-500 mt-2">per month</div>
                        <div className="mt-4 text-xl font-semibold text-gray-700">Regular Spot</div>
                        <ul className="mt-4 text-sm text-gray-600 space-y-2 text-left">
                          <li>✓ Your business info displayed</li>
                          <li>✓ Phone, email, website links</li>
                          <li>✓ 30 days visibility</li>
                          <li>✓ Mobile & desktop</li>
                        </ul>
                      </div>
                    </div>

                    <div className="border-2 border-accent rounded-xl p-6 bg-red-50 relative">
                      <div className="absolute -top-3 -right-3 bg-accent text-white text-sm px-4 py-1 rounded-full font-bold shadow-lg">
                        MOST POPULAR
                      </div>
                      <div className="text-center">
                        <div className="text-5xl font-bold text-accent">J$14,970</div>
                        <div className="text-gray-500 mt-2">per month</div>
                        <div className="mt-4 text-xl font-semibold text-gray-700">⭐ Featured Spot</div>
                        <ul className="mt-4 text-sm text-gray-700 space-y-2 text-left">
                          <li>✓ Everything in Regular</li>
                          <li>✓ <strong>Gold "Featured" badge</strong></li>
                          <li>✓ <strong>Priority placement</strong></li>
                          <li>✓ <strong>3x more visibility</strong></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Application Form */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <form onSubmit={handleSponsorSubmit}>
                  <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-gray-800 mb-3">
                      Submit Your Business Info
                    </h2>
                    <p className="text-gray-600">
                      No signup required • Takes 2 minutes • Payment instructions on next page
                    </p>
                  </div>

                  <div className="space-y-8">
                    {/* Step 1: Choose Plan */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <div className="text-xl font-bold text-gray-800 mb-4">
                        Step 1: Select Your Advertising Package
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <label className={`border-3 rounded-xl p-6 cursor-pointer transition ${
                          !sponsorForm.is_featured 
                            ? 'border-accent bg-white ring-2 ring-accent' 
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}>
                          <input
                            type="radio"
                            name="plan"
                            checked={!sponsorForm.is_featured}
                            onChange={() => setSponsorForm({...sponsorForm, is_featured: false})}
                            className="sr-only"
                          />
                          <div className="text-center">
                            <div className="text-3xl font-bold text-gray-800">J$8,970</div>
                            <div className="text-sm text-gray-600 mt-2">Regular Spot</div>
                          </div>
                        </label>
                        <label className={`border-3 rounded-xl p-6 cursor-pointer transition relative ${
                          sponsorForm.is_featured 
                            ? 'border-accent bg-red-50 ring-2 ring-accent' 
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}>
                          <input
                            type="radio"
                            name="plan"
                            checked={sponsorForm.is_featured}
                            onChange={() => setSponsorForm({...sponsorForm, is_featured: true})}
                            className="sr-only"
                          />
                          <div className="absolute -top-3 -right-3 bg-accent text-white text-xs px-3 py-1 rounded-full font-bold">
                            HOT
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-accent">J$14,970</div>
                            <div className="text-sm text-gray-600 mt-2">⭐ Featured</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Step 2: Business Name */}
                    <div>
                      <label className="block text-xl font-bold text-gray-800 mb-3">
                        Step 2: Your Business Name
                      </label>
                      <input
                        type="text"
                        value={sponsorForm.company_name}
                        onChange={(e) => setSponsorForm({...sponsorForm, company_name: e.target.value})}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-4 text-lg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        placeholder="e.g. Bob's Plumbing Services"
                        required
                      />
                    </div>

                    {/* Step 3: Phone */}
                    <div>
                      <label className="block text-xl font-bold text-gray-800 mb-3">
                        Step 3: Your Phone Number
                      </label>
                      <input
                        type="tel"
                        value={sponsorForm.phone}
                        onChange={(e) => setSponsorForm({...sponsorForm, phone: e.target.value})}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-4 text-lg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        placeholder="876-123-4567"
                        required
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        📞 Customers will see this number • We'll call to confirm your ad
                      </p>
                    </div>

                    {/* Step 4: Email */}
                    <div>
                      <label className="block text-xl font-bold text-gray-800 mb-3">
                        Step 4: Your Email Address
                      </label>
                      <input
                        type="email"
                        value={sponsorForm.email}
                        onChange={(e) => setSponsorForm({...sponsorForm, email: e.target.value})}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-4 text-lg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        placeholder="youremail@example.com"
                        required
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        📧 For confirmation and updates
                      </p>
                    </div>

                    {/* Step 5: Description */}
                    <div>
                      <label className="block text-xl font-bold text-gray-800 mb-3">
                        Step 5: Describe Your Business
                      </label>
                      <textarea
                        value={sponsorForm.description}
                        onChange={(e) => setSponsorForm({...sponsorForm, description: e.target.value})}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-4 text-lg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        rows="4"
                        placeholder="Example: Professional plumbing services in Kingston. We handle repairs, installations, and emergencies. Available 24/7 for your plumbing needs!"
                        required
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        Write something simple and clear • {sponsorForm.description.length} characters
                      </p>
                    </div>

                    {/* Step 6: Website (Optional) */}
                    <div>
                      <label className="block text-xl font-bold text-gray-800 mb-3">
                        Step 6: Website (Optional)
                      </label>
                      <input
                        type="url"
                        value={sponsorForm.website}
                        onChange={(e) => setSponsorForm({...sponsorForm, website: e.target.value})}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-4 text-lg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        placeholder="https://yourwebsite.com"
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        🌐 If you have one, we'll add a "Visit Website" button
                      </p>
                    </div>

                

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full btn-primary disabled:bg-gray-400 disabled:cursor-not-allowed text-xl py-6 shadow-xl text-white"
                    >
                      {submitting ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          Sending...
                        </div>
                      ) : (
                        `Continue to Payment (J$${currentPrice.toLocaleString()})`
                      )}
                    </button>

                    <div className="text-center space-y-2">
                      <p className="text-sm text-gray-500">
                        Questions? We're here to help!
                      </p>
                      <div className="flex items-center justify-center gap-4 text-sm">
                        <a href="tel:8763369045" className="text-accent font-semibold hover:underline">
                          📞 876-336-9045
                        </a>
                        <span className="text-gray-400">•</span>
                        <a href="mailto:dosnineco@gmail.com" className="text-accent font-semibold hover:underline">
                          ✉️ dosnineco@gmail.com
                        </a>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* FAQ Section */}
              <div className="mt-8 bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Frequently Asked Questions</h3>
                <div className="space-y-6">
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">How long will my ad run?</p>
                    <p className="text-gray-600">30 days from the date your payment is confirmed.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">How quickly does my ad go live?</p>
                    <p className="text-gray-600">Within 24 hours of receiving your payment. Usually faster!</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Can I change my ad details later?</p>
                    <p className="text-gray-600">Yes! Just call or email us and we'll update it for free.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">What's the difference between Regular and Featured?</p>
                    <p className="text-gray-600">Featured ads get a gold badge, appear first, and get 3x more clicks.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
