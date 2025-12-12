import Link from 'next/link';
import clsx from 'clsx';
import { formatMoney } from '../lib/formatMoney';
import LazyImage from './LazyImage';

export default function PropertyCard({ property, isOwner = false, index = 0 }) {
  const img = property.image_urls?.[0] || property.property_images?.[0]?.image_url || '/placeholder.png';

  return (
    <Link 
      data-list-index={index} 
      className={clsx('bg-white rounded-xl border flex flex-col h-80 overflow-hidden')} 
      href={`/property/${property.slug || property.id}`}
    >
      <div className="h-48 w-full flex-shrink-0 overflow-hidden">
        <LazyImage src={img} alt={property.title} className="w-full h-full object-cover" />
      </div>

      <div className="flex-1 p-3 flex flex-col overflow-hidden">
        <div className="flex-1">
          <div className="text-lg font-semibold line-clamp-2">{property.title}</div>
          <div className="text-sm text-gray-500 line-clamp-1">{property.town}, {property.parish}</div>
        </div>

        <div className="mt-auto pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">{property.bedrooms} bed • {property.bathrooms} bath</div>
            <div className="text-green-600 font-bold text-sm">{formatMoney(property.price)}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
