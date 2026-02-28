import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Head from 'next/head'
import Link from 'next/link'
import { Star, Eye, MousePointerClick, Tag, Phone, Mail, Globe, MessageCircle } from 'lucide-react'


export default function AdDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [ad, setAd] = useState(null)
  const [loading, setLoading] = useState(true)

  const adUrl = typeof window !== 'undefined'
    ? window.location.href
    : `https://dosnine.com/ads/${id || ''}`

  const whatsappText = encodeURIComponent(
    [
      `Hello ${ad?.company_name || ''},`,
      '',
      `I found your service on Dosnine Properties and I want a quote.`,
      '',
      'Service Details:',
      `- Company: ${ad?.company_name || 'N/A'}`,
      `- Category: ${ad?.category?.replace('_', ' ') || 'N/A'}`,
      `- Description: ${ad?.description || 'N/A'}`,
      ad?.website ? `- Website: ${ad.website}` : null,
      `- Listing Link: ${adUrl}`,
    ]
      .filter(Boolean)
      .join('\n')
  )

  useEffect(() => {
    if (id) {
      loadAd()
      trackClick()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadAd = async () => {
    const { data } = await supabase
      .from('advertisements')
      .select('*')
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
        <title>{ad.company_name} — Dosnine Properties Partner</title>
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
              <h1 className="text-4xl  text-gray-800 font-bold mb-2">{ad.company_name}</h1>
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
            {ad.image_url && (
              <div className="bg-gray-50 border-b w-full">
                <img
                  src={ad.image_url}
                  alt={ad.company_name}
                  className="w-full h-[300px] md:h-[420px] object-cover"
                />
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
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-3 text-gray-700">
                    <Tag className="w-4 h-4 mt-0.5 text-accent" />
                    <div>
                      <p className="font-semibold text-gray-900">Category</p>
                      <p className="capitalize">{ad.category?.replace('_', ' ') || 'Not provided'}</p>
                    </div>
                  </div>

                  {ad.phone && (
                    <div className="flex items-start gap-3 text-gray-700">
                      <Phone className="w-4 h-4 mt-0.5 text-accent" />
                      <div>
                        <p className="font-semibold text-gray-900">Phone</p>
                        <a href={`tel:${ad.phone}`} className="text-accent hover:underline">{ad.phone}</a>
                      </div>
                    </div>
                  )}

                  {ad.email && (
                    <div className="flex items-start gap-3 text-gray-700">
                      <Mail className="w-4 h-4 mt-0.5 text-accent" />
                      <div>
                        <p className="font-semibold text-gray-900">Email</p>
                        <p>{ad.email}</p>
                      </div>
                    </div>
                  )}

                  {ad.website && (
                    <div className="flex items-start gap-3 text-gray-700">
                      <Globe className="w-4 h-4 mt-0.5 text-accent" />
                      <div>
                        <p className="font-semibold text-gray-900">Website</p>
                        <a
                          href={ad.website.startsWith('http') ? ad.website : `https://${ad.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline break-all"
                        >
                          {ad.website}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

          

              {/* Call to Action */}
              <div className="bg-accent rounded-xl p-8 text-white text-center">
                <h3 className="text-2xl font-bold mb-3">Get a Quote from {ad.company_name}</h3>
                <p className="mb-6 text-white/90">
                  Contact {ad.company_name} for professional service
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {ad.phone && (
                    <a
                      href={`https://wa.me/1${ad.phone}?text=${whatsappText}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white text-accent px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition shadow-lg inline-flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-5 h-5" />
                      WhatsApp Now
                    </a>
                  )}
                  {ad.email && (
                    <a
                      href={`mailto:${ad.email}`}
                      className="bg-white/10 border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white/20 transition inline-flex items-center justify-center gap-2"
                    >
                      <Mail className="w-5 h-5" />
                      Send Email
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

    
        </div>
      </div>
    </>
  )
}
