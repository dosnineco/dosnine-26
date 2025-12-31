import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Star, Eye, Phone } from 'lucide-react';

export default function AdvertisementGrid() {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const impressionTracked = useRef(new Set())

  useEffect(() => {
    loadAds()
  }, [])

  const loadAds = async () => {
    const { data } = await supabase
      .from('advertisements')
      .select('*')
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(12)

    setAds(data || [])
    setLoading(false)
  }

  const trackImpression = async (adId) => {
    if (impressionTracked.current.has(adId)) return
    
    try {
      const { error } = await supabase.rpc('increment_ad_impressions', {
        ad_id: adId
      })
      
      if (!error) {
        impressionTracked.current.add(adId)
        // Update the ad count in state immediately
        setAds(prevAds => 
          prevAds.map(ad => 
            ad.id === adId 
              ? { ...ad, impressions: (ad.impressions || 0) + 1 }
              : ad
          )
        )
      } else {
        console.error('Impression tracking error:', error)
      }
    } catch (err) {
      console.error('Failed to track impression:', err)
    }
  }

  useEffect(() => {
    if (ads.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const adId = entry.target.getAttribute('data-ad-id')
            if (adId) trackImpression(adId)
          }
        })
      },
      { threshold: 0.5 }
    )

    const adElements = document.querySelectorAll('[data-ad-id]')
    adElements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [ads])

  if (loading) {
    return (
      <div className="w-full bg-gray-50 py-8 rounded-xl">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sponsors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-gray-200 mb-8 py-8 rounded-xl">
     

      {/* Ads Grid */}
      {ads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-6">
          {ads.map(ad => (
            <Link
              key={ad.id}
              href={`/ads/${ad.id}`}
              data-ad-id={ad.id}
              className={`relative bg-white rounded-xl p-5  transition-all duration-300 transform hover:-translate-y-1 ${
                ad.is_featured ? 'ring-2 ring-yellow-400' : ''
              }`}
            >
              {ad.is_featured && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs px-3 py-1 rounded-full font-bold ">
                  <Star className="inline-block w-3 h-3 mr-1" />
                  FEATURED
                </div>
              )}

              {ad.image_url && (
                <div className="w-full h-24 mb-4 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                  <img
                    src={ad.image_url}
                    alt={ad.company_name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}

              <h3 className="font-bold text-lg mb-2 text-gray-800 line-clamp-1">
                {ad.company_name}
              </h3>

              <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                {ad.category?.replace('_', ' ')}
                <span className="text-blue-600 ml-2 inline-flex items-center gap-1">
                  •
                  <Eye className="w-3 h-3" />
                  {ad.impressions || 0} views
                </span>
              </p>
              
              {ad.phone && (
                <p className="text-xs text-gray-600 font-medium mb-2 inline-flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {ad.phone}
                </p>
              )}

              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {ad.description}
              </p>

            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-6">No advertisers yet. Be the first!</p>
          <Link
            href="/advertise"
            className="inline-block bg-accent text-white px-8 py-4 rounded-lg font-semibold hover:bg-accent/90 transition "
          >
            Advertise Your Business
          </Link>
        </div>
      )}

 {/* Header */}
      <div className="flex justify-start items-center ">
        <Link
          href="/advertise"
          className=" mt-4 italic text-gray-800 px-6 underline rounded-lg font-semibold hover:bg-accent/90 transition "
        >
          Advertise Your Business
        </Link> 
      </div>
    
    </div>
  )
}
