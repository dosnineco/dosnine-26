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

  const MAX_AD_SLOTS = 12

  /*
   * ------------------------------------------------------------
   * AD ROTATION
   * ------------------------------------------------------------
   */

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
      .reduce(
        (sum, char) => sum + char.charCodeAt(0),
        seed
      )

    return Math.abs(pathHash) % length
  }

  const sortAdsForBalance = (adList) => {
    return [...adList].sort((a, b) => {
      const aScore =
        Number(a.impressions || 0) +
        (a.is_featured ? -30 : 0)

      const bScore =
        Number(b.impressions || 0) +
        (b.is_featured ? -30 : 0)

      if (aScore !== bScore) {
        return aScore - bScore
      }

      if (
        (a.display_order || 0) !==
        (b.display_order || 0)
      ) {
        return (
          (a.display_order || 0) -
          (b.display_order || 0)
        )
      }

      return (
        new Date(a.created_at) -
        new Date(b.created_at)
      )
    })
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
    if (
      !Array.isArray(allAds) ||
      allAds.length === 0
    ) {
      return []
    }

    const sorted = sortAdsForBalance(allAds)

    const selected = sorted.slice(0, MAX_AD_SLOTS)

    return rotateAds(
      selected,
      getRotationOffset(selected.length)
    )
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
        .or(
          'expires_at.is.null,expires_at.gt.now()'
        )
        .limit(MAX_AD_SLOTS)

      if (error) throw error

      if (data?.length) {
        setAds(getBalancedAds(data))
      } else {
        setAds([])
      }
    } catch (error) {
      console.error(
        'Failed to load advertisements:',
        error
      )

      setLoadError(
        'Unable to load ads right now.'
      )

      setAds([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAds()
  }, [])

  /*
   * ------------------------------------------------------------
   * REFRESH
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (
      typeof window === 'undefined'
    ) {
      return
    }

    const refreshInterval =
      setInterval(() => {
        loadAds()
      }, 60000)

    const refreshOnFocus = () => {
      loadAds()
    }

    const refreshOnVisibility = () => {
      if (
        document.visibilityState ===
        'visible'
      ) {
        loadAds()
      }
    }

    window.addEventListener(
      'focus',
      refreshOnFocus
    )

    document.addEventListener(
      'visibilitychange',
      refreshOnVisibility
    )

    return () => {
      clearInterval(refreshInterval)

      window.removeEventListener(
        'focus',
        refreshOnFocus
      )

      document.removeEventListener(
        'visibilitychange',
        refreshOnVisibility
      )
    }
  }, [])

  /*
   * ------------------------------------------------------------
   * ROTATION
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!ads.length) return

    setActiveAdIndex(
      getRotationOffset(ads.length)
    )
  }, [ads.length])

  useEffect(() => {
    if (ads.length <= 1) return

    const interval = setInterval(() => {
      setActiveAdIndex(
        (prev) =>
          (prev + 1) % ads.length
      )
    }, 8000)

    return () => {
      clearInterval(interval)
    }
  }, [ads.length])

  /*
   * ------------------------------------------------------------
   * IMPRESSION TRACKING
   * ------------------------------------------------------------
   */

  const trackImpression = async (adId) => {
    if (
      impressionTracked.current.has(adId)
    ) {
      return
    }

    try {
      const { error } =
        await supabase.rpc(
          'increment_ad_impressions',
          {
            ad_id: adId,
          }
        )

      if (!error) {
        impressionTracked.current.add(
          adId
        )

        setAds((prevAds) =>
          prevAds.map((ad) =>
            ad.id === adId
              ? {
                  ...ad,
                  impressions:
                    Number(
                      ad.impressions || 0
                    ) + 1,
                }
              : ad
          )
        )
      }
    } catch (error) {
      console.error(
        'Failed to track impression:',
        error
      )
    }
  }

  /*
   * ------------------------------------------------------------
   * INTERSECTION OBSERVER
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!ads.length) return

    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (
              entry.isIntersecting
            ) {
              const adId =
                entry.target.getAttribute(
                  'data-ad-id'
                )

              if (adId) {
                trackImpression(adId)
              }
            }
          })
        },
        {
          threshold: 0.5,
        }
      )

    const elements =
      document.querySelectorAll(
        '[data-ad-id]'
      )

    elements.forEach((element) => {
      observer.observe(element)
    })

    return () => {
      observer.disconnect()
    }
  }, [ads])

  /*
   * ------------------------------------------------------------
   * STATES
   * ------------------------------------------------------------
   */

  if (loading) {
    return (
      <div
        className="
          w-full
          px-3
          py-3
          text-center
          text-xs
          text-gray-500
        "
      >
        Loading ads...
      </div>
    )
  }

  if (!ads.length) {
    return null
  }

  const activeAd =
    ads[activeAdIndex] || ads[0]

  if (!activeAd) {
    return null
  }

  const imageUrl =
    Array.isArray(
      activeAd.image_urls
    ) &&
    activeAd.image_urls.length > 0
      ? activeAd.image_urls[0]
      : activeAd.image_url

  const category =
    activeAd.category
      ?.replaceAll('_', ' ')
      ?.replace(/\b\w/g, (char) =>
        char.toUpperCase()
      )

  /*
   * ------------------------------------------------------------
   * RESPONSIVE AD
   * ------------------------------------------------------------
   */

  return (
    <section
      className={`
        w-full
        ${compact ? 'mb-2' : 'mb-4'}
      `}
      aria-label="Advertisement"
    >
      <div
        className="
          mx-auto
          w-full
          max-w-7xl
          px-3
          sm:px-4
          lg:px-6
        "
      >
        {/* Ad label */}
        <div
          className="
            mb-1
            flex
            items-center
            justify-between
          "
        >
          <span
            className="
              text-[9px]
              font-medium
              uppercase
              tracking-wider
              text-gray-400
            "
          >
            Sponsored
          </span>

          {ads.length > 1 && (
            <span
              className="
                text-[9px]
                text-gray-400
              "
            >
              {activeAdIndex + 1}/{ads.length}
            </span>
          )}
        </div>

        <Link
          href={`/ads/${activeAd.id}`}
          data-ad-id={activeAd.id}
          className="
            group
            relative
            block
            w-full
            overflow-hidden
            rounded-xl
            border
            border-gray-200
            bg-white
            shadow-sm
            transition
            hover:border-gray-300
            hover:shadow-md
          "
        >
          {/* ==================================================
              MOBILE
              Compact Google-style horizontal ad
          ================================================== */}

          <div
            className="
              flex
              min-h-[76px]
              items-center
              gap-3
              p-2.5

              sm:hidden
            "
          >
            {/* Image */}
            {imageUrl ? (
              <div
                className="
                  h-14
                  w-14
                  shrink-0
                  overflow-hidden
                  rounded-lg
                  bg-gray-100
                "
              >
                <img
                  src={imageUrl}
                  alt={
                    activeAd.company_name ||
                    'Advertisement'
                  }
                  className="
                    h-full
                    w-full
                    object-contain
                  "
                  loading="lazy"
                />
              </div>
            ) : (
              <div
                className="
                  flex
                  h-14
                  w-14
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  bg-gray-100
                  text-lg
                  font-bold
                  text-gray-700
                "
              >
                {activeAd.company_name
                  ?.slice(0, 1)
                  ?.toUpperCase() || 'A'}
              </div>
            )}

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div
                className="
                  mb-0.5
                  flex
                  items-center
                  gap-1.5
                "
              >
                <span
                  className="
                    truncate
                    text-[11px]
                    font-semibold
                    text-gray-500
                  "
                >
                  {activeAd.company_name}
                </span>
              </div>

              <h3
                className="
                  truncate
                  text-sm
                  font-semibold
                  leading-tight
                  text-gray-900
                "
              >
                {activeAd.title ||
                  activeAd.headline ||
                  category ||
                  'Discover more'}
              </h3>

              <p
                className="
                  mt-0.5
                  truncate
                  text-[11px]
                  leading-tight
                  text-gray-500
                "
              >
                {activeAd.description ||
                  'Learn more about this business.'}
              </p>
            </div>

            {/* Arrow */}
            <ExternalLink
              className="
                h-4
                w-4
                shrink-0
                text-gray-400
                transition
                group-hover:text-gray-700
              "
            />
          </div>

          {/* ==================================================
              TABLET
              Medium responsive ad
          ================================================== */}

          <div
            className="
              hidden
              min-h-[100px]
              items-center
              gap-4
              p-3

              sm:flex
              lg:hidden
            "
          >
            {imageUrl ? (
              <div
                className="
                  h-20
                  w-20
                  shrink-0
                  overflow-hidden
                  rounded-lg
                  bg-gray-100
                "
              >
                <img
                  src={imageUrl}
                  alt={
                    activeAd.company_name ||
                    'Advertisement'
                  }
                  className="
                    h-full
                    w-full
                    object-contain
                  "
                  loading="lazy"
                />
              </div>
            ) : (
              <div
                className="
                  flex
                  h-20
                  w-20
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  bg-gray-100
                  text-xl
                  font-bold
                "
              >
                {activeAd.company_name
                  ?.slice(0, 1)
                  ?.toUpperCase() || 'A'}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p
                className="
                  mb-1
                  text-xs
                  font-medium
                  text-gray-500
                "
              >
                {activeAd.company_name}
              </p>

              <h3
                className="
                  truncate
                  text-base
                  font-semibold
                  text-gray-900
                "
              >
                {activeAd.title ||
                  activeAd.headline ||
                  category ||
                  'Discover more'}
              </h3>

              <p
                className="
                  mt-1
                  line-clamp-2
                  text-sm
                  text-gray-500
                "
              >
                {activeAd.description ||
                  'Learn more about this business.'}
              </p>
            </div>

            <span
              className="
                shrink-0
                rounded-full
                border
                border-gray-300
                px-4
                py-2
                text-xs
                font-semibold
                text-gray-700
                transition
                group-hover:bg-gray-900
                group-hover:text-white
              "
            >
              Learn more
            </span>
          </div>

          {/* ==================================================
              DESKTOP
              Wide responsive display ad
          ================================================== */}

          <div
            className="
              hidden
              min-h-[120px]
              items-center
              gap-5
              p-4

              lg:flex
            "
          >
            {/* Large image */}
            {imageUrl ? (
              <div
                className="
                  h-[90px]
                  w-[140px]
                  shrink-0
                  overflow-hidden
                  rounded-lg
                  bg-gray-100
                "
              >
                <img
                  src={imageUrl}
                  alt={
                    activeAd.company_name ||
                    'Advertisement'
                  }
                  className="
                    h-full
                    w-full
                    object-contain
                  "
                  loading="lazy"
                />
              </div>
            ) : (
              <div
                className="
                  flex
                  h-[90px]
                  w-[140px]
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  bg-gray-100
                  text-2xl
                  font-bold
                  text-gray-700
                "
              >
                {activeAd.company_name
                  ?.slice(0, 1)
                  ?.toUpperCase() || 'A'}
              </div>
            )}

            {/* Main content */}
            <div className="min-w-0 flex-1">
              <div
                className="
                  mb-1
                  flex
                  items-center
                  gap-2
                "
              >
                <span
                  className="
                    text-xs
                    font-semibold
                    text-gray-500
                  "
                >
                  {activeAd.company_name}
                </span>

                {activeAd.is_featured && (
                  <span
                    className="
                      rounded-full
                      bg-gray-100
                      px-2
                      py-0.5
                      text-[10px]
                      font-medium
                      text-gray-600
                    "
                  >
                    Featured
                  </span>
                )}
              </div>

              <h3
                className="
                  truncate
                  text-lg
                  font-semibold
                  text-gray-900
                "
              >
                {activeAd.title ||
                  activeAd.headline ||
                  category ||
                  'Discover more'}
              </h3>

              <p
                className="
                  mt-1
                  line-clamp-2
                  max-w-2xl
                  text-sm
                  text-gray-500
                "
              >
                {activeAd.description ||
                  'Learn more about this business and what they offer.'}
              </p>
            </div>

            {/* CTA */}
            <div
              className="
                flex
                shrink-0
                items-center
              "
            >
              <span
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-gray-300
                  px-5
                  py-2.5
                  text-sm
                  font-semibold
                  text-gray-800
                  transition
                  group-hover:border-gray-900
                  group-hover:bg-gray-900
                  group-hover:text-white
                "
              >
                Learn more

                <ExternalLink
                  className="
                    h-4
                    w-4
                  "
                />
              </span>
            </div>
          </div>

          {/* Subtle sweep */}
          <div
            className="
              pointer-events-none
              absolute
              inset-y-0
              -left-1/3
              w-1/3
              skew-x-[-20deg]
              bg-white/20
              opacity-0
              transition
              duration-700
              group-hover:left-[120%]
              group-hover:opacity-100
            "
          />
        </Link>

        {/* Rotation indicators */}
        {ads.length > 1 && (
          <div
            className="
              mt-1.5
              flex
              justify-center
              gap-1
            "
          >
            {ads
              .slice(
                0,
                Math.min(ads.length, 6)
              )
              .map((ad, index) => (
                <button
                  key={ad.id}
                  type="button"
                  aria-label={`Show advertisement ${
                    index + 1
                  }`}
                  onClick={() =>
                    setActiveAdIndex(index)
                  }
                  className={`
                    h-1
                    rounded-full
                    transition-all
                    ${
                      index ===
                      activeAdIndex
                        ? 'w-4 bg-gray-700'
                        : 'w-1 bg-gray-300'
                    }
                  `}
                />
              ))}
          </div>
        )}
      </div>
    </section>
  )
}
