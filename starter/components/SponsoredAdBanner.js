'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

export default function SponsoredAdBanner({ compact = false }) {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeAdIndex, setActiveAdIndex] = useState(0)

  const impressionTracked = useRef(new Set())

  const MAX_AD_SLOTS = 20

  /*
   * ------------------------------------------------------------
   * FAIRNESS HELPERS
   * ------------------------------------------------------------
   * Goals:
   *  - Least-seen ads surface first across sessions
   *  - Ads with similar impressions don't lock into the same slot
   *  - The same user sees different "first" ads on each page load
   */

  // Session-scoped random seed — stable within one browser session.
  const getSessionSeed = () => {
    if (typeof window === 'undefined') return 0
    let seed = sessionStorage.getItem('dosnineAdsRotationSeed')
    if (!seed) {
      seed = String(
        Date.now() + Math.floor(Math.random() * 1000000)
      )
      sessionStorage.setItem('dosnineAdsRotationSeed', seed)
    }
    return Number(seed) || 0
  }

  // Per-load cursor — advances on every component mount so the
  // same page (e.g. /listing) doesn't always start with the same ad.
  const getLoadCursor = () => {
    if (typeof window === 'undefined') return 0
    const key = 'dosnineAdsLoadCursor'
    const current = Number(sessionStorage.getItem(key) || 0)
    sessionStorage.setItem(key, String(current + 1))
    return current
  }

  // Deterministic PRNG (mulberry32) so the same seed + tier
  // always yields the same shuffle for a given session.
  const mulberry32 = (seed) => {
    let t = seed + 0x6d2b79f5
    return () => {
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  const seededShuffle = (array, seed) => {
    const result = [...array]
    const rand = mulberry32(seed)
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  /*
   * Sort:
   *  1. Bucket ads by impression tier (25-impression buckets)
   *  2. Order tiers ascending — least-seen tiers first
   *  3. Seed-shuffle within each tier so ties don't lock order
   * Featured badge is intentionally NOT given a boost —
   * "equally and fairly" means every ad gets the same chance.
   */
  const sortAdsForBalance = (adList) => {
    if (!Array.isArray(adList) || adList.length === 0) return []

    const seed = getSessionSeed()
    const sorted = [...adList].sort((a, b) => {
      const aImp = Number(a.impressions || 0)
      const bImp = Number(b.impressions || 0)
      return aImp - bImp
    })

    const tierGroups = new Map()
    sorted.forEach((ad) => {
      const tier = Math.floor(Number(ad.impressions || 0) / 25)
      if (!tierGroups.has(tier)) tierGroups.set(tier, [])
      tierGroups.get(tier).push(ad)
    })

    const tierOrder = [...tierGroups.keys()].sort((a, b) => a - b)
    const result = []
    tierOrder.forEach((tier) => {
      const group = tierGroups.get(tier)
      const shuffled = seededShuffle(group, seed + tier * 1000)
      result.push(...shuffled)
    })
    return result
  }

  /*
   * Offset = (pathname hash + per-load cursor) % length
   * This rotates the array so a different ad lands in slot 0
   * on each page load, spreading top-position impressions evenly.
   */
  const getRotationOffset = (length, cursorOffset = 0) => {
    if (typeof window === 'undefined' || length === 0) return 0
    const seed = getSessionSeed()
    const pathHash = window.location.pathname
      .split('')
      .reduce((sum, char) => sum + char.charCodeAt(0), seed)
    return (Math.abs(pathHash) + cursorOffset) % length
  }

  const rotateAds = (adList, offset) => {
    if (adList.length === 0) return adList
    const index = offset % adList.length
    return [
      ...adList.slice(index),
      ...adList.slice(0, index),
    ]
  }

  const getBalancedAds = (allAds) => {
    if (!Array.isArray(allAds) || allAds.length === 0) return []

    const sorted = sortAdsForBalance(allAds)
    const selected = sorted.slice(0, MAX_AD_SLOTS)
    const cursor = getLoadCursor()
    const offset = getRotationOffset(selected.length, cursor)

    return rotateAds(selected, offset)
  }

  /*
   * ------------------------------------------------------------
   * LOAD ADS
   * ------------------------------------------------------------
   */

  const loadAds = async () => {
    try {
      setLoadError('')

      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .limit(MAX_AD_SLOTS)

      if (error) throw error

      if (data?.length) {
        setAds(getBalancedAds(data))
      } else {
        setAds([])
      }
    } catch (error) {
      console.error('Failed to load advertisements:', error)
      setLoadError('Unable to load ads right now.')
      setAds([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAds()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /*
   * ------------------------------------------------------------
   * REFRESH
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (typeof window === 'undefined') return

    const refreshInterval = setInterval(() => {
      loadAds()
    }, 40000)

    const refreshOnFocus = () => loadAds()

    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadAds()
      }
    }

    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnVisibility)

    return () => {
      clearInterval(refreshInterval)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /*
   * ------------------------------------------------------------
   * ROTATION
   * ------------------------------------------------------------
   * With up to 20 ads in rotation, an 8s interval means a full
   * cycle takes ~160s. Most users won't see them all — but the
   * fairness algorithm above ensures the *starting* ad varies
   * per session, so over many users every ad gets equal visibility.
   */

  useEffect(() => {
    if (!ads.length) return
    setActiveAdIndex(0)
  }, [ads.length])

  useEffect(() => {
    if (ads.length <= 1) return
    const interval = setInterval(() => {
      setActiveAdIndex((prev) => (prev + 1) % ads.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [ads.length])

  const activeAd = ads[activeAdIndex] || ads[0]

  /*
   * ------------------------------------------------------------
   * IMPRESSION TRACKING
   * ------------------------------------------------------------
   * The previous observer only fired once because the DOM node
   * stayed the same while its `data-ad-id` attribute changed.
   * Now we track on every change of the active ad, plus keep
   * the IntersectionObserver as a visibility safety net.
   */

  const trackImpression = async (adId) => {
    if (!adId) return
    if (impressionTracked.current.has(adId)) return

    impressionTracked.current.add(adId)

    try {
      const { error } = await supabase.rpc('increment_ad_impressions', {
        ad_id: adId,
      })

      if (!error) {
        setAds((prevAds) =>
          prevAds.map((ad) =>
            ad.id === adId
              ? { ...ad, impressions: Number(ad.impressions || 0) + 1 }
              : ad
          )
        )
      }
    } catch (error) {
      // Roll back the ref guard so it can retry next time
      impressionTracked.current.delete(adId)
      console.error('Failed to track impression:', error)
    }
  }

  // Primary tracking — fires whenever the active ad changes.
  useEffect(() => {
    if (!activeAd?.id) return
    trackImpression(activeAd.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAd?.id])

  // Safety net — re-observe whenever the active ad changes so the
  // observer fires for the current node, not a stale one.
  useEffect(() => {
    if (!activeAd?.id) return
    const node = document.querySelector(
      `[data-ad-id="${activeAd.id}"]`
    )
    if (!node) return

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
    observer.observe(node)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAd?.id])

  /*
   * ------------------------------------------------------------
   * STATES
   * ------------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="w-full px-3 py-3 text-center text-xs text-gray-500">
        Loading ads...
      </div>
    )
  }

  if (!ads.length) {
    return null
  }

  if (!activeAd) {
    return null
  }

  const imageUrl =
    Array.isArray(activeAd.image_urls) && activeAd.image_urls.length > 0
      ? activeAd.image_urls[0]
      : activeAd.image_url

  const category = activeAd.category
    ?.replaceAll('_', ' ')
    ?.replace(/\b\w/g, (char) => char.toUpperCase())

  /*
   * ------------------------------------------------------------
   * RESPONSIVE AD
   * ------------------------------------------------------------
   */

  return (
    <section
      className={`w-full ${compact ? 'mb-2' : 'mb-4'}`}
      aria-label="Advertisement"
    >
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6">
        {/* Ad label */}
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[9px] font-medium uppercase tracking-wider text-gray-400">
            Sponsored
          </span>

          {ads.length > 1 && (
            <span className="text-[9px] text-gray-400">
              {activeAdIndex + 1}/{ads.length}
            </span>
          )}
        </div>

        <Link
          href={`/ads/${activeAd.id}`}
          data-ad-id={activeAd.id}
          className="group relative block w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md"
        >
          {/* ==================================================
              MOBILE — Compact horizontal ad
          ================================================== */}

          <div className="flex min-h-[76px] items-center gap-3 p-2.5 sm:hidden">
            {imageUrl ? (
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={imageUrl}
                  alt={activeAd.company_name || 'Advertisement'}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-lg font-bold text-gray-700">
                {activeAd.company_name?.slice(0, 1)?.toUpperCase() || 'A'}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-1.5">
                <span className="truncate text-[11px] font-semibold text-gray-500">
                  {activeAd.company_name}
                </span>
              </div>

              <h3 className="truncate text-sm font-semibold leading-tight text-gray-900">
                {activeAd.title ||
                  activeAd.headline ||
                  category ||
                  'Discover more'}
              </h3>

              <p className="mt-0.5 truncate text-[11px] leading-tight text-gray-500">
                {activeAd.description ||
                  'Learn more about this business.'}
              </p>
            </div>

            <ExternalLink className="h-4 w-4 shrink-0 text-gray-400 transition group-hover:text-gray-700" />
          </div>

          {/* ==================================================
              TABLET — Medium responsive ad
          ================================================== */}

          <div className="hidden min-h-[100px] items-center gap-4 p-3 sm:flex lg:hidden">
            {imageUrl ? (
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={imageUrl}
                  alt={activeAd.company_name || 'Advertisement'}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xl font-bold">
                {activeAd.company_name?.slice(0, 1)?.toUpperCase() || 'A'}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-medium text-gray-500">
                {activeAd.company_name}
              </p>

              <h3 className="truncate text-base font-semibold text-gray-900">
                {activeAd.title ||
                  activeAd.headline ||
                  category ||
                  'Discover more'}
              </h3>

              <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                {activeAd.description ||
                  'Learn more about this business.'}
              </p>
            </div>

            <span className="shrink-0 rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 transition group-hover:bg-gray-900 group-hover:text-white">
              Learn more
            </span>
          </div>

          {/* ==================================================
              DESKTOP — Wide display ad
          ================================================== */}

          <div className="hidden min-h-[120px] items-center gap-5 p-4 lg:flex">
            {imageUrl ? (
              <div className="h-[90px] w-[140px] shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={imageUrl}
                  alt={activeAd.company_name || 'Advertisement'}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="flex h-[90px] w-[140px] shrink-0 items-center justify-center rounded-lg bg-gray-100 text-2xl font-bold text-gray-700">
                {activeAd.company_name?.slice(0, 1)?.toUpperCase() || 'A'}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">
                  {activeAd.company_name}
                </span>

                {activeAd.is_featured && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                    Featured
                  </span>
                )}
              </div>

              <h3 className="truncate text-lg font-semibold text-gray-900">
                {activeAd.title ||
                  activeAd.headline ||
                  category ||
                  'Discover more'}
              </h3>

              <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-gray-500">
                {activeAd.description ||
                  'Learn more about this business and what they offer.'}
              </p>
            </div>

            <div className="flex shrink-0 items-center">
              <span className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-800 transition group-hover:border-gray-900 group-hover:bg-gray-900 group-hover:text-white">
                Learn more
                <ExternalLink className="h-4 w-4" />
              </span>
            </div>
          </div>

          {/* Subtle sweep */}
          <div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/20 opacity-0 transition duration-700 group-hover:left-[120%] group-hover:opacity-100" />
        </Link>

        {/* Rotation indicators */}
        {ads.length > 1 && (
          <div className="mt-1.5 flex justify-center gap-1">
            {ads.slice(0, Math.min(ads.length, 6)).map((ad, index) => (
              <button
                key={ad.id}
                type="button"
                aria-label={`Show advertisement ${index + 1}`}
                onClick={() => setActiveAdIndex(index)}
                className={`h-1 rounded-full transition-all ${
                  index === activeAdIndex
                    ? 'w-4 bg-gray-700'
                    : 'w-1 bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}