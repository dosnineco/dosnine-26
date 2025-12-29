import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {Star} from 'lucide-react';

export default function AdvertisementGrid() {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)

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
    <div className="w-full bg-orange-50 mb-8 py-8 rounded-xl">
      {/* Header */}
      <div className="flex justify-between flex-col items-center px-6 mb-6">
          <h2 className="text-2xl font-bold itext-gray-800">Our Business Partners</h2>
          <p className="text-gray-600 text-sm mt-1">Advertise to real people with intent. </p>
        <Link
          href="/advertise"
          className="bg-accent m-2 text-white px-6 py-3 rounded-lg font-semibold hover:bg-accent/90 transition shadow-lg"
        >
          Advertise Your Business
        </Link>
      </div>

      {/* Ads Grid */}
      {ads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-6">
          {ads.map(ad => (
            <Link
              key={ad.id}
              href={`/ads/${ad.id}`}
              className={`relative bg-white rounded-xl p-5 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
                ad.is_featured ? 'ring-2 ring-yellow-400' : ''
              }`}
            >
              {ad.is_featured && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs px-3 py-1 rounded-full font-bold shadow-lg">
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

              <p className="text-xs text-gray-500 uppercase mb-2 font-medium">
                {ad.category?.replace('_', ' ')}
              </p>

              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {ad.description}
              </p>

              <div className="space-y-2">
                {ad.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-accent">📞</span>
                    <span className="font-medium">{ad.phone}</span>
                  </div>
                )}
                {ad.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-accent">✉️</span>
                    <span className="font-medium truncate">{ad.email}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-accent font-semibold text-sm hover:underline">
                  View Details →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-6">No advertisers yet. Be the first!</p>
          <Link
            href="/advertise"
            className="inline-block bg-accent text-white px-8 py-4 rounded-lg font-semibold hover:bg-accent/90 transition shadow-lg"
          >
            Advertise Your Business
          </Link>
        </div>
      )}

    
    </div>
  )
}
