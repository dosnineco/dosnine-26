import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdvertisementGrid({ category }) {
  const [ads, setAds] = useState([])

  useEffect(() => {
    loadAds()
  }, [category])

  useEffect(() => {
    ads.forEach(ad => track(ad.id, 'impression'))
  }, [ads])

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {ads.map(ad => (
        <div
          key={ad.id}
          className={`bg-white rounded-lg shadow p-4 ${
            ad.is_featured ? 'ring-2 ring-yellow-400' : ''
          }`}
        >
          {ad.is_featured && (
            <span className="inline-block mb-2 text-xs bg-yellow-400 px-2 py-1 rounded">
              Featured Partner
            </span>
          )}

          <p className="text-xs text-gray-500">
            {ad.category.replace('_', ' ').toUpperCase()}
          </p>

          <h3 className="font-semibold text-lg">
            {ad.company_name}
          </h3>

          {ad.image_url && (
            <img
              src={ad.image_url}
              className="w-full h-24 object-contain my-2"
              alt={ad.company_name}
            />
          )}

          <p className="text-sm text-gray-600">
            {ad.description}
          </p>

          <div className="mt-3 space-y-1 text-sm">
            {ad.email && <p>{ad.email}</p>}
            {ad.phone && <p>{ad.phone}</p>}
            {ad.website && (
              <a
                href={ad.website}
                target="_blank"
                onClick={() => track(ad.id, 'click')}
                className="text-blue-600 underline"
              >
                Visit website
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
