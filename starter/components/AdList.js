import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Eye, Share2 } from 'lucide-react'

export default function AdvertisementGrid({ compact = false }) {
  // State and refs
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [redirecting, setRedirecting] = useState(false)
  const [activeAdIndex, setActiveAdIndex] = useState(0)
  const impressionTracked = useRef(new Set())
  const MAX_AD_SLOTS = 12

  const getRotationSeed = () => {
    if (typeof window === 'undefined') return 0
    let seed = sessionStorage.getItem('dosnineAdsRotationSeed')
    if (!seed) {
      seed = String(Math.floor(Math.random() * 1000000))
      sessionStorage.setItem('dosnineAdsRotationSeed', seed)
    }
    return parseInt(seed, 10)
  }

  const getRotationOffset = (length) => {
    if (typeof window === 'undefined' || length === 0) return 0
    const seed = getRotationSeed()
    const pathHash = window.location.pathname
      .split('')
      .reduce((sum, char) => sum + char.charCodeAt(0), seed)
    return Math.abs(pathHash) % length
  }

  const sortAdsForBalance = (adList) => {
    return [...adList].sort((a, b) => {
      const aScore = Number(a.impressions || 0) + (a.is_featured ? -30 : 0)
      const bScore = Number(b.impressions || 0) + (b.is_featured ? -30 : 0)

      if (aScore !== bScore) return aScore - bScore
      if ((a.display_order || 0) !== (b.display_order || 0)) {
        return (a.display_order || 0) - (b.display_order || 0)
      }
      return new Date(a.created_at) - new Date(b.created_at)
    })
  }

  const rotateAds = (adList, offset) => {
    if (adList.length === 0) return adList
    const index = offset % adList.length
    return [...adList.slice(index), ...adList.slice(0, index)]
  }

  const getBalancedAds = (allAds) => {
    if (!Array.isArray(allAds) || allAds.length === 0) return []
    const sorted = sortAdsForBalance(allAds)
    const selected = sorted.slice(0, MAX_AD_SLOTS)
    return rotateAds(selected, getRotationOffset(selected.length))
  }

  const activeAd = ads[activeAdIndex] || null

  useEffect(() => {
    if (ads.length === 0) return
    setActiveAdIndex(getRotationOffset(ads.length))
  }, [ads.length])

  useEffect(() => {
    if (ads.length <= 1) return

    const swapInterval = setInterval(() => {
      setActiveAdIndex((prevIndex) => (prevIndex + 1) % ads.length)
    }, 8000)

    return () => {
      clearInterval(swapInterval)
    }
  }, [ads.length])

  // Load ads from Supabase and arrange featured placement
  const loadAds = async () => {
    try {
      setLoadError('')
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .limit(12)

      if (error) throw error

      if (data && data.length > 0) {
        setAds(getBalancedAds(data))
      } else {
        setAds([])
      }
    } catch (error) {
      console.error('Failed to load ads:', error)
      setLoadError('Unable to load ads right now.')
      setAds([])
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadAds()
  }, [])

  // Refresh ads periodically and on tab focus/visibility
  useEffect(() => {
    if (typeof window === 'undefined') return

    const refreshInterval = setInterval(() => {
      loadAds()
    }, 60000)

    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadAds()
      }
    }

    const refreshOnFocus = () => {
      loadAds()
    }

    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnVisibility)

    return () => {
      clearInterval(refreshInterval)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnVisibility)
    }
  }, [])

  // Track ad impressions (one-time per card per session)
  const trackImpression = async (adId) => {
    if (impressionTracked.current.has(adId)) return

    try {
      const { error } = await supabase.rpc('increment_ad_impressions', {
        ad_id: adId,
      })

      if (!error) {
        impressionTracked.current.add(adId)
        setAds((prevAds) =>
          prevAds.map((ad) =>
            ad.id === adId ? { ...ad, impressions: (ad.impressions || 0) + 1 } : ad
          )
        )
      }
    } catch (err) {
      console.error('Failed to track impression:', err)
    }
  }

  useEffect(() => {
    if (ads.length === 0) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const adId = entry.target.getAttribute('data-ad-id')
          if (adId) trackImpression(adId)
        }
      })
    }, { threshold: 0.5 })

    const adElements = document.querySelectorAll('[data-ad-id]')
    adElements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [ads])

  if (loading) {
    return <div className="w-full bg-gray-50 py-5 text-center text-sm text-gray-600">Loading ads...</div>
  }

  if (!activeAd) return null

  const imageUrl = Array.isArray(activeAd.image_urls) && activeAd.image_urls.length > 0
    ? activeAd.image_urls[0]
    : activeAd.image_url

  return (
    <div className={`sticky top-[60px] z-40 w-full bg-gray-100 overflow-hidden ${compact ? 'mb-3 py-1' : 'mb-4 py-1'}`}>
      <div className="px-3 sm:px-4">
        <div className="mx-auto w-full max-w-2xl">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-black">Ads</p>
          <Link
            href={`/ads/${activeAd.id}`}
            data-ad-id={activeAd.id}
            className={`ad-light-sweep relative flex h-[52px] items-center gap-2.5 overflow-hidden rounded-lg bg-white px-2 transition hover:bg-gray-50 sm:h-[60px] sm:gap-3 sm:px-3 ${activeAd.is_featured ? 'ring-1 ring-accent/30' : ''}`}
          >
            {imageUrl ? (
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-gray-100 sm:h-11 sm:w-11">
                <img src={imageUrl} alt={activeAd.company_name} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-xs font-bold text-accent sm:h-11 sm:w-11">
                {activeAd.company_name?.slice(0, 1)?.toUpperCase() || 'A'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-bold text-gray-900 sm:text-base">{activeAd.company_name}</h3>
                {activeAd.is_featured && <span className="hidden rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent sm:inline">Featured</span>}
              </div>
              <p className="truncate text-xs text-gray-600">{activeAd.description || activeAd.category?.replace('_', ' ')}</p>
            </div>
            <Eye className="h-4 w-4 shrink-0 text-gray-400" aria-label={`${activeAd.impressions || 0} views`} />
          </Link>
        </div>
      </div>
    </div>
  )
}
