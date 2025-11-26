import Link from 'next/link';
import clsx from 'clsx';
import { formatMoney } from '../lib/formatMoney';

export default function PropertyCard({ property }) {
  const img = property.image_urls?.[0] || property.property_images?.[0]?.image_url || '/placeholder.png';

  return (
    <div className={clsx('bg-white rounded-xl border p-3 flex flex-col')}>
      <div className="h-44 w-full mb-3 overflow-hidden rounded">
        <img className="w-full h-full object-cover" src={img} alt={property.title} />
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{property.title}</div>
            <div className="text-sm text-gray-500">{property.town}, {property.parish}</div>
          </div>
          <div className="text-green-600 font-bold">{formatMoney(property.price)}</div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">{property.bedrooms} bed • {property.bathrooms} bath</div>
          <div className="flex gap-2">
            <Link href={`/property/${property.slug || property.id}`} className="bg-blue-600 text-white px-3 py-1 rounded block">
              View
            </Link>
            <a
              className="bg-green-500 text-white px-3 py-1 rounded"
              href={`https://wa.me/8760000000?text=I'm%20interested%20in%20${encodeURIComponent(property.title)}`}
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
