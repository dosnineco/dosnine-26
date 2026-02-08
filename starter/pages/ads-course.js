import { useState, useRef, useEffect } from 'react'
import { FiCheck, FiTrendingUp, FiTarget, FiDollarSign, FiMessageCircle, FiPlay, FiVideo } from 'react-icons/fi'
import Head from 'next/head'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const MODULES = [
  {
    title: 'Creating Ad Creatives',
    icon: FiPlay,
    lessons: [
      'Using Canva free tier for stunning ad images',
      'Remove.bg for professional product photos',
      'Mobile video editing with CapCut (free)',
      'Turn Instagram Reels into high-performing ads'
    ]
  },
  {
    title: 'Business Setup',
    icon: FiCheck,
    lessons: [
      'Facebook Business Manager setup (step-by-step)',
      'Instagram Business account optimization',
      'Linking accounts the right way',
      'Jamaica-specific business verification'
    ]
  },
  {
    title: 'Your First Ad Campaign',
    icon: FiTarget,
    lessons: [
      'Campaign objectives: Traffic vs Messages',
      'Targeting "Corporate Kingston" & local audiences',
      'Budget: Start with JMD 1,000 ($6-7 USD)',
      'Writing ad copy that Jamaicans respond to'
    ]
  },
  {
    title: 'Optimization & Scaling',
    icon: FiTrendingUp,
    lessons: [
      'Reading insights & metrics that matter',
      'WhatsApp vs Website traffic: When to use which',
      'A/B testing on small budgets',
      'Scaling campaigns that work'
    ]
  },
  {
    title: 'Results & ROI',
    icon: FiDollarSign,
    lessons: [
      'Understanding your metrics & KPIs',
      'Converting messages to actual sales',
      'Tracking ROI properly',
      'Real case study: 31 conversations from $6 spend'
    ]
  }
]

const RESULTS = [
  { views: '2,349', action: 'Website visits: 146', spend: '$3.22', roi: '45 visits per $1' },
  { views: '991', action: 'Conversations: 31', spend: '$6.00', roi: '5+ leads per $1' },
  { views: '4,729', action: 'Website visits: 261', spend: '$5.90', roi: '44 visits per $1' },
  { views: '6,579', action: 'Website visits: 294', spend: '$8.94', roi: '33 visits per $1' }
]

export default function AdsCourse() {
  const [selectedOption, setSelectedOption] = useState('video') // 'video' or 'text'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    business: '',
    currentMarketing: ''
  })
  
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const formRef = useRef(null)

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    setSubmitting(true)
    
    try {
      const isVideoCourse = selectedOption === 'video'
      const coursePrice = isVideoCourse ? 3500 : 0
      const courseName = isVideoCourse 
        ? 'PAID - Instagram/Facebook Ads Video Course (JMD 3,500)' 
        : 'FREE - Instagram/Facebook Ads Text Guide'
      
      const { error } = await supabase
        .from('course_preorders')
        .insert([{
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          price_choice: courseName,
          discounted_amount: coursePrice,
          buy_now: isVideoCourse,
          payment_confirmed: false
        }])

      if (error) {
        console.error('Database error:', error)
        throw new Error(`Failed to register: ${error.message}`)
      }

      toast.success('Registered! Opening WhatsApp...')
      
      const whatsappText = encodeURIComponent(
        `🎓 Instagram/Facebook Ads Course Registration\n\n` +
        `Name: ${formData.name}\n` +
        `Business: ${formData.business}\n` +
        `Phone: ${formData.phone}\n` +
        `Email: ${formData.email}\n\n` +
        `Selected Option: ${isVideoCourse ? '📹 Video Course - JMD 3,500' : '📄 Free Text Guide'}\n` +
        `${isVideoCourse ? 'Includes: Full video tutorials + JMD 1,500 ad spend strategy\n' : ''}\n` +
        `Current Marketing: ${formData.currentMarketing || 'Just getting started'}\n\n` +
        `I'm interested in learning how to grow my business with Instagram/Facebook ads!`
      )
      
      setTimeout(() => {
        window.open(`https://wa.me/18763369045?text=${whatsappText}`, '_blank')
        setSubmitted(true)
        
        setTimeout(() => {
          setFormData({
            name: '',
            email: '',
            phone: '',
            business: '',
            currentMarketing: ''
          })
          setSubmitted(false)
        }, 5000)
      }, 1000)
      
    } catch (error) {
      console.error('Submit error:', error)
      toast.error(`Failed: ${error.message || 'Please try again'}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Head>
        <title>FREE Instagram/Facebook Ads Course for Jamaican Businesses | Dosnine</title>
        <meta name="description" content="Learn how to grow your Jamaican business with Instagram & Facebook ads. Start with just JMD 1,000. Free course - pay it forward by helping someone else." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-white text-black">
        {submitting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-sm animate-pulse rounded-xl bg-white p-6 text-center">
              <div className="text-base font-semibold text-black">Registering...</div>
              <p className="mt-2 text-sm text-gray-600">Preparing your course access</p>
            </div>
          </div>
        )}

        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-16">
          {/* Hero Section */}
          <div className="text-center">
            <div className="mb-6">
              <div className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-800">
                📚 Choose Your Learning Path
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-[1.05] text-black">
                Grow Your Business<br />
                <span className="text-gray-800">With Instagram & Facebook Ads</span>
              </h1>
              <p className="mt-4 text-lg sm:text-xl text-gray-600 font-medium">
                For Jamaican Business Owners
              </p>
            </div>

            {/* Pricing Options */}
            <div className="mx-auto mt-10 grid max-w-4xl gap-6 grid-cols-1 sm:grid-cols-2">
              {/* Video Course Option */}
              <div 
                onClick={() => setSelectedOption('video')}
                className={`cursor-pointer rounded-2xl p-6 sm:p-8 transition-all hover:scale-105 ${
                  selectedOption === 'video' 
                    ? 'bg-accent text-white shadow-xl ring-4 ring-accent/30' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="mb-4">
                  <div className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                    selectedOption === 'video' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
                  }`}>
                    🎥 MOST POPULAR
                  </div>
                </div>
                <h3 className={`text-3xl font-black ${selectedOption === 'video' ? 'text-white' : 'text-black'}`}>
                  Video Course
                </h3>
                <div className="mt-4">
                  <span className={`text-4xl font-black ${selectedOption === 'video' ? 'text-white' : 'text-black'}`}>
                    JMD 3,500
                  </span>
                </div>
                <ul className={`mt-6 space-y-3 text-left text-sm ${selectedOption === 'video' ? 'text-white' : 'text-gray-700'}`}>
                  <li className="flex items-start gap-2">
                    <FiCheck className={`mt-0.5 h-5 w-5 flex-shrink-0 ${selectedOption === 'video' ? 'text-white' : 'text-green-600'}`} />
                    <span>Full video tutorials (step-by-step)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FiCheck className={`mt-0.5 h-5 w-5 flex-shrink-0 ${selectedOption === 'video' ? 'text-white' : 'text-green-600'}`} />
                    <span>JMD 1,500 ad spend strategy guide</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FiCheck className={`mt-0.5 h-5 w-5 flex-shrink-0 ${selectedOption === 'video' ? 'text-white' : 'text-green-600'}`} />
                    <span>How to get clients & grow business</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FiCheck className={`mt-0.5 h-5 w-5 flex-shrink-0 ${selectedOption === 'video' ? 'text-white' : 'text-green-600'}`} />
                    <span>Screen recordings + voice explanations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FiCheck className={`mt-0.5 h-5 w-5 flex-shrink-0 ${selectedOption === 'video' ? 'text-white' : 'text-green-600'}`} />
                    <span>WhatsApp support included</span>
                  </li>
                </ul>
                {selectedOption === 'video' && (
                  <div className="mt-6 rounded-lg bg-white/20 p-3">
                    <p className="text-xs font-bold text-white">✓ Selected</p>
                  </div>
                )}
              </div>

              {/* Free Text Guide Option */}
              <div 
                onClick={() => setSelectedOption('text')}
                className={`cursor-pointer rounded-2xl p-6 sm:p-8 transition-all hover:scale-105 ${
                  selectedOption === 'text' 
                    ? 'bg-accent text-white shadow-xl ring-4 ring-accent/30' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="mb-4">
                  <div className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                    selectedOption === 'text' ? 'bg-white/20 text-white' : 'bg-green-100 text-green-800'
                  }`}>
                    ✨ FREE
                  </div>
                </div>
                <h3 className={`text-3xl font-black ${selectedOption === 'text' ? 'text-white' : 'text-black'}`}>
                  Text Guide
                </h3>
                <div className="mt-4">
                  <span className={`text-4xl font-black ${selectedOption === 'text' ? 'text-white' : 'text-black'}`}>
                    JMD 0
                  </span>
                </div>
                <ul className={`mt-6 space-y-3 text-left text-sm ${selectedOption === 'text' ? 'text-white' : 'text-gray-700'}`}>
                  <li className="flex items-start gap-2">
                    <FiCheck className={`mt-0.5 h-5 w-5 flex-shrink-0 ${selectedOption === 'text' ? 'text-white' : 'text-green-600'}`} />
                    <span>Written step-by-step guide</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FiCheck className={`mt-0.5 h-5 w-5 flex-shrink-0 ${selectedOption === 'text' ? 'text-white' : 'text-green-600'}`} />
                    <span>Basic ad creation instructions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FiCheck className={`mt-0.5 h-5 w-5 flex-shrink-0 ${selectedOption === 'text' ? 'text-white' : 'text-green-600'}`} />
                    <span>Targeting & budget basics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FiCheck className={`mt-0.5 h-5 w-5 flex-shrink-0 ${selectedOption === 'text' ? 'text-white' : 'text-green-600'}`} />
                    <span>Free tools list</span>
                  </li>
                  <li className={`flex items-start gap-2 ${selectedOption === 'text' ? 'opacity-70' : 'opacity-50'}`}>
                    <span className="text-xs italic">Perfect for self-learners</span>
                  </li>
                </ul>
                {selectedOption === 'text' && (
                  <div className="mt-6 rounded-lg bg-white/20 p-3">
                    <p className="text-xs font-bold text-white">✓ Selected</p>
                  </div>
                )}
              </div>
            </div>

            <p className="mx-auto mt-8 max-w-2xl text-base sm:text-lg leading-relaxed text-gray-700 px-4">
              {selectedOption === 'video' ? (
                <>Learn with <span className="font-bold text-black">full video tutorials</span> showing exactly how to create profitable ads, even with just <span className="font-bold text-black">JMD 1,500</span> ad spend.</>
              ) : (
                <>Get a <span className="font-bold text-black">free written guide</span> to start learning Instagram & Facebook ads at your own pace. Just promise to help someone else grow their business.</>
              )}
            </p>

            {/* Results Proof */}
            <div className="mx-auto mt-10 max-w-4xl rounded-2xl bg-gray-50 p-6 sm:p-8">
              <h3 className="mb-4 text-xl sm:text-2xl font-bold text-black">Real Results from Small Budgets:</h3>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                {RESULTS.map((result, i) => (
                  <div key={i} className="rounded-xl bg-white p-4 text-left shadow-sm border border-gray-200">
                    <div className="text-2xl font-black text-black">{result.views} <span className="text-sm font-normal text-gray-600">views</span></div>
                    <div className="mt-2 text-sm text-gray-700">{result.action}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Spend: {result.spend}</span>
                      <span className="text-xs font-bold text-green-700">{result.roi}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-gray-600 italic">These are actual campaign results targeting Corporate Kingston</p>
            </div>

            <button
              onClick={scrollToForm}
              className="mt-10 rounded-xl bg-accent px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg font-bold text-white transition hover:bg-accent/90"
            >
              {selectedOption === 'video' ? '📹 Register for Video Course (JMD 3,500) →' : '📄 Get Free Text Guide →'}
            </button>
          </div>

          {/* What You'll Learn */}
          <div className="mt-20">
            <h2 className="mb-8 text-center text-3xl sm:text-4xl md:text-5xl font-black text-black">What You'll Learn</h2>
            
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map((module, idx) => {
                const Icon = module.icon
                return (
                  <div 
                    key={idx}
                    className="rounded-2xl bg-gray-50 p-6 hover:bg-gray-100 transition"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className="rounded-lg bg-accent p-2 text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-bold text-black">{module.title}</h3>
                    </div>
                    <ul className="space-y-2">
                      {module.lessons.map((lesson, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <FiCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                          <span>{lesson}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Why This Works */}
          <div className="mt-20 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 p-6 sm:p-10">
            <h2 className="mb-6 text-center text-3xl sm:text-4xl md:text-5xl font-black text-black">Why This Works for Jamaican Businesses</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-6">
                <div className="mb-3 text-3xl">🎯</div>
                <h3 className="mb-2 text-lg font-bold text-black">Local Targeting</h3>
                <p className="text-sm text-gray-700">Target specific areas like Corporate Kingston, Half Way Tree, or customers near your location.</p>
              </div>
              <div className="rounded-xl bg-white p-6">
                <div className="mb-3 text-3xl">💬</div>
                <h3 className="mb-2 text-lg font-bold text-black">WhatsApp Integration</h3>
                <p className="text-sm text-gray-700">Send traffic directly to WhatsApp. Most Jamaicans prefer messaging over website forms.</p>
              </div>
              <div className="rounded-xl bg-white p-6">
                <div className="mb-3 text-3xl">💰</div>
                <h3 className="mb-2 text-lg font-bold text-black">Small Budget Success</h3>
                <p className="text-sm text-gray-700">Get results with JMD 1,000-3,000. No need for thousands of dollars like big companies.</p>
              </div>
              <div className="rounded-xl bg-white p-6">
                <div className="mb-3 text-3xl">📱</div>
                <h3 className="mb-2 text-lg font-bold text-black">Mobile-First</h3>
                <p className="text-sm text-gray-700">Create & manage everything from your phone. No fancy computer or software needed.</p>
              </div>
            </div>
          </div>

          {/* Free Model Explanation OR Course Investment */}
          {selectedOption === 'text' ? (
            <div className="mt-20 text-center">
              <h2 className="mb-6 text-3xl sm:text-4xl md:text-5xl font-black text-black">Why Is This Free?</h2>
              <div className="mx-auto max-w-2xl rounded-2xl bg-gray-50 p-6 sm:p-8">
                <p className="text-base sm:text-lg leading-relaxed text-gray-700">
                  I believe in paying it forward. I learned this by helping others, so I'm teaching it for free.
                </p>
                <p className="mt-4 text-base sm:text-lg font-bold text-black">
                  Your only "payment": <span className="text-accent">Promise to help another small business owner grow</span>
                </p>
                
                {/* Download Button */}
                <div className="mt-8">
                  <a
                    href="/ad_ebook.pdf"
                    download="Instagram_Facebook_Ads_Guide.pdf"
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-4 text-base font-bold text-white transition hover:bg-accent/90"
                  >
                    📄 Download Free Guide (PDF)
                  </a>
                  <p className="mt-3 text-xs text-gray-500">Register below to get updates & support</p>
                </div>

                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-600">
                  <FiMessageCircle className="text-accent" />
                  <span>Questions? Message me on WhatsApp anytime</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-20 text-center">
              <h2 className="mb-6 text-3xl sm:text-4xl md:text-5xl font-black text-black">What's Included in Video Course</h2>
              <div className="mx-auto max-w-2xl rounded-2xl bg-gray-50 p-6 sm:p-8">
                <div className="grid gap-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-accent p-2 text-white">
                      <FiVideo className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-black">Full Video Tutorials</p>
                      <p className="text-sm text-gray-600">Screen recordings with voice explanations for every step</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-accent p-2 text-white">
                      <FiDollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-black">JMD 1,500 Ad Spend Strategy</p>
                      <p className="text-sm text-gray-600">Exact budget allocation + campaign structure for maximum results</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-accent p-2 text-white">
                      <FiMessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-black">WhatsApp Support</p>
                      <p className="text-sm text-gray-600">Ask questions anytime, get personalized help</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-accent p-2 text-white">
                      <FiTrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-black">Proven Campaign Templates</p>
                      <p className="text-sm text-gray-600">Copy my exact setups that got 31 conversations from $6</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 rounded-lg bg-accent/10 p-4">
                  <p className="text-sm font-bold text-black">💰 One-time payment: JMD 3,500</p>
                  <p className="mt-1 text-xs text-gray-600">Payment details sent via WhatsApp</p>
                </div>
              </div>
            </div>
          )}

          {/* Registration Form */}
          <div ref={formRef} className="mt-20 scroll-mt-4 rounded-2xl bg-gray-100 p-6 sm:p-10">
            <div className="mb-6 text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-black">
                {selectedOption === 'video' ? 'Register for Video Course' : 'Get Your Free Text Guide'}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {selectedOption === 'video' 
                  ? 'Payment details will be sent via WhatsApp after registration. JMD 3,500 one-time fee.' 
                  : 'No credit card. No payment. Just your commitment to learn & help others.'}
              </p>
            </div>

            {submitted ? (
              <div className="rounded-lg bg-green-50 p-6 text-center">
                <div className="mb-2 text-4xl">🎉</div>
                <p className="text-lg font-bold text-green-900">You're registered!</p>
                <p className="mt-2 text-sm text-green-800">
                  {selectedOption === 'video' 
                    ? 'Check WhatsApp for payment details & course access'
                    : 'Check WhatsApp for next steps'}
                </p>
                {selectedOption === 'text' && (
                  <div className="mt-4">
                    <a
                      href="/ad_ebook.pdf"
                      download="Instagram_Facebook_Ads_Guide.pdf"
                      className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-white transition hover:bg-accent/90"
                    >
                      📄 Download Your Free Guide
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-black">Your Name *</label>
                    <input
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="block w-full rounded-lg bg-gray-50 px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="John Smith"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-black">Business Name *</label>
                    <input
                      required
                      value={formData.business}
                      onChange={e => setFormData({ ...formData, business: e.target.value })}
                      className="block w-full rounded-lg bg-gray-50 px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Elite Barbershop"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-black">WhatsApp Number *</label>
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="block w-full rounded-lg bg-gray-50 px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="876-xxx-xxxx"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-black">Email *</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="block w-full rounded-lg bg-gray-50 px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-black">
                    Current Marketing (Optional)
                  </label>
                  <textarea
                    value={formData.currentMarketing}
                    onChange={e => setFormData({ ...formData, currentMarketing: e.target.value })}
                    rows={3}
                    className="block w-full rounded-lg bg-gray-50 px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Tell us how you currently market your business (Instagram posts, flyers, word of mouth, etc.)"
                  />
                </div>

                <div className="rounded-lg bg-accent/10 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      required
                      type="checkbox"
                      id="promise"
                      className="mt-1 h-5 w-5 rounded"
                    />
                    <label htmlFor="promise" className="text-sm text-gray-700">
                      <span className="font-bold text-black">I promise</span> to help at least one other small business owner grow their business after I complete this course.
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-accent px-6 py-4 text-base font-bold text-white hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Registering...' : 'Register for Free Course →'}
                </button>

                <p className="text-center text-xs text-gray-500">
                  You'll receive a WhatsApp message to confirm and get started
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
