import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Star, Eye, Phone } from 'lucide-react';

export default function AdvertisementGrid() {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const impressionTracked = useRef(new Set())
  const scrollContainerRef = useRef(null)
  const autoScrollInterval = useRef(null)

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

    // On mobile, show featured first. On desktop, interleave after every 3 regular ads
    if (data && data.length > 0) {
      const featured = data.filter(ad => ad.is_featured)
      const regular = data.filter(ad => !ad.is_featured)
      
      if (featured.length > 0 && typeof window !== 'undefined') {
        const isMobile = window.innerWidth < 768
        
        if (isMobile) {
          // Mobile: Featured first, then regular
          setAds([...featured, ...regular])
        } else {
          // Desktop: Interleave featured after every 3 regular ads
          const interleaved = []
          let featuredIndex = 0
          
          for (let i = 0; i < regular.length; i++) {
            interleaved.push(regular[i])
            
            if ((i + 1) % 3 === 0 && featuredIndex < featured.length) {
              interleaved.push(featured[featuredIndex])
              featuredIndex++
            }
          }
          
          // Add remaining featured ads at the end
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
    
    setLoading(false)
  }

  const trackImpression = async (adId) => {
    if (impressionTracked.current.has(adId)) return
    
    try {
      const { error } = await supabase.rpc('increment_ad_impressions', {
        ad_id: adId
      })
      
      if (!error) {
        impressionTracked.current.add(adId)
        // Update the ad count in state immediately
        setAds(prevAds => 
          prevAds.map(ad => 
            ad.id === adId 
              ? { ...ad, impressions: (ad.impressions || 0) + 1 }
              : ad
          )
        )
      } else {
        console.error('Impression tracking error:', error)
      }
    } catch (err) {
      console.error('Failed to track impression:', err)
    }
  }

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

  // Auto-scroll for mobile
  useEffect(() => {
    if (typeof window === 'undefined' || !scrollContainerRef.current) return
    
    const isMobile = window.innerWidth < 768
    if (!isMobile || ads.length === 0) return

    autoScrollInterval.current = setInterval(() => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current
        const cardWidth = container.children[0]?.offsetWidth || 0
        const gap = 24 // 1.5rem gap
        const scrollAmount = cardWidth + gap
        
        // Scroll to next card
        if (container.scrollLeft + container.offsetWidth >= container.scrollWidth - 10) {
          // Reset to start
          container.scrollTo({ left: 0, behavior: 'smooth' })
        } else {
          container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
        }
      }
    }, 4000) // Change card every 4 seconds

    return () => {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current)
      }
    }
  }, [ads])

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
    <div className="w-full bg-gray-200 mb-8 py-3 rounded-xl">
     
     <h3 className="text-lg font-bold text-gray-800 px-6 mb-2">
      You might also require?    </h3>

 {/* Header */}
      <div className="flex justify-start items-center ">
        <Link
          href="/advertise"
          className="  italic text-blue-800 text-sm mb-2 px-6 underline rounded-lg font-semibold hover:bg-accent/90 transition "
        >
          Advertise Your Business
        </Link> 
      </div>


      {/* Ads Grid */}
      {ads.length > 0 ? (
        <div 
          ref={scrollContainerRef}
          className="flex md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory md:snap-none scroll-smooth px-4 md:px-6 py-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {ads.map(ad => (
            <Link
              key={ad.id}
              href={`/ads/${ad.id}`}
              data-ad-id={ad.id}
              className={`relative bg-white rounded-xl p-4 transition-all duration-300 hover:shadow-lg snap-center w-[280px] md:w-auto flex-shrink-0 h-auto ${
                ad.is_featured ? 'ring-2 ring-yellow-400' : 'shadow-sm'
              }`}
            >
              {ad.is_featured && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs px-3 py-1 rounded-full font-bold ">
                  <Star className="inline-block w-3 h-3 mr-1" />
                  FEATURED
                </div>
              )}

              {ad.image_url && (
                <div className="w-full h-28 mb-3 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                  <img
                    src={ad.image_url}
                    alt={ad.company_name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}

              <h3 className="font-bold text-base mb-2 text-gray-800 line-clamp-1">
                {ad.company_name}
              </h3>

              <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                {ad.category?.replace('_', ' ')}
              </p>
              
              <p className="text-xs text-blue-600 mb-2 flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {ad.impressions || 0} views
              </p>
              
             

              <p className="text-xs text-gray-600 line-clamp-2">
                {ad.description}
              </p>

            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Link
            href="/advertise"
            className="inline-block bg-accent text-white px-8 py-4 rounded-lg font-semibold hover:bg-accent/90 transition "
          >
            Advertise Your Business
          </Link>
        </div>
      )}


    
    </div>
  )
}
