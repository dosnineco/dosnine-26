'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

// Shared across all InFeedAd instances on the page so the same ad isn't shown twice at once
const adsInUse = new Set()

// Single sponsored ad styled to match PropertyCard so it blends into property grids/feeds
export default function InFeedAd() {
  const [ad, setAd] = useState(null)
  const impressionTracked = useRef(false)
  const cardRef = useRef(null)
  const adIdRef = useRef(null)

  useEffect(() => {
    const loadAd = async () => {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .limit(20)

      if (error || !data?.length) return

      const available = data.filter((item) => !adsInUse.has(item.id))
      const pool = available.length ? available : data
      const random = pool[Math.floor(Math.random() * pool.length)]

      adsInUse.add(random.id)
      adIdRef.current = random.id
      setAd(random)
    }

    loadAd()

    return () => {
      if (adIdRef.current) adsInUse.delete(adIdRef.current)
    }
  }, [])

  useEffect(() => {
    if (!ad || !cardRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(async (entry) => {
          if (entry.isIntersecting && !impressionTracked.current) {
            impressionTracked.current = true
            try {
              await supabase.rpc('increment_ad_impressions', { ad_id: ad.id })
            } catch {
              // ignore impression tracking failures
            }
          }
        })
      },
      { threshold: 0.5 }
    )

    observer.observe(cardRef.current)

    return () => observer.disconnect()
  }, [ad])

  if (!ad) return null

  const imageUrl = Array.isArray(ad.image_urls) && ad.image_urls.length > 0 ? ad.image_urls[0] : ad.image_url

  return (
    <Link
      ref={cardRef}
      href={`/ads/${ad.id}`}
      className="w-full bg-white border border-gray-200 rounded-xl flex flex-col h-80 overflow-hidden relative group"
    >
      <span className="absolute left-3 top-3 z-10 bg-gray-900/80 text-white text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full">
        Sponsored
      </span>

      <div className="relative h-48 w-full flex-shrink-0 overflow-hidden bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={ad.company_name || 'Advertisement'}
            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-600">
            {ad.company_name?.slice(0, 1)?.toUpperCase() || 'A'}
          </div>
        )}
      </div>

      <div className="flex-1 p-3 flex flex-col overflow-hidden">
        <div className="flex-1">
          <div className="text-xs font-medium text-gray-500 mb-1 truncate">{ad.company_name}</div>
          <div className="text-lg font-semibold line-clamp-2">
            {ad.title || ad.headline || 'Discover more'}
          </div>
          <div className="text-sm text-gray-500 line-clamp-2 mt-1">
            {ad.description || 'Learn more about this business.'}
          </div>
        </div>

        <div className="mt-auto pt-2 border-t">
          <span className="text-accent font-semibold text-sm">Learn more →</span>
        </div>
      </div>
    </Link>
  )
}
