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

  // Track conversion when form is submitted
  const trackConversion = () => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'ads_conversion_Submit_lead_form_1', {
        send_to: 'AW-CONVERSION_ID/CONVERSION_LABEL', // Replace with your actual conversion ID
        value: 0, // No fixed value - commission-based
        currency: 'JMD',
        transaction_id: submissionId
      })
    }
  }

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
      
      // Track conversion in Google Ads
      trackConversion()
      
      setStep(2) // Move to payment screen
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      toast.error(err.message || 'Error submitting. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const commissionRate = 7 // 7% commission per closed client

  const benefits = [
    'Your business displayed on our homepage',
    'Seen by thousands of property seekers monthly',
    'Direct contact info (phone, email, website)',
    'Company logo & description included',
    'Mobile & desktop visibility',
    'Featured spots get gold badge & priority placement',
    'Pay only when you close a client - 7% commission',
    'No upfront fees required'
  ]

  return (
    <>  
        {/* Google Ads Conversion Tracking */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-CONVERSION_ID');
            `
          }}
        />
      
      <Head>
        <title>Advertise Your Business — Dosnine Properties</title>
        <meta name="description" content="Get your business in front of real people looking, selling, and renting homes in Jamaica." />
      </Head>

      <div className=" py-8 px-4">
        <div className="max-w-4xl mx-auto">
          
          {step === 2 ? (
            // Agreement Screen - Commission-based Model
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-accent text-white px-8 py-10 text-center">
                <h1 className="text-4xl font-bold mb-4">You're All Set!</h1>
                <p className="text-xl text-white/90">
                  Your business profile is active. Start generating leads!
                </p>
              </div>

              <div className="px-8 py-8">
                {/* Commission Agreement */}
                <div className="bg-blue-50 border-2 border-blue-500 rounded-xl p-6 mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Commission Agreement</h2>
                  <div className="space-y-4 text-gray-700">
                    <div className="bg-white rounded-lg p-4">
                      <p className="font-semibold text-lg mb-2">How It Works:</p>
                      <p className="text-gray-600 mb-2">
                        Your business profile is now live and visible to potential clients. <strong>You only pay when you close a deal!</strong>
                      </p>
                      <p className="text-gray-600">
                        Commission rate: <span className="text-accent font-bold text-xl">7%</span> of the client's total transaction value
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <p className="font-semibold text-lg mb-2">Example:</p>
                      <ul className="text-gray-600 space-y-2">
                        <li>📝 Client hires you for J$100,000 project</li>
                        <li>💰 You pay commission: J$100,000 × 7% = <strong>J$7,000</strong></li>
                        <li>✅ You keep: J$93,000</li>
                      </ul>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <p className="font-semibold text-lg mb-2">Payment Terms:</p>
                      <ul className="text-gray-600 space-y-2">
                        <li>✓ Payment due within 7 days of closing a deal</li>
                        <li>✓ Multiple payment methods available</li>
                        <li>✓ No upfront fees or deposits required</li>
                      </ul>
                    </div>
                  </div>
                </div>

            {/*Commission Terms */}

                {/* Profile Summary */}
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Your Profile:</h3>
                <div className="bg-gray-50 rounded-xl p-6 mb-8 border-2 border-gray-200">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Business Name:</span>
                      <span className="font-semibold">{sponsorForm.company_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Plan Type:</span>
                      <span className="font-semibold">{sponsorForm.is_featured ? '⭐ Featured Spot' : 'Regular Spot'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Commission Rate:</span>
                      <span className="text-accent font-bold text-lg">7% per closed deal</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Phone:</span>
                      <span className="font-semibold">{sponsorForm.phone}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Email:</span>
                      <span className="font-semibold">{sponsorForm.email}</span>
                    </div>
                  </div>
                </div>

                {/* Commission Structure */}
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Commission Structure:</h3>
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-green-700 mb-3">Regular Spot</h4>
                    <p className="text-gray-700 mb-3">
                      Your business listed with standard visibility
                    </p>
                    <p className="text-sm text-gray-600">
                      📊 Commission: <span className="font-bold text-accent">7% of deal value</span>
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 border-2 border-yellow-500 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-yellow-700 mb-3">⭐ Featured Spot</h4>
                    <p className="text-gray-700 mb-3">
                      Premium visibility with gold badge and priority placement
                    </p>
                    <p className="text-sm text-gray-600">
                      📊 Commission: <span className="font-bold text-accent">11% of deal value</span>
                    </p>
                  </div>
                </div>

                {/* Confirmation Note */}
                <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6 text-center mb-8">
                  <p className="text-green-800 font-semibold mb-2">
                    ✅ Your profile is now LIVE!
                  </p>
                  <p className="text-green-700 text-sm">
                    Customers can now see your business. You'll be contacted at <strong>{sponsorForm.phone}</strong> when deals come through.
                  </p>
                  <p className="text-green-700 text-sm mt-2">
                    Confirmation details sent to: <strong>{sponsorForm.email}</strong>
                  </p>
                  <p className="text-green-700 text-sm mt-3 font-semibold">
                    💡 Start getting leads today - No upfront payment required!
                  </p>
                </div>

                {/* Commission Payment Terms */}
                <div className="bg-blue-50 border-2 border-blue-500 rounded-xl p-6 mb-8">
                  <h3 className="text-lg font-bold text-blue-800 mb-4">When & How You'll Pay</h3>
                  <div className="space-y-3 text-blue-700">
                    <div className="flex gap-3">
                      <span className="font-bold">1.</span>
                      <p>Customer closes a deal with you</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-bold">2.</span>
                      <p>We send you an invoice with 7% commission due</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-bold">3.</span>
                      <p>Payment due within 7 days of invoice</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-bold">4.</span>
                      <p>Multiple payment methods accepted (bank transfer, mobile money, etc.)</p>
                    </div>
                  </div>
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
                        <div className="text-sm font-semibold text-gray-500 uppercase mb-2">NO UPFRONT FEE</div>
                        <div className="text-gray-800 font-bold">Regular Spot</div>
                        <div className="text-gray-600 mt-2 text-sm">Pay only on closed deals</div>
                        <div className="mt-4 text-xl font-semibold text-accent">7% Commission</div>
                        <ul className="mt-4 text-sm text-gray-600 space-y-2 text-left">
                          <li>✓ Your business info displayed</li>
                          <li>✓ Phone, email, website links</li>
                          <li>✓ Mobile & desktop visibility</li>
                          <li>✓ Standard placement</li>
                        </ul>
                      </div>
                    </div>

                    <div className="border-2 border-accent rounded-xl p-6 bg-red-50 relative">
                      <div className="absolute -top-3 -right-3 bg-accent text-white text-sm px-4 py-1 rounded-full font-bold shadow-lg">
                        RECOMMENDED
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-gray-500 uppercase mb-2">NO UPFRONT FEE</div>
                        <div className="text-gray-800 font-bold">⭐ Featured Spot</div>
                        <div className="text-gray-600 mt-2 text-sm">Premium visibility, higher commission</div>
                        <div className="mt-4 text-xl font-semibold text-accent">11% Commission</div>
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
                      <p className="text-gray-600 mb-4 text-sm">
                        Both plans use the same 7% commission model. Choose based on visibility level.
                      </p>
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
                            <div className="text-sm font-bold text-gray-800">Regular</div>
                            <div className="text-lg font-bold text-accent mt-2">7%</div>
                            <div className="text-xs text-gray-600 mt-1">Commission</div>
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
                        
                          <div className="text-center">
                            <div className="text-sm font-bold text-gray-800">⭐ Featured</div>
                            <div className="text-lg font-bold text-accent mt-2">11%</div>
                            <div className="text-xs text-gray-600 mt-1">Commission</div>
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
                        Customers will see this number • We'll call to confirm your ad
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
                        `Activate Your Profile (7% Commission)`
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
                    <p className="font-semibold text-gray-900 mb-2">How does the commission work?</p>
                    <p className="text-gray-600">You pay 7% of each deal's value. No upfront fees. For example, a J$100,000 deal costs you J$7,000 in commission.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">When do I pay?</p>
                    <p className="text-gray-600">You only pay when you close a deal. We send you an invoice, and payment is due within 7 days.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">What if I don't close any deals?</p>
                    <p className="text-gray-600">You pay nothing! Your profile stays active and visible to potential customers indefinitely.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">What's the difference between Regular and Featured?</p>
                    <p className="text-gray-600">Regular is 7% commission, Featured is 11% commission. Featured gets a gold badge, appears first, and gets 3x more visibility for higher exposure.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">How do I know if a customer came from Dosnine?</p>
                    <p className="text-gray-600">We'll contact you when a customer wants to work with you. We confirm the deal and send you an invoice for 7% of the agreed amount.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Can I change my profile details later?</p>
                    <p className="text-gray-600">Yes! Just contact us and we'll update your information for free anytime.</p>
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
