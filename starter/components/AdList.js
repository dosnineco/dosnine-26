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
      } else {
        console.error('Impression tracking error:', error)
      }
    } catch (err) {
      console.error('Failed to track impression:', err)
    }
  }

  // Observe visible cards to trigger impression tracking
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

  // Share CTA handler
  const handleShareToFriend = async () => {
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/advertise` : 'https://dosnine.com/advertise'
    const shareData = {
      title: 'Help a Business Get More Clients',
      text: 'Share this with a friend so they can advertise on Dosnine and reach active clients.',
      url: shareUrl,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        return
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        window.alert('Share link copied. Send it to a friend to help them get more clients.')
      }
    } catch (error) {
      console.error('Share failed:', error)
    }
  }


  // Loading state UI
  if (loading) {
    return (
      <div className={`w-full bg-gray-50 rounded-xl ${compact ? 'py-5' : 'py-8'}`}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sponsors...</p>
        </div>
      </div>
    )
  }

  // Main render
  return (
    <div className={`w-full  bg-gray-100 text-white overflow-hidden ${compact ? 'mb-4 py-3' : 'mb-6 py-2'}`}>


      {/* Top section: horizontal ad cards */}

        <div className={`relative ${compact ? 'px-4 py-2' : 'px-4 md:px-6 py-2'}`}>
          <div className={`mx-auto w-full ${compact ? 'max-w-[380px]' : 'max-w-[520px]'}`}>
            <Link
              key={activeAd.id}
              href={`/ads/${activeAd.id}`}
              data-ad-id={activeAd.id}
              className={`relative bg-white border border-gray-200 rounded-3xl shadow-sm transition-all duration-300 overflow-hidden ${activeAd.is_featured ? 'ring-1 ring-accent/15' : ''}`}
            >
              <span className="absolute top-4 left-4 z-20 inline-flex items-center rounded-full bg-black text-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] shadow-sm">
                Sponsored
              </span>
              {activeAd.is_featured && (
                <div className="absolute top-3 left-3 z-10 bg-accent/10 text-accent text-[11px] px-2 py-1 rounded-full font-semibold">
                  Featured
                </div>
              )}

              {((Array.isArray(activeAd.image_urls) && activeAd.image_urls.length > 0) ? activeAd.image_urls[0] : activeAd.image_url) && (
                <div className="w-full aspect-[4/3]  overflow-hidden">
                  <img src={(Array.isArray(activeAd.image_urls) && activeAd.image_urls.length > 0) ? activeAd.image_urls[0] : activeAd.image_url} alt={activeAd.company_name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4">
                <h3 className="font-bold capitalize text-base mb-2 text-gray-800 line-clamp-1">
                  {activeAd.company_name}
                </h3>

                <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                  {activeAd.category?.replace('_', ' ')}
                </p>

                <p className="text-xs text-blue-600 mb-2 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {activeAd.impressions || 0} views
                </p>

                <p className="text-xs text-gray-600 line-clamp-2">{activeAd.description}</p>
              </div>
            </Link>
          </div>
        </div>
      

      {/* Bottom section: advertising CTA panel */}
      {/* {!redirecting && (
        <div className={`  bg-gray-100 rounded-lg   ${compact ? ' p-4 mb-4 mt-3 mx-4' : ' p-6 mb-8 mt-4 mx-4 md:mx-6 flex flex-col sm:flex-row sm:items-center sm:justify-between'}`}>
          <div>
            <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-gray-900`}>Create More Ads</h2>
            <p className="text-sm text-gray-700 mt-1">
              Reach at least 25,000 weekly visitors and keep your business in front of active clients.
            </p>
          </div>

          <div className={`flex gap-3 ${compact ? 'flex-col mt-2' : 'flex-col sm:flex-row'}`}>
            <button
              type="button"
              onClick={handleShareToFriend}
              className={`inline-flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-200 text-gray-900 font-semibold rounded-xl px-5 py-3 ${compact ? 'w-full' : ''}`}
            >
              <Share2 className="w-4 h-4" />
              Share to a Friend
            </button>

            <Link
              href="/advertise"
              onClick={() => setRedirecting(true)}
              className={`inline-flex items-center justify-center bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl px-5 py-3 ${compact ? 'w-full' : ''}`}
            >
              Create Ad
            </Link>
          </div>
        </div>
      )} */}
    </div>
  )
}
