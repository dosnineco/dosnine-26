import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Head from 'next/head'
import Link from 'next/link'
import {Star} from 'lucide-react';


export default function AdDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [ad, setAd] = useState(null)
  const [loading, setLoading] = useState(true)

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
      console.error('Failed to track click:', err)
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
              <p className="text-sm text-gray-500 mt-2">
                <span className="text-blue-600">👁️ {ad.impressions || 0} views</span>
                <span className="mx-2">•</span>
                <span className="text-green-600">🔗 {ad.clicks || 0} clicks</span>
              </p>
            </div>

            {/* Logo/Image */}
            {ad.image_url && (
              <div className="bg-gray-50 border-b py-12">
                <div className="max-w-md mx-auto px-8">
                  <img
                    src={ad.image_url}
                    alt={ad.company_name}
                    className="w-full h-auto object-contain"
                  />
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

              {/* Contact Information */}
              <div className="bg-gray-50 rounded-xl p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Contact Information</h2>
                <div className="space-y-4">
                  {ad.phone && (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-white text-xl">
                        📞
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Phone</p>
                        <a
                          href={`tel:${ad.phone}`}
                          className="text-xl font-bold text-gray-800 hover:text-accent transition"
                        >
                          {ad.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {ad.email && (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-white text-xl">
                        ✉️
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Email</p>
                        <a
                          href={`mailto:${ad.email}`}
                          className="text-xl font-bold text-gray-800 hover:text-accent transition break-all"
                        >
                          {ad.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {ad.website && (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-white text-xl">
                        🌐
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Website</p>
                        <a
                          href={ad.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xl font-bold text-accent hover:underline break-all"
                        >
                          Visit Website →
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Call to Action */}
              <div className="bg-accent rounded-xl p-8 text-white text-center">
                <h3 className="text-2xl font-bold mb-3">Get in Touch Today!</h3>
                <p className="mb-6 text-white/90">
                  Contact {ad.company_name} for professional service
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {ad.phone && (
                    <a
                      href={`tel:${ad.phone}`}
                      className="bg-white text-accent px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition shadow-lg"
                    >
                      📞 Call Now
                    </a>
                  )}
                  {ad.email && (
                    <a
                      href={`mailto:${ad.email}`}
                      className="bg-white/10 border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white/20 transition"
                    >
                      ✉️ Send Email
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Back to Home */}
          <div className="mt-8 text-center">
            <Link href="/" className="text-accent font-semibold text-lg hover:underline">
              ← Back to Browse Properties
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
