import Head from 'next/head';
import Seo from '../../components/Seo';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useUser } from '@clerk/nextjs';
import { Zap, Phone } from 'lucide-react';
import { formatMoney } from '../../lib/formatMoney';
import { normalizeParish } from '../../lib/normalizeParish';
import PropertyAgentRequest from '../../components/PropertyAgentRequest';
import AdList from '../../components/AdList';

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

  // Fetch owner verification status from users table (synced with agents table)
  const { data: ownerData, error: ownerError } = await supabase
    .from('users')
    .select('agent_is_verified, verified_at')
    .eq('id', data.owner_id)
    .single();

  if (ownerError) {
    console.error('Error fetching owner verification:', ownerError);
  }
  

  // Fetch similar properties in the same parish
  const { data: similarProps } = await supabase
    .from('properties')
    .select('*')
    .eq('status', 'available')
    .eq('parish', normalizeParish(data.parish))
    .neq('id', data.id)
    .limit(4);

  return {
    props: { 
      property: data,
      similarProperties: similarProps || [],
      isVerifiedAgent: ownerData?.agent_is_verified || false
    },
    revalidate: 60,
  };
}

export default function PropertyPage({ property, similarProperties, isVerifiedAgent }) {
  const { user } = useUser();
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Debug: Log verified status
  useEffect(() => {
 
  }, [property.owner_id, isVerifiedAgent]);

  // Aggressive scroll to top on any route or property change
  useEffect(() => {
    // Immediate scroll on component mount or property change
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [router.asPath, property.id]);

  // Force scroll to top on route change events
  useEffect(() => {
    const handleRouteChangeStart = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    const handleRouteChangeComplete = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    
    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [router.events]);

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
  const isLand = property.bedrooms == 0 && property.bathrooms == 0;
  const jsonLdProperty = isLand ? {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: `Land for Sale in ${property.parish}${property.town ? ` - ${property.town}` : ''}`,
    description: property.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.address || '',
      addressLocality: property.town || '',
      addressRegion: property.parish || '',
      addressCountry: 'JM'
    },
    priceRange: `${formatMoney(property.price)}`,
    priceCurrency: 'JMD',
    floorSize: property.square_feet ? {
      '@type': 'QuantitativeValue',
      value: property.square_feet,
      unitCode: 'FTK'
    } : undefined,
    image: allImages,
    url: `https://dosnine.com/property/${property.slug}`,
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: 'JMD',
      availability: 'https://schema.org/InStock',
      validFrom: property.created_at,
      priceValidUntil: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0]
    },
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/ViewAction',
      userInteractionCount: property.views || 0
    },
    geo: {
      '@type': 'GeoCoordinates',
      addressCountry: 'JM'
    },
    containedInPlace: {
      '@type': 'City',
      name: property.parish,
      containedInPlace: {
        '@type': 'Country',
        name: 'Jamaica'
      }
    },
    isPartOf: {
      '@type': 'WebSite',
      name: 'Dosnine Properties',
      url: 'https://dosnine.com',
      description: 'Jamaica\'s premier property marketplace'
    }
  } : {
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name: `${property.bedrooms} Bedroom ${property.type || 'Property'} for Rent in ${property.parish}`,
    description: property.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.address || '',
      addressLocality: property.town || '',
      addressRegion: property.parish || '',
      addressCountry: 'JM'
    },
    priceRange: `${formatMoney(property.price)}`,
    priceCurrency: 'JMD',
    numberOfBedrooms: property.bedrooms || null,
    numberOfBathrooms: property.bathrooms || null,
    floorSize: property.square_feet ? {
      '@type': 'QuantitativeValue',
      value: property.square_feet,
      unitCode: 'FTK'
    } : undefined,
    amenityFeature: property.amenities ? property.amenities.map(amenity => ({
      '@type': 'LocationFeatureSpecification',
      name: amenity
    })) : undefined,
    image: allImages,
    url: `https://dosnine.com/property/${property.slug}`,
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: 'JMD',
      availability: 'https://schema.org/InStock',
      validFrom: property.created_at,
      priceValidUntil: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0]
    },
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/ViewAction',
      userInteractionCount: property.views || 0
    },
    geo: {
      '@type': 'GeoCoordinates',
      addressCountry: 'JM'
    },
    containedInPlace: {
      '@type': 'City',
      name: property.parish,
      containedInPlace: {
        '@type': 'Country',
        name: 'Jamaica'
      }
    },
    isPartOf: {
      '@type': 'WebSite',
      name: 'Dosnine Properties',
      url: 'https://dosnine.com',
      description: 'Jamaica\'s premier property marketplace'
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
        name: `${property.parish} Properties`,
        item: `https://dosnine.com/search/houses-for-rent-${property.parish.toLowerCase().replace(/ /g, '-')}`
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: property.title,
        item: `https://dosnine.com/property/${property.slug}`
      }
    ]
  };

  const jsonLdFAQ = isLand ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How much is this land for sale in ${property.parish}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `This land in ${property.town ? property.town + ', ' : ''}${property.parish} is available for ${formatMoney(property.price)}. Contact the owner or agent directly via WhatsApp or phone for viewing arrangements.`
        }
      },
      {
        '@type': 'Question',
        name: `Where is this land located in ${property.parish}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `This land is located at ${property.address}, ${property.town ? property.town + ', ' : ''}${property.parish}, Jamaica.`
        }
      },
      {
        '@type': 'Question',
        name: 'What is the lot size?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: property.square_feet 
            ? `The lot size is approximately ${property.square_feet} square feet.`
            : 'Lot size information is not provided. Please contact the owner or agent for details.'
        }
      },
      {
        '@type': 'Question',
        name: 'How do I contact about this land?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can contact directly via WhatsApp or phone using the buttons on this page. Never pay a deposit without viewing the property first.'
        }
      }
    ]
  } : {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How much is this ${property.bedrooms} bedroom ${property.type || 'property'} for rent in ${property.parish}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `This ${property.bedrooms} bedroom ${property.type || 'property'} in ${property.town ? property.town + ', ' : ''}${property.parish} is available for ${formatMoney(property.price)} per month. Contact the landlord directly via WhatsApp for viewing arrangements.`
        }
      },
      {
        '@type': 'Question',
        name: `Where is this rental property located in ${property.parish}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `This property is located at ${property.address}, ${property.town ? property.town + ', ' : ''}${property.parish}, Jamaica.`
        }
      },
      {
        '@type': 'Question',
        name: `How many bedrooms and bathrooms does this ${property.parish} rental have?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `This rental property features ${property.bedrooms} ${property.bedrooms === 1 ? 'bedroom' : 'bedrooms'} and ${property.bathrooms} ${property.bathrooms === 1 ? 'bathroom' : 'bathrooms'}.`
        }
      },
      {
        '@type': 'Question',
        name: 'How do I contact the landlord about this property?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can contact the landlord directly via WhatsApp or phone. Click the WhatsApp button to send a message or call the phone number listed on the property page. Never pay a deposit without viewing the property first.'
        }
      },
      {
        '@type': 'Question',
        name: `When is this ${property.parish} rental property available?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: property.available_date 
            ? `This property is available from ${new Date(property.available_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. Contact the landlord to arrange a viewing.`
            : 'This property is available now. Contact the landlord directly to schedule a viewing and discuss move-in details.'
        }
      }
    ]
  };

  return (
    <>
      <Seo
        title={isLand 
          ? `Land For Sale in ${property.parish} ${property.town ? `- ${property.town}` : ''} | ${formatMoney(property.price)} | Dosnine Properties Jamaica`
          : `${property.bedrooms} Bedroom ${property.type === 'house' ? 'House' : 'Apartment'} for Rent in ${property.parish} ${property.town ? `- ${property.town}` : ''} | ${formatMoney(property.price)}/month | Dosnine Properties Jamaica`
        }
        description={isLand 
          ? `${property.town ? property.town + ', ' : ''}${property.parish} land for sale. ${property.description?.substring(0, 120)}... Contact owner directly.`
          : `${property.bedrooms} bedroom ${property.type || 'property'} for rent in ${property.town ? property.town + ', ' : ''}${property.parish}, Jamaica. ${property.description?.substring(0, 120)}... Contact landlord directly. Available now.`
        }
        image={currentImage}
        url={`https://dosnine.com/property/${property.slug}`}
        structuredData={[jsonLdProperty, jsonLdBreadcrumb, jsonLdFAQ]}
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
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold">{property.title}</h1>
                {isVerifiedAgent && (
                  <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold flex-shrink-0">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </div>
                )}
              </div>
              <p className="text-lg text-gray-600 mb-4">{property.town}, {property.parish}</p>

              <div className="flex items-center gap-6 mb-6 pb-6 border-b">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatMoney(property.price, '$')}</div>
                  <div className="text-sm text-gray-600">{property.type === 'rent' ? '/ month' : null}</div>
                </div>
                {property.bedrooms === 0 && property.bathrooms === 0 ? (
                  <div className="text-center">
                    <div className="text-2xl font-bold"> Land</div>
                  </div>
                ) : (
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
                )}
              </div>

              <h2 className="text-2xl font-bold mb-4">About this property</h2>
              <p className="text-gray-700 mb-4">{property.description}</p>

              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Address:</strong> {property.address}
                </p>
                {property.available_date && (
                  <p className="text-sm text-gray-700 mt-2">
                    <strong>Available from:</strong> {property.available_date}
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
              
              <h3 className="text-xl font-bold mb-4">{isVerifiedAgent ? 'Contact Agent' : 'Contact Landlord'}</h3>
              
              {isVerifiedAgent && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified Agent
                    </div>
                    <p className="text-xs text-gray-600 mt-1">This property is listed by a verified real estate agent</p>
                  </div>

                  <button
                    onClick={() => setShowRequestForm(true)}
                    className="w-full btn-primary mb-4 flex items-center justify-center gap-2 text-lg py-3"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    I Want This Property
                  </button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or contact directly</span>
                    </div>
                  </div>
                </>
              )}
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={`https://wa.me/${property.phone_number}?text=Hi, I'm interested in ${encodeURIComponent(property.title)} at ${encodeURIComponent(property.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold"
                    title="Contact via WhatsApp"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </a>

                  <a
                    href={`tel:${property.phone_number}`}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
                    title={isVerifiedAgent ? 'Call Agent' : 'Call Landlord'}
                  >
                    <Phone className="w-6 h-6" />
                  </a>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500">👁️ Views: <span className="font-semibold text-gray-700">{property.views || 0}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location-specific SEO content */}
        <div className="mt-12 bg-gray-50 rounded-xl p-6">
          {property.bedrooms === 0 && property.bathrooms === 0 ? (
            <>
              <h2 className="text-2xl font-bold mb-4">About Land For Sale in {property.parish}, Jamaica</h2>
              <div className="prose max-w-none text-gray-700">
                <p className="mb-3">
                  Interested in <strong>land for sale in {property.parish}, Jamaica</strong>? 
                  This property in {property.town || property.parish} is available at <strong>{formatMoney(property.price)}</strong>. 
                  It's an excellent opportunity to invest in real estate in one of Jamaica's desirable locations.
                </p>
                <p className="mb-3">
                  {property.parish} is a popular area for land investments in Jamaica, offering various development opportunities. 
                  Whether you're searching for <strong>residential land in {property.parish}</strong>, 
                  commercial properties, or investment opportunities, Dosnine Properties connects you directly with property owners and developers.
                </p>
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Popular Searches in {property.parish}:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><Link href={`/search/land-for-sale-${property.parish.toLowerCase().replace(/ /g, '-')}`} className="text-accent hover:underline">Land for sale in {property.parish}</Link></li>
                    <li><Link href={`/search/residential-land-${property.parish.toLowerCase().replace(/ /g, '-')}`} className="text-accent hover:underline">Residential land in {property.parish}</Link></li>
                    <li><Link href={`/search/commercial-land-${property.parish.toLowerCase().replace(/ /g, '-')}`} className="text-accent hover:underline">Commercial land in {property.parish}</Link></li>
                    <li><Link href={`/search/property-investment-${property.parish.toLowerCase().replace(/ /g, '-')}`} className="text-accent hover:underline">Property investment in {property.parish}</Link></li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-4">About Renting in {property.parish}, Jamaica</h2>
              <div className="prose max-w-none text-gray-700">
                <p className="mb-3">
                  Looking for a <strong>{property.bedrooms} bedroom {property.type || 'property'} for rent in {property.parish}</strong>? 
                  This property in {property.town || property.parish} offers great value at <strong>{formatMoney(property.price)} per month</strong>.
                </p>
                <p className="mb-3">
                  {property.parish} is a popular area for rentals in Jamaica, with properties ranging from apartments to houses. 
                  Whether you're searching for <strong>houses for rent in {property.parish} Jamaica</strong> or apartments, 
                  Dosnine Properties connects you directly with landlords for the best rental deals.
                </p>
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Popular Searches in {property.parish}:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><Link href={`/search/1-bedroom-apartment-${property.parish.toLowerCase().replace(/ /g, '-')}`} className="text-accent hover:underline">1 Bedroom for rent in {property.parish}</Link></li>
                    <li><Link href={`/search/2-bedroom-house-${property.parish.toLowerCase().replace(/ /g, '-')}`} className="text-accent hover:underline">2 Bedroom House for rent in {property.parish}</Link></li>
                    <li><Link href={`/search/3-bedroom-house-${property.parish.toLowerCase().replace(/ /g, '-')}`} className="text-accent hover:underline">3 Bedroom House for rent in {property.parish}</Link></li>
                    <li><Link href={`/search/apartments-for-rent-${property.parish.toLowerCase().replace(/ /g, '-')}`} className="text-accent hover:underline">Apartments for rent in {property.parish}</Link></li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
        <AdList/>

        {/* Similar Properties Section */}
        {similarProperties && similarProperties.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">
              {property.bedrooms === 0 && property.bathrooms === 0 
                ? `More Land for Sale in ${property.parish}` 
                : `More ${property.bedrooms} Bedroom Properties for Rent in ${property.parish}`}
            </h2>
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
                        {prop.bedrooms === 0 && prop.bathrooms === 0 ? (
                          <span>Land</span>
                        ) : (
                          <>
                            <span>{prop.bedrooms} bed</span>
                            <span>{prop.bathrooms} bath</span>
                          </>
                        )}
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

      {/* Property Agent Request Modal */}
      <PropertyAgentRequest 
        property={property}
        agentId={property.owner_id}
        isOpen={showRequestForm}
        onClose={() => setShowRequestForm(false)}
      />
    </>
  );
}