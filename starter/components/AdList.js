import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdvertisementGrid({ category }) {
  const [ads, setAds] = useState([])
  const [index, setIndex] = useState(0)
  const sliderRef = useRef(null)

  const isMobile =
    typeof window !== 'undefined' && window.innerWidth < 768

  useEffect(() => {
    loadAds()
  }, [category])

  useEffect(() => {
    ads.forEach(ad => track(ad.id, 'impression'))
  }, [ads])

  // Mobile auto-slide
  useEffect(() => {
    if (!isMobile || ads.length <= 1) return
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % ads.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [ads, isMobile])

  const track = async (adId, type) => {
    await fetch('/api/ads/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adId, type })
    })
  }

  const loadAds = async () => {
    let query = supabase
      .from('advertisements')
      .select('*')
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true })

    if (category) query = query.eq('category', category)

    const { data } = await query
    setAds(data || [])
  }

  const visibleAds = isMobile
    ? [ads[index]]
    : ads.slice(index, index + 4)

  const next = () => {
    setIndex(prev =>
      prev + 4 >= ads.length ? 0 : prev + 4
    )
  }

  const prev = () => {
    setIndex(prev =>
      prev - 4 < 0 ? Math.max(ads.length - 4, 0) : prev - 4
    )
  }

  if (!ads.length) return null

  return (
    <div className="w-full bg-gray-50 py-6 rounded-xl shadow-inner">
      {/* Header */}
      <div className="flex justify-between items-center px-4 mb-4">
        <h2 className="text-lg font-semibold">
          Sponsored Partners
        </h2>

        {!isMobile && (
          <div className="flex gap-2">
            <button
              onClick={prev}
              className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
            >
              ← Prev
            </button>
            <button
              onClick={next}
              className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Ads Row */}
      <div
        ref={sliderRef}
        className={`grid gap-4 px-4 ${
          isMobile ? 'grid-cols-1' : 'grid-cols-4'
        }`}
      >
        {visibleAds.map(ad => (
          <div
            key={ad.id}
            className={`relative bg-white rounded-xl p-4 shadow hover:shadow-lg transition ${
              ad.is_featured
                ? 'ring-2 ring-yellow-400'
                : ''
            }`}
          >
            {ad.is_featured && (
              <span className="absolute top-2 right-2 text-xs bg-yellow-400 text-black px-2 py-1 rounded">
                Featured Partner
              </span>
            )}

            <p className="text-xs text-gray-500 uppercase mb-1">
              {ad.category?.replace('_', ' ')}
            </p>

            <h3 className="font-semibold text-base mb-2">
              {ad.company_name}
            </h3>

            {ad.image_url && (
              <img
                src={ad.image_url}
                alt={ad.company_name}
                className="w-full h-24 object-contain mb-3"
              />
            )}

            <p className="text-sm text-gray-600 mb-3 line-clamp-3">
              {ad.description}
            </p>

            <div className="space-y-1 text-sm">
              {ad.phone && (
                <a
                  href={`tel:${ad.phone}`}
                  onClick={() => track(ad.id, 'click')}
                  className="block text-blue-600 font-medium"
                >
                  📞 {ad.phone}
                </a>
              )}

              {ad.email && (
                <a
                  href={`mailto:${ad.email}`}
                  onClick={() => track(ad.id, 'click')}
                  className="block text-blue-600 font-medium"
                >
                  ✉️ {ad.email}
                </a>
              )}

              {ad.website && (
                <a
                  href={ad.website}
                  target="_blank"
                  onClick={() => track(ad.id, 'click')}
                  className="inline-block mt-2 text-sm underline text-gray-700"
                >
                  Visit Website →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Dots */}
      {isMobile && (
        <div className="flex justify-center gap-2 mt-4">
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full ${
                i === index
                  ? 'bg-blue-600'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
