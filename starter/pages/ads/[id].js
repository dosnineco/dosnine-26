import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import Head from 'next/head'
import Link from 'next/link'
import { Star, Eye, MousePointerClick, Tag, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'


export default function AdDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [ad, setAd] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [message, setMessage] = useState('')
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)
  const { isSignedIn, user } = useUser()
  const { getToken } = useAuth()

  const adImages = Array.isArray(ad?.image_urls) && ad.image_urls.length > 0
    ? ad.image_urls.slice(0, 3)
    : (ad?.image_url ? [ad.image_url] : [])

  const adUrl = typeof window !== 'undefined'
    ? window.location.href
    : `https://dosnine.com/ads/${id || ''}`

  useEffect(() => {
    if (id) {
      loadAd()
      trackClick()
      setCurrentImageIndex(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false)
      }
    }
    
    if (isFullscreen) {
      document.addEventListener('keydown', handleEscKey)
      return () => document.removeEventListener('keydown', handleEscKey)
    }
  }, [isFullscreen])

  useEffect(() => {
    if (!ad?.company_name || message) return
    setMessage(`Hello ${ad.company_name}, I am interested in your services and would like a quote. Please contact me with more details.`)
  }, [ad?.company_name, message])

  useEffect(() => {
    if (phone || !user?.primaryPhoneNumber?.phoneNumber) return
    setPhone(user.primaryPhoneNumber.phoneNumber)
  }, [phone, user?.primaryPhoneNumber?.phoneNumber])

  const loadAd = async () => {
    const { data } = await supabase
      .from('advertisements')
      .select('id, title, category, company_name, description, image_url, image_urls, is_active, is_featured, impressions, clicks')
      .eq('id', id)
      .single()

    setAd(data)
    setLoading(false)
  }

  const trackClick = async () => {
    try {
      const { error } = await supabase.rpc('increment_ad_clicks', {
        ad_id: id
      })
      
      if (!error) {
        // Update click count in state immediately
        setAd(prev => prev ? { ...prev, clicks: (prev.clicks || 0) + 1 } : null)
      }
    } catch (err) {
    }
  }

  const submitInquiry = async (event) => {
    event.preventDefault()
    if (!isSignedIn) {
      toast.error('Sign in with a verified Dosnine account to contact this advertiser.')
      router.push(`/sign-in?redirect_url=${encodeURIComponent(router.asPath)}`)
      return
    }

    setSending(true)
    try {
      const token = await getToken()
      const response = await fetch('/api/advertisements/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ advertisementId: ad.id, message, phone }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to send your enquiry.')
      }
      setMessage('')
      setPhone('')
      toast.success('Your enquiry was sent to the advertiser.')
    } catch (error) {
      toast.error(error.message || 'Unable to send your enquiry.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!ad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Ad Not Found</h1>
          <Link href="/" className="text-accent font-semibold hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{ad.company_name} — Dosnine Limited Partner</title>
        <meta name="description" content={ad.description} />
      </Head>

      <div className="min-h-screen  bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
     

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-accent to-red-600 text-white px-8 py-10 text-center relative">
              {ad.is_featured && (
                <div className="absolute items-center text-center justify-center top-4 right-4 bg-yellow-400 text-black text-sm px-4 py-2 rounded-full font-bold shadow-lg">
                  <Star className="inline-block text-center w-4 h-4 mr-1" />
                  FEATURED PARTNER
                </div>
              )}
              <h1 className="text-4xl  text-gray-800 font-bold mb-2">{ad.title}</h1>
              <p className="text-xl text-gray-600 capitalize">
                {ad.category?.replace('_', ' ')} Services
              </p>
              <p className="text-sm text-gray-500 mt-2 flex items-center justify-center gap-3">
                <span className="text-blue-600 inline-flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {ad.impressions || 0} views
                </span>
                <span className="mx-1">•</span>
                <span className="text-green-600 inline-flex items-center gap-1">
                  <MousePointerClick className="w-4 h-4" />
                  {ad.clicks || 0} clicks
                </span>
              </p>
            </div>

            {/* Logo/Image */}
            {adImages.length > 0 && (
              <div className="bg-gray-50 w-full">
                <div 
                  className="relative w-full h-[300px] md:h-[500px] bg-gray-100 cursor-pointer group"
                  onClick={() => setIsFullscreen(true)}
                >
                  <img
                    src={adImages[currentImageIndex]}
                    alt={ad.company_name}
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <div className="bg-white/90 px-4 py-2 rounded-lg font-semibold text-gray-800">
                      Click to expand
                    </div>
                  </div>
                </div>
                
                {adImages.length > 1 && (
                  <div className="p-6 bg-white">
                    <p className="text-xs text-gray-500 mb-3 font-semibold">GALLERY ({currentImageIndex + 1}/{adImages.length})</p>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                      {adImages.map((imageUrl, index) => (
                        <button
                          key={`${imageUrl}-${index}`}
                          type="button"
                          onClick={() => setCurrentImageIndex(index)}
                          className={`rounded-lg overflow-hidden border-2 transition-all ${
                            currentImageIndex === index 
                              ? 'border-accent ring-2 ring-accent' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={imageUrl}
                            alt={`${ad.company_name} ${index + 1}`}
                            className="w-full aspect-square object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen Modal */}
            {isFullscreen && (
              <div 
                className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
                onClick={() => setIsFullscreen(false)}
              >
                <div 
                  className="relative w-full h-full flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close Button */}
                  <button
                    onClick={() => setIsFullscreen(false)}
                    className="absolute top-4 right-4 bg-white text-black rounded-full p-2 hover:bg-gray-200 transition z-10 shadow-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Main Image */}
                  <img
                    src={adImages[currentImageIndex]}
                    alt={ad.company_name}
                    className="max-w-full max-h-full object-contain"
                  />

                  {/* Navigation */}
                  {adImages.length > 1 && (
                    <>
                      {/* Previous Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setCurrentImageIndex((prev) => (prev === 0 ? adImages.length - 1 : prev - 1))
                        }}
                        className="absolute left-4 bg-white/80 text-black rounded-full p-3 hover:bg-white transition shadow-lg"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Next Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setCurrentImageIndex((prev) => (prev === adImages.length - 1 ? 0 : prev + 1))
                        }}
                        className="absolute right-4 bg-white/80 text-black rounded-full p-3 hover:bg-white transition shadow-lg"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Image Counter */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                        {currentImageIndex + 1} / {adImages.length}
                      </div>
                    </>
                  )}

                  {/* Hint Text */}
                  <div className="absolute bottom-4 right-4 text-white/60 text-xs">
                    Press ESC or click outside to close
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="px-8 py-10">
              {/* Description */}
              <div className="mb-10">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">About {ad.company_name}</h2>
                <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line">
                  {ad.description}
                </p>
                
              </div>

              <div className="mb-10 bg-gray-50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Service Details</h3>
                <div className="text-sm">
                  <div className="flex items-start gap-3 text-gray-700">
                    <Tag className="w-4 h-4 mt-0.5 text-accent" />
                    <div>
                      <p className="font-semibold text-gray-900">Category</p>
                      <p className="capitalize">{ad.category?.replace('_', ' ') || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

          

              {/* Call to Action */}
              <div className="bg-accent rounded-xl p-8 text-white text-center">
                <h3 className="text-2xl font-bold mb-3">Get a Quote from {ad.company_name}</h3>
                <p className="mb-6 text-white/90">
                  Send your enquiry directly through Dosnine. A verified account is required.
                </p>
                <form onSubmit={submitInquiry} className="mx-auto max-w-xl space-y-3 text-left">
                  <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} required minLength={10} placeholder="Tell the advertiser what service you need..." className="w-full rounded-lg bg-white px-4 py-3 text-gray-900 outline-none" />
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" placeholder="Your phone number" className="w-full rounded-lg bg-white px-4 py-3 text-gray-900 outline-none" />
                  <button type="submit" disabled={sending} className="w-full bg-white text-accent px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition inline-flex items-center justify-center gap-2 disabled:opacity-60">
                    <MessageCircle className="w-5 h-5" />
                    {sending ? 'Sending...' : 'Send Enquiry'}
                  </button>
                </form>
              </div>
            </div>
          </div>

    
        </div>
      </div>
    </>
  )
}
