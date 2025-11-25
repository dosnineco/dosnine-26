import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';
import { Zap, X } from 'lucide-react';

const ROTATION_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

export default function BoostedPropertyBanner() {
  const [currentBoost, setCurrentBoost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    fetchActiveBoost();
    
    // Set up rotation interval
    const interval = setInterval(() => {
      fetchActiveBoost();
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const fetchActiveBoost = async () => {
    try {
      // Get all active boosts
      const { data: activeBoosts, error } = await supabase
        .from('property_boosts')
        .select(`
          *,
          properties (
            id,
            title,
            slug,
            parish,
            town,
            price,
            bedrooms,
            bathrooms,
            image_urls
          )
        `)
        .eq('status', 'active')
        .gte('boost_end_date', new Date().toISOString())
        .order('last_shown_at', { ascending: true, nullsFirst: true });

      if (error) throw error;

      if (activeBoosts && activeBoosts.length > 0) {
        // Get the boost that hasn't been shown recently (or never shown)
        const boostToShow = activeBoosts[0];
        
        // Update last_shown_at and increment counters
        await supabase
          .from('property_boosts')
          .update({
            last_shown_at: new Date().toISOString(),
            rotation_count: (boostToShow.rotation_count || 0) + 1,
            impressions: (boostToShow.impressions || 0) + 1
          })
          .eq('id', boostToShow.id);

        setCurrentBoost(boostToShow);
      } else {
        setCurrentBoost(null);
      }
    } catch (err) {
      console.error('Error fetching boost:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async () => {
    if (currentBoost) {
      // Track click
      await supabase
        .from('property_boosts')
        .update({
          clicks: (currentBoost.clicks || 0) + 1
        })
        .eq('id', currentBoost.id);
    }
  };

  const handleClose = () => {
    setVisible(false);
    // Store in localStorage to keep it hidden for this session
    localStorage.setItem('boostBannerHidden', 'true');
  };

  useEffect(() => {
    // Check if user closed it this session
    const hidden = localStorage.getItem('boostBannerHidden');
    if (hidden) {
      setVisible(false);
    }
  }, []);

  if (loading || !currentBoost || !visible || !currentBoost.properties) {
    return null;
  }

  const property = currentBoost.properties;
  const firstImage = property.image_urls && property.image_urls.length > 0 
    ? property.image_urls[0] 
    : '/placeholder-property.jpg';

  return (
    <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 border-b-4 border-yellow-600 relative animate-fade-in">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Featured Badge */}
          <div className="hidden md:flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg">
            <Zap className="h-5 w-5 text-white animate-pulse" />
            <span className="text-white font-bold text-sm">FEATURED</span>
          </div>

          {/* Property Info */}
          <Link 
            href={`/property/${property.slug}`}
            onClick={handleClick}
            className="flex-1 flex items-center gap-4 hover:opacity-90 transition group"
          >
            {/* Property Image */}
            <div className="hidden sm:block w-20 h-20 rounded-lg overflow-hidden border-2 border-white shadow-lg flex-shrink-0">
              <img
                src={firstImage}
                alt={property.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>

            {/* Property Details */}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-lg truncate group-hover:underline">
                {property.title}
              </h3>
              <p className="text-white/90 text-sm">
                {property.parish} {property.town && `• ${property.town}`} • {property.bedrooms} bed, {property.bathrooms} bath
              </p>
              <p className="text-white font-bold text-lg mt-1">
                JMD ${property.price?.toLocaleString()}/month
              </p>
            </div>

            {/* CTA Button */}
            <div className="hidden md:block">
              <span className="bg-white text-yellow-600 px-6 py-3 rounded-lg font-bold hover:bg-yellow-50 transition shadow-lg">
                View Details →
              </span>
            </div>
          </Link>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-2 hover:bg-white/20 rounded-full transition"
            aria-label="Close banner"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Mobile CTA */}
        <Link
          href={`/property/${property.slug}`}
          onClick={handleClick}
          className="md:hidden block mt-3"
        >
          <span className="block w-full text-center bg-white text-yellow-600 px-4 py-2 rounded-lg font-bold hover:bg-yellow-50 transition">
            View Details →
          </span>
        </Link>
      </div>

      {/* Rotation Indicator */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/30">
        <div
          className="h-full bg-white animate-progress"
          style={{
            animation: `progress ${ROTATION_INTERVAL}ms linear`
          }}
        />
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-progress {
          animation: progress linear;
        }
      `}</style>
    </div>
  );
}
