import clsx from 'clsx';
import { formatPropertyMoney } from '../lib/formatMoney';
import LazyImage from './LazyImage';
import { Eye } from 'lucide-react';

export default function PropertyCard({ property, isOwner = false, index = 0 }) {
  const img = property.image_urls?.[0] || property.property_images?.[0]?.image_url || '/placeholder.png';
  const viewCount = Number(property.views || property.impressions || 0);
  const status = String(property.status || '').toLowerCase().trim();
  const isComingSoon = status === 'coming_soon';

  return (
    <a 
      data-list-index={index} 
      className={clsx('bg-white border border-gray-200 rounded-xl flex min-h-80 flex-col overflow-hidden')} 
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

      <div className="flex-1 min-w-0 p-3 flex flex-col">
        <div className="flex-1">
          <div className="min-w-0 break-words text-lg font-semibold">{property.title}</div>
          <div className="min-w-0 break-words text-sm text-gray-500">{property.town}, {property.parish}</div>
        </div>

        <div className="mt-4 pt-2 border-t">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0 text-sm text-gray-600">
              {(property.bedrooms == 0 && property.bathrooms == 0) ? 'Land' : `${property.bedrooms} bed • ${property.bathrooms} bath`}
            </div>
            <div className="shrink-0 whitespace-nowrap text-accent font-bold text-sm">{formatPropertyMoney(property.price, property.currency)}</div>
          </div>
          {/* {viewCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
              <Eye className="w-3 h-3" />
              <span>{viewCount} views</span>
            </div>
          )} */}
        </div>
      </div>
    </a>
  );
}
