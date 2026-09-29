import clsx from 'clsx';
import Link from 'next/link';
import { formatPropertyMoney } from '../lib/formatMoney';
import LazyImage from './LazyImage';
import { MapPin, BedDouble, Bath, Eye, Star } from 'lucide-react';

export default function PropertyCard({ property, isOwner = false, index = 0 }) {
  const img =
    property.image_urls?.[0] ||
    property.property_images?.[0]?.image_url ||
    '/placeholder.png';

  const viewCount = Number(property.views || property.impressions || 0);
  const status = String(property.status || '').toLowerCase().trim();
  const isComingSoon = status === 'coming_soon';

  const listingType = String(
    property.listing_type ||
      property.listingType ||
      property.type ||
      ''
  )
    .toLowerCase()
    .trim();
  const isRental = ['rent', 'rental', 'for rent', 'for_rent'].includes(
    listingType
  );

  const isLand =
    Number(property.bedrooms) === 0 && Number(property.bathrooms) === 0;

  const listingBadge = isComingSoon
    ? null
    : isLand
    ? 'Land'
    : isRental
    ? 'For Rent'
    : 'For Sale';

  return (
    <Link
      href={`/property/${property.slug || property.id}`}
      data-list-index={index}
      aria-label={property.title || 'View property'}
      className={clsx(
        'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white',
        'transition duration-200 hover:-translate-y-1 hover:border-slate-300',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2'
      )}
    >
      {/* ============================================================
          IMAGE
          ============================================================ */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-slate-100">
        <LazyImage
          src={img}
          alt={property.title || 'Property'}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />

        {/* Top-left badges */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {isComingSoon && (
            <span className="inline-flex items-center rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
              Coming Soon
            </span>
          )}
          {!isComingSoon && property.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 backdrop-blur">
              <Star size={10} className="fill-amber-500 text-amber-500" />
              Featured
            </span>
          )}
        </div>

        {/* Top-right listing type */}
        {listingBadge && (
          <span className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
            {listingBadge}
          </span>
        )}
      </div>

      {/* ============================================================
          BODY
          ============================================================ */}
      <div className="flex flex-1 flex-col p-4">
        {/* Price */}
        <p className="text-lg font-bold leading-none tracking-tight text-slate-900">
          {formatPropertyMoney(property.price, property.currency)}
          {isRental && (
            <span className="ml-1 text-sm font-medium text-slate-500">
              /month
            </span>
          )}
        </p>

        {/* Title */}
        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-slate-800">
          {property.title || 'Untitled property'}
        </h3>

        {/* Location */}
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">
            {property.town ? `${property.town}, ` : ''}
            {property.parish || 'Location not set'}
          </span>
        </p>

        {/* Specs footer */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
            {isLand ? (
              <span className="text-slate-600">Land</span>
            ) : (
              <>
                {property.bedrooms != null && (
                  <span className="inline-flex items-center gap-1">
                    <BedDouble size={14} className="text-slate-400" />
                    {property.bedrooms}
                  </span>
                )}
                {property.bathrooms != null && (
                  <span className="inline-flex items-center gap-1">
                    <Bath size={14} className="text-slate-400" />
                    {property.bathrooms}
                  </span>
                )}
              </>
            )}
          </div>

          
        </div>
      </div>
    </Link>
  );
}