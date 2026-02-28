import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Star, Eye, Share2 } from 'lucide-react'

export default function AdvertisementGrid({ compact = false }) {
  // State and refs
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [redirecting, setRedirecting] = useState(false)
  const impressionTracked = useRef(new Set())
  const scrollContainerRef = useRef(null)
  const autoScrollInterval = useRef(null)
  const autoScrollDirection = useRef(1)
  const MAX_AD_SLOTS = 12
  const placeholderLimit = compact ? 1 : 2
  const placeholderCount = ads.length > 3
    ? 0
    : Math.min(placeholderLimit, Math.max(0, MAX_AD_SLOTS - ads.length))
  const gridItems = [
    ...ads,
    ...Array.from({ length: placeholderCount }, (_, index) => ({
      id: `placeholder-${index}`,
      isPlaceholder: true,
    })),
  ]

  // Load ads from Supabase and arrange featured placement
  const loadAds = async () => {
    try {
      setLoadError('')
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(12)

      if (error) throw error

      if (data && data.length > 0) {
        const featured = data.filter((ad) => ad.is_featured)
        const regular = data.filter((ad) => !ad.is_featured)

        if (featured.length > 0 && typeof window !== 'undefined') {
          const isMobile = window.innerWidth < 768

          if (isMobile) {
            setAds([...featured, ...regular])
          } else {
            const interleaved = []
            let featuredIndex = 0

            for (let i = 0; i < regular.length; i++) {
              interleaved.push(regular[i])

              if ((i + 1) % 3 === 0 && featuredIndex < featured.length) {
                interleaved.push(featured[featuredIndex])
                featuredIndex++
              }
            }

            while (featuredIndex < featured.length) {
              interleaved.push(featured[featuredIndex])
              featuredIndex++
            }

            setAds(interleaved)
          }
        } else {
          setAds(data)
        }
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

  // Auto-scroll cards forward and backward
  useEffect(() => {
    if (typeof window === 'undefined' || !scrollContainerRef.current) return

    const shouldAutoScroll = true
    if (!shouldAutoScroll || ads.length === 0) return

    autoScrollDirection.current = 1

    autoScrollInterval.current = setInterval(() => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current
        const cardWidth = container.children[0]?.offsetWidth || 0
        const gap = 24
        const isSmallScreen = window.innerWidth < 640
        const scrollAmount = isSmallScreen ? container.clientWidth : cardWidth + gap
        const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth)

        if (maxScrollLeft === 0) return

        const tolerance = 10
        let nextScrollLeft = container.scrollLeft + (scrollAmount * autoScrollDirection.current)

        if (nextScrollLeft >= maxScrollLeft - tolerance) {
          nextScrollLeft = maxScrollLeft
          autoScrollDirection.current = -1
        } else if (nextScrollLeft <= tolerance) {
          nextScrollLeft = 0
          autoScrollDirection.current = 1
        }

        container.scrollTo({ left: nextScrollLeft, behavior: 'smooth' })
      }
    }, 4000)

    return () => {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current)
      }
    }
  }, [ads, compact])

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
    <div className={`w-full rounded-xl overflow-hidden ${compact ? 'mb-4 py-3' : 'mb-6 py-2'}`}>
      {/* <h3 className={`font-bold text-gray-900 mb-1 ${compact ? 'text-lg px-4' : 'text-xl px-6'}`}>Services You Might Also Need</h3>
      

        <Link
          href="/advertise"
          className={`text-accent text-sm mb-2 underline rounded-lg font-bold hover:text-accent/80 transition inline-block ${compact ? 'px-4' : 'px-6'}`}
        >
          Advertise Your Business Here
        </Link> */}

      {/* Top section: horizontal ad cards */}
      {ads.length > 0 ? (
        <div
          ref={scrollContainerRef}
          className={compact
            ? 'flex gap-0 sm:gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth px-0 sm:px-4 py-2'
            : 'flex gap-0 sm:gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth px-0 sm:px-4 md:px-6 py-2'}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {gridItems.map((ad) =>
            ad.isPlaceholder ? (
              <Link
                key={ad.id}
                href="/advertise"
                className={`relative  border border-gray-100 rounded-xl transition-all duration-300 h-auto overflow-hidden ${compact ? 'snap-center w-full sm:w-[230px] flex-shrink-0' : 'snap-center w-full sm:w-[230px] md:w-[250px] flex-shrink-0'}`}
              >
                <span className="absolute top-1 right-1 z-10 text-[10px] font-bold uppercase bg-gray-900 text-white px-2 py-0.5 rounded-full">
                  Ad
                </span>
                <div className="h-2 caution-tape-bg"></div>
                <div className={`text-center flex flex-col items-center justify-center ${compact ? 'p-4 min-h-[170px]' : 'p-6 min-h-[190px]'}`}>
                  <p className="text-sm font-bold text-gray-900 mb-2">This Spot Is Available</p>
                  <p className="text-xs text-gray-600 mb-4">Put your business in front of active buyers and renters.</p>
                  <span className="inline-block bg-accent text-white px-4 py-2 rounded-lg text-xs font-semibold">
                    Advertise Here
                  </span>
                </div>
              </Link>
            ) : (
              <Link
                key={ad.id}
                href={`/ads/${ad.id}`}
                data-ad-id={ad.id}
                className={`relative bg-gray-25 border border-gray-200 rounded-xl transition-all duration-300 h-auto overflow-hidden ${compact ? 'snap-center w-full sm:w-[230px] flex-shrink-0' : 'snap-center w-full sm:w-[230px] md:w-[250px] flex-shrink-0'} ${
                  ad.is_featured ? 'ring-2 ring-yellow-400' : ''
                }`}
              >
                <span className="absolute top-2 right-2 z-10 text-[10px] font-bold uppercase bg-gray-900 text-white px-2 py-0.5 rounded-full">
                  Ad
                </span>
                {ad.is_featured && (
                  <div className="absolute top-2 left-2 z-10 bg-yellow-400 text-black text-xs px-3 py-1 rounded-full font-bold">
                    <Star className="inline-block w-3 h-3 mr-1" />
                    FEATURED
                  </div>
                )}

                {ad.image_url && (
                  <div className="w-full aspect-[4/3] bg-gray-50 overflow-hidden">
                    <img src={ad.image_url} alt={ad.company_name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-bold capitalize text-base mb-2 text-gray-800 line-clamp-1">
                    {ad.company_name}
                  </h3>

                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                    {ad.category?.replace('_', ' ')}
                  </p>

                  <p className="text-xs text-blue-600 mb-2 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {ad.impressions || 0} views
                  </p>

                  <p className="text-xs text-gray-600 line-clamp-2">{ad.description}</p>
                </div>
              </Link>
            )
          )}
        </div>
      ) : (
        // Empty state CTA
        <div className="text-center w-full py-12">
          {loadError && <p className="text-sm text-red-600 mb-3">{loadError}</p>}
          <Link
            href="/advertise"
            className="inline-block bg-accent text-white px-8 py-4 rounded-lg font-semibold hover:bg-accent/90 transition"
          >
            Create More Ads
          </Link>
        </div>
      )}

      {/* Bottom section: advertising CTA panel */}
      {!redirecting && (
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
      )}
    </div>
  )
}
