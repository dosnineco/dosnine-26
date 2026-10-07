'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { X, ExternalLink } from 'lucide-react'

const POPUP_DURATION_MS = 15000
const MAX_POOL = 20
const SHOWN_ADS_KEY = 'dosnine:popup-shown-ads'

export default function PropertyPopupAd({ propertyId, show = true, onDismiss }) {
  const [ad, setAd] = useState(null)
  const [visible, setVisible] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(15)
  const closedRef = useRef(false)
  const onDismissRef = useRef(onDismiss)

  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  /* Load an ad only when requested. */
  useEffect(() => {
    if (!propertyId || !show) return
    if (typeof window === 'undefined') return

    setAd(null)
    setVisible(false)
    setSecondsLeft(POPUP_DURATION_MS / 1000)
    closedRef.current = false

    let cancelled = false

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('advertisements')
          .select('*')
          .eq('is_active', true)
          .contains('placement_types', ['popup'])
          .or('expires_at.is.null,expires_at.gt.now()')
          .limit(MAX_POOL)

        if (cancelled) return
        if (error) throw error
        if (!data?.length) {
          closedRef.current = true
          onDismissRef.current?.()
          return
        }

        let shown = []
        try {
          shown = JSON.parse(sessionStorage.getItem(SHOWN_ADS_KEY) || '[]')
          if (!Array.isArray(shown)) shown = []
        } catch {
          shown = []
        }

        const unseen = data.filter((item) => !shown.includes(item.id))
        const pool = unseen.length > 0 ? unseen : data

        const picked = pool[Math.floor(Math.random() * pool.length)]
        if (!picked) {
          closedRef.current = true
          onDismissRef.current?.()
          return
        }

        const nextShown =
          unseen.length > 0
            ? [...shown, picked.id]
            : [picked.id]

        try {
          sessionStorage.setItem(SHOWN_ADS_KEY, JSON.stringify(nextShown))
        } catch {
          // ignore quota / privacy-mode errors
        }

        if (cancelled) return

        setAd(picked)
        setVisible(true)
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load property popup ad:', error)
        closedRef.current = true
        onDismissRef.current?.()
      }
    }

    const timer = setTimeout(load, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [propertyId, show])

  const dismiss = useCallback(() => {
    if (closedRef.current) return
    closedRef.current = true
    setVisible(false)
    onDismissRef.current?.()
  }, [])

  /* Auto-dismiss after the ad duration */
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => {
      dismiss()
    }, POPUP_DURATION_MS)
    return () => clearTimeout(t)
  }, [visible, dismiss])

  /* Visible countdown 15 → 0 */
  useEffect(() => {
    if (!visible) return
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [visible])

  /* Escape to dismiss */
  useEffect(() => {
    if (!visible) return
    const onKey = (e) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, dismiss])

  if (!visible || !ad) return null

  const imageUrl =
    Array.isArray(ad.image_urls) && ad.image_urls.length > 0
      ? ad.image_urls[0]
      : ad.image_url

  const category = ad.category?.replaceAll('_', ' ')
  const progressPercent = ((15 - secondsLeft) / 15) * 100

  return (
    <div
      role="dialog"
      aria-label="Sponsored advertisement"
      onClick={dismiss}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-popup-in"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          dismiss()
        }}
        aria-label="Close advertisement"
        className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 sm:right-6 sm:top-6"
      >
        <X size={20} />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[100dvh] w-full flex-col overflow-y-auto bg-white sm:h-[82dvh] sm:max-h-[820px] sm:max-w-3xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-400">
              Sponsored
            </span>
            {ad.is_featured && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Featured
              </span>
            )}
          </div>

          <div className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            Closes in {secondsLeft}s
          </div>
        </div>

        <div className="h-0.5 w-full overflow-hidden bg-gray-100">
          <div
            className="h-full bg-gray-900 transition-[width] duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <Link
          href={`/ads/${ad.id}`}
          onClick={dismiss}
          className="group min-h-0 flex-1 overflow-y-auto"
        >
          <div className="relative flex h-[28vh] min-h-[180px] max-h-[240px] shrink-0 items-center justify-center bg-gray-50 sm:h-[30vh] sm:min-h-[220px] sm:max-h-[280px]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={ad.company_name || 'Advertisement'}
                className="h-full w-full object-contain p-4 transition duration-500 group-hover:scale-[1.03]"
                loading="eager"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[6rem] font-black text-gray-300 sm:text-[8rem]">
                {ad.company_name?.slice(0, 1)?.toUpperCase() || 'A'}
              </div>
            )}
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold uppercase tracking-wider text-gray-500">
                {ad.company_name}
              </span>
              {category && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="capitalize text-gray-500">{category}</span>
                </>
              )}
            </div>

            <h2 className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
              {ad.title || ad.headline || 'Discover more'}
            </h2>

            {ad.description && (
              <p className="line-clamp-3 text-sm leading-relaxed text-gray-600 sm:text-base">
                {ad.description}
              </p>
            )}

            </div>
        </Link>

        <div className="mt-auto flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 bg-white p-4 sm:px-6">
            <Link
              href={`/ads/${ad.id}`}
              onClick={dismiss}
              className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent"
            >
              Learn more
              <ExternalLink size={14} />
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-semibold text-gray-500 transition hover:text-gray-900"
            >
              Skip ad
            </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes popupFadeIn {
          from {
            opacity: 0;
            transform: scale(0.98);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        :global(.animate-popup-in) {
          animation: popupFadeIn 260ms cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  )
}