import Link from 'next/link';
import clsx from 'clsx';
import { formatMoney } from '../lib/formatMoney';
import LazyImage from './LazyImage';
import { Eye } from 'lucide-react';

export default function PropertyCard({ property, isOwner = false, index = 0 }) {
  const img = property.image_urls?.[0] || property.property_images?.[0]?.image_url || '/placeholder.png';
  const viewCount = Number(property.views || property.impressions || 0);
  const status = String(property.status || '').toLowerCase().trim();
  const isComingSoon = status === 'coming_soon';

  return (
    <Link 
      data-list-index={index} 
      className={clsx('bg-white rounded-xl border flex flex-col h-80 overflow-hidden')} 
      href={`/property/${property.slug || property.id}`}
    >
      <div className="relative h-48 w-full flex-shrink-0 overflow-hidden">
        <LazyImage src={img} alt={property.title} className="w-full h-full object-cover" />
        {isComingSoon && (
          <div className="absolute left-3 top-3 bg-yellow-400 text-yellow-900 text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full shadow-sm">
            Coming Soon
          </div>
        )}
      </div>

      <div className="flex-1 p-3 flex flex-col overflow-hidden">
        <div className="flex-1">
          <div className="text-lg font-semibold line-clamp-2">{property.title}</div>
          <div className="text-sm text-gray-500 line-clamp-1">{property.town}, {property.parish}</div>
        </div>

        <div className="mt-auto pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {(property.bedrooms == 0 && property.bathrooms == 0) ? 'Land' : `${property.bedrooms} bed • ${property.bathrooms} bath`}
            </div>
            <div className="text-accent font-bold text-sm">{formatMoney(property.price)}</div>
          </div>
          {viewCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
              <Eye className="w-3 h-3" />
              <span>{viewCount} views</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
