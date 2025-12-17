import Head from 'next/head';
import Seo from '../../components/Seo';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useUser } from '@clerk/nextjs';
import { Zap, Phone } from 'lucide-react';
import { formatMoney } from '../../lib/formatMoney';

export async function getStaticPaths() {
  const { data } = await supabase
    .from('properties')
    .select('slug')
    .eq('status', 'available');

  const paths = (data || []).map((prop) => ({
    params: { slug: prop.slug },
  }));

  return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params }) {
  const { slug } = params;
  const { data } = await supabase
    .from('properties')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'available')
    .single();

  if (!data) {
    return { notFound: true };
  }

  // Increment view count
  await supabase
    .from('properties')
    .update({ views: (data.views || 0) + 1 })
    .eq('id', data.id);

  // Fetch similar properties in the same parish
  const { data: similarProps } = await supabase
    .from('properties')
    .select('*')
    .eq('status', 'available')
    .eq('parish', data.parish)
    .neq('id', data.id)
    .limit(4);

  return {
    props: { 
      property: data,
      similarProperties: similarProps || []
    },
    revalidate: 60,
  };
}

export default function PropertyPage({ property, similarProperties }) {
  const { user } = useUser();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isOwner, setIsOwner] = useState(false);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [property.slug]);

  useEffect(() => {
    const checkOwner = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user.id)
        .single();
      if (data && data.id === property.owner_id) {
        setIsOwner(true);
      }
    };
    checkOwner();
  }, [user, property.owner_id]);

  // Support both image_urls array and property_images table
  const imageUrls = property.image_urls || [];
  const propertyImages = property.property_images || [];
  const allImages = imageUrls.length > 0 ? imageUrls : propertyImages.map(img => img.image_url);
  const currentImage = allImages[currentImageIndex] || '/placeholder.png';

  const handlePrevImage = () => {
    setCurrentImageIndex((i) => (i === 0 ? allImages.length - 1 : i - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((i) => (i === allImages.length - 1 ? 0 : i + 1));
  };

  const formatPhone = (raw) => {
    if (!raw) return '';
    // Keep leading + if present, strip other non-digits
    const hasPlus = raw.trim().startsWith('+');
    const cleaned = raw.replace(/[^0-9]/g, '');
    if (!cleaned) return raw;

    // If we have a country code (1-3 digits) at start, keep it grouped
    let cc = '';
    let rest = cleaned;
    if (hasPlus) {
      // assume first 1-3 digits are country code
      const match = cleaned.match(/^([0-9]{1,3})([0-9]*)$/);
      if (match) {
        cc = `+${match[1]} `;
        rest = match[2] || '';
      }
    }

    // Group remainder into chunks of 3 for nicer display
    const groups = rest.match(/.{1,3}/g) || [];
    return cc + groups.join(' ');
  };

  // Generate JSON-LD schema for SEO (Property + BreadcrumbList for Feature Snippets)
  const jsonLdProperty = {
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name: property.title,
    description: property.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.address || '',
      addressLocality: property.town || '',
      addressRegion: property.parish || '',
      addressCountry: 'JM'
    },
    priceRange: `$${property.price}`,
    priceCurrency: 'JMD',
    numberOfBedrooms: property.bedrooms || null,
    numberOfBathrooms: property.bathrooms || null,
    image: allImages,
    url: `https://dosnine.com/property/${property.slug}`,
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/ViewAction',
      userInteractionCount: property.views || 0
    },
    isPartOf: {
      '@type': 'WebSite',
      name: 'Dosnine Properties'
    }
  };

  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://dosnine.com'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Properties',
        item: 'https://dosnine.com/'
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: property.title,
        item: `https://dosnine.com/property/${property.slug}`
      }
    ]
  };

  return (
    <>
      <Seo
        title={`${property.title} — Dosnine Properties`}
        description={property.description}
        image={currentImage}
        url={`https://dosnine.com/property/${property.slug}`}
        structuredData={[jsonLdProperty, jsonLdBreadcrumb]}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-4 ">
          <Link href="/" className="btn-outline btn-sm">← Back to Browse</Link>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Images Section */}
          <div className="lg:col-span-2">
            <div className="relative bg-gray-200 rounded-xl overflow-hidden mb-4">
              <img src={currentImage} alt={property.title} className="w-full h-96 object-cover" />

              {allImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
                  >
                    ←
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
                  >
                    →
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {allImages.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail Grid */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2 mb-6">
                {allImages.map((imgUrl, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    className={`h-20 rounded-lg overflow-hidden border-2 transition ${i === currentImageIndex ? 'border-blue-500' : 'border-gray-300 hover:border-gray-400'}`}
                  >
                    <img src={imgUrl} alt={`${property.title} ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

               <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 mt-4">
                <p className="text-gray-700 mb-2">
                  <strong>Important:</strong> Never pay a deposit in order to view or "hold" a property
                </p>
              
              </div> 

            {/* Property Details */}
            <div className="bg-white rounded-xl  p-6 mb-6">
              <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
              <p className="text-lg text-gray-600 mb-4">{property.town}, {property.parish}</p>

              <div className="flex items-center gap-6 mb-6 pb-6 border-b">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatMoney(property.price, '$')}</div>
                  <div className="text-sm text-gray-600">{property.type === 'rent' ? '/ month' : null}</div>
                </div>
                <div className="flex gap-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold">🛏️ {property.bedrooms}</div>
                    <div className="text-sm text-gray-600">Bedrooms</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">🚿 {property.bathrooms}</div>
                    <div className="text-sm text-gray-600">Bathrooms</div>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-4">About this property</h2>
              <p className="text-gray-700 mb-4">{property.description}</p>

              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Address:</strong> {property.address}
                </p>
                {property.available_date && (
                  <p className="text-sm text-gray-700 mt-2">
                    <strong>Available from:</strong> {new Date(property.available_date).toLocaleDateString()}
                  </p>
                )}
              </div>

              
            </div>
          </div>

          {/* Sidebar: Contact Info */}
          <div>
            <div className="bg-white rounded-xl  p-6 relative top-4">
              {isOwner && !property.is_featured ? (
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-4">Boost Your Property</h3>
                  <p className="text-gray-600 mb-4 text-sm">Get more visibility by featuring this property on the homepage banner!</p>
                  <Link
                    href="/properties/boost-property"
                    className="block w-full btn-primary"
                  >
                    <Zap className="inline w-5 h-5 mr-2" />
                    Boost This Property
                  </Link>
                  <p className="text-xs text-gray-500 mt-2 text-center">Featured on rotating banner for 10 days</p>
                  <div className="border-t mt-6 pt-6"></div>
                </div>
              ) : null}
              
              <h3 className="text-xl font-bold mb-4">Contact Landlord</h3>
              
              <div className="space-y-4">
                <p className="text-gray-600">Interested in this property? Get in touch directly via WhatsApp.</p>
                
                <a
                  href={`https://wa.me/${property.phone_number}?text=Hi, I'm interested in ${encodeURIComponent(property.title)} at ${encodeURIComponent(property.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full btn-primary"
                >
                  WhatsApp
                </a>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500">👁️ Views: <span className="font-semibold text-gray-700">{property.views || 0}</span></p>
                </div>

                <a
                  href={`tel:${property.phone_number}`}
                  className="mt-3 flex items-center justify-center gap-3 w-full btn-outline"
                >
                  <Phone className="w-5 h-5" />
                  <span>{formatPhone(property.phone_number) || 'Call Landlord'}</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Properties Section */}
        {similarProperties && similarProperties.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Similar Properties in {property.parish}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarProperties.map((prop) => {
                const firstImage = prop.image_urls?.[0] || prop.property_images?.[0]?.image_url;
                
                return (
                  <Link 
                    key={prop.id} 
                    href={`/property/${prop.slug || prop.id}`}
                    className="bg-white rounded-xl  overflow-hidden  transition transform hover:scale-105 block"
                  >
                    <div className="relative h-48 bg-gray-200">
                      {firstImage ? (
                        <img 
                          src={firstImage} 
                          alt={prop.title} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/placeholder.png';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600">📷 No image</div>
                      )}
                      {prop.is_featured && (
                        <div className="absolute top-2 right-2 bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-bold">⭐</div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-accent text-white px-2 py-1 rounded text-sm font-semibold">
                        {formatMoney(prop.price)}
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{prop.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{prop.town}, {prop.parish}</p>
                      
                      <div className="flex gap-3 text-sm text-gray-700">
                        <span>{prop.bedrooms} bed</span>
                        <span>{prop.bathrooms} bath</span>
                        <span className="ml-auto text-xs">👁️ {prop.views || 0}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

         
      </div>
    </>
  );
}