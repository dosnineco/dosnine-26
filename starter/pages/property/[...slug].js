import Head from 'next/head';
import Link from 'next/link';
import Seo from '../../components/Seo';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { useUser } from '@clerk/nextjs';
import {
  Phone,
  MapPin,
  Share2,
  X,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  MessageCircle,
  Eye,
  Bed,
  Bath,
  Star,
  ImageOff,
  Home,
  Building2,
  TrendingUp,
  Trees,
  ArrowUpRight,
  Search,
} from 'lucide-react';
import { formatPropertyMoney } from '../../lib/formatMoney';
import { normalizeParish } from '../../lib/normalizeParish';
import PropertyAgentRequest from '../../components/PropertyAgentRequest';
import InFeedAd from '../../components/InFeedAd';
import PropertyPopupAd from '../../components/PropertyPopupAd';

export async function getServerSideProps(context) {
  const slugParam = context.params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam.join('/') : slugParam;
  const host = context.req.headers.host || 'localhost:3000';
  const forwardedProto = String(context.req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const isLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(host);
  const proto = isLocalHost ? 'http' : (forwardedProto || 'https');
  const baseUrl = `${proto}://${host}`;

  let response;
  let payload = {};

  try {
    response = await fetch(`${baseUrl}/api/properties/detail?slug=${encodeURIComponent(slug)}`);
    payload = await response.json().catch(() => ({}));
  } catch (error) {
    return { notFound: true };
  }

  if (response.status === 410) {
    context.res.statusCode = 410;
    return {
      props: {
        property: payload.property || { slug },
        similarProperties: payload.similarProperties || [],
        isVerifiedAgent: false,
        archived: true,
      },
    };
  }

  if (!response.ok || !payload?.success || !payload?.property) {
    return { notFound: true };
  }

  return {
    props: {
      property: payload.property,
      similarProperties: payload.similarProperties || [],
      isVerifiedAgent: payload.isVerifiedAgent || false,
      owner: payload.owner || null,
    },
  };
}

export default function PropertyPage({ property, similarProperties, isVerifiedAgent, archived, owner }) {
  const { user } = useUser();
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(null);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const imageUrls = property.image_urls || [];
  const propertyImages = property.property_images || [];
  const allImages = imageUrls.length > 0 ? imageUrls : propertyImages.map(img => img.image_url);
  const currentImage = allImages[currentImageIndex] || '/placeholder.png';
  const fullscreenImage = fullscreenIndex !== null ? allImages[fullscreenIndex] : null;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (fullscreenIndex === null) return;

      if (e.key === 'Escape') {
        setFullscreenIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setFullscreenIndex((i) => (i === 0 ? allImages.length - 1 : i - 1));
      } else if (e.key === 'ArrowRight') {
        setFullscreenIndex((i) => (i === allImages.length - 1 ? 0 : i + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenIndex, allImages.length]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [router.asPath, property.id]);

  useEffect(() => {
    const checkOwner = async () => {
      if (!user) return;
      const response = await fetch('/api/user/profile');
      const payload = await response.json();
      if (response.ok && payload?.id === property.owner_id) {
        setIsOwner(true);
      }
    };
    checkOwner();
  }, [user, property.owner_id]);

  const handlePrevImage = () => {
    setCurrentImageIndex((i) => (i === 0 ? allImages.length - 1 : i - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((i) => (i === allImages.length - 1 ? 0 : i + 1));
  };

  const handleTouchStart = (event) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return;
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return;

    if (!event.changedTouches || !event.changedTouches[0]) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        handleNextImage();
      } else {
        handlePrevImage();
      }
    }

    touchStartRef.current = { x: 0, y: 0 };
  };

  const handleShare = async () => {
    const shareUrl = `https://dosnine.com/property/${property.slug}`;
    const shareData = { title: property.title, text: `Check out this property: ${property.title}`, url: shareUrl };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard');
      }
    } catch (error) {
      // user cancelled share or clipboard unavailable
    }
  };

  const handleBack = () => {
    const previousUrl = document.referrer;
    const previousPath = previousUrl ? new URL(previousUrl, window.location.origin).pathname : '';
    const cameFromBrowse = previousPath === '/listing' || previousPath.startsWith('/search/');

    if (cameFromBrowse && window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/listing');
  };

  const formatPhone = (raw) => {
    if (!raw) return '';
    const hasPlus = raw.trim().startsWith('+');
    const cleaned = raw.replace(/[^0-9]/g, '');
    if (!cleaned) return raw;

    let cc = '';
    let rest = cleaned;
    if (hasPlus) {
      const match = cleaned.match(/^([0-9]{1,3})([0-9]*)$/);
      if (match) {
        cc = `+${match[1]} `;
        rest = match[2] || '';
      }
    }

    const groups = rest.match(/.{1,3}/g) || [];
    return cc + groups.join(' ');
  };

  const isLand = property.bedrooms == 0 && property.bathrooms == 0;

  /* ----------------------------------------------------------
   * Contextual search suggestions
   * ---------------------------------------------------------- */
  const searchSuggestions = useMemo(() => {
    const parishSlug = String(property.parish || '')
      .toLowerCase()
      .replace(/\s+/g, '-');
    const parishLabel = property.parish || 'Jamaica';
    const isLandProperty = property.bedrooms === 0 && property.bathrooms === 0;

    if (isLandProperty) {
      return [
        {
          icon: Trees,
          label: 'Land for sale',
          hint: `in ${parishLabel}`,
          href: `/search/land-for-sale-${parishSlug}`,
          tone: 'emerald',
          tag: 'Land',
        },
        {
          icon: Home,
          label: 'Residential land',
          hint: `in ${parishLabel}`,
          href: `/search/residential-land-${parishSlug}`,
          tone: 'blue',
          tag: 'Land',
        },
        {
          icon: Building2,
          label: 'Commercial land',
          hint: `in ${parishLabel}`,
          href: `/search/commercial-land-${parishSlug}`,
          tone: 'violet',
          tag: 'Land',
        },
        {
          icon: TrendingUp,
          label: 'Property investment',
          hint: `in ${parishLabel}`,
          href: `/search/property-investment-${parishSlug}`,
          tone: 'accent',
          tag: 'Invest',
        },
      ];
    }

    const currentBeds = Number(property.bedrooms) || 0;
    const otherBeds = [1, 2, 3, 4].filter((b) => b !== currentBeds).slice(0, 2);

    const items = otherBeds.map((b, i) => ({
      icon: Bed,
      label: `${b} Bedroom rentals`,
      hint: `in ${parishLabel}`,
      href: `/search/${b}-bedroom-house-${parishSlug}`,
      tone: i === 0 ? 'blue' : 'emerald',
      tag: `${b} Bed`,
    }));

    items.push(
      {
        icon: Home,
        label: 'Houses for rent',
        hint: `in ${parishLabel}`,
        href: `/search/houses-for-rent-${parishSlug}`,
        tone: 'accent',
        tag: 'House',
      },
      {
        icon: Building2,
        label: 'Apartments for rent',
        hint: `in ${parishLabel}`,
        href: `/search/apartments-for-rent-${parishSlug}`,
        tone: 'violet',
        tag: 'Apt',
      }
    );

    return items;
  }, [property.parish, property.bedrooms, property.bathrooms]);

  const parishSlugForLinks = String(property.parish || '')
    .toLowerCase()
    .replace(/\s+/g, '-');

  const viewAllHref = isLand
    ? `/search/land-for-sale-${parishSlugForLinks}`
    : `/search/houses-for-rent-${parishSlugForLinks}`;

  /* ----------------------------------------------------------
   * JSON-LD
   * ---------------------------------------------------------- */
  const status = String(property.status || '').toLowerCase().trim();
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
    priceRange: `${formatPropertyMoney(property.price, property.currency)}`,
    priceCurrency: String(property.currency || 'JMD').toUpperCase(),
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
      priceCurrency: String(property.currency || 'JMD').toUpperCase(),
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
      name: 'Dosnine Limited',
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
    priceRange: `${formatPropertyMoney(property.price, property.currency)}`,
    priceCurrency: String(property.currency || 'JMD').toUpperCase(),
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
      priceCurrency: String(property.currency || 'JMD').toUpperCase(),
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
      name: 'Dosnine Limited',
      url: 'https://dosnine.com',
      description: 'Jamaica\'s premier property marketplace'
    }
  };

  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://dosnine.com' },
      { '@type': 'ListItem', position: 2, name: 'Properties', item: 'https://dosnine.com/' },
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
          text: `This land in ${property.town ? property.town + ', ' : ''}${property.parish} is listed at ${formatPropertyMoney(property.price, property.currency)}. Contact the owner or agent directly via WhatsApp or phone for viewing arrangements.`
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
          text: `This ${property.bedrooms} bedroom ${property.type || 'property'} in ${property.town ? property.town + ', ' : ''}${property.parish} is listed at ${formatPropertyMoney(property.price, property.currency)} per month. Contact the landlord directly via WhatsApp for viewing arrangements.`
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
        name: `How can I arrange a viewing for this ${property.parish} rental property?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Contact the landlord directly to schedule a viewing and discuss move-in details.'
        }
      }
    ]
  };

  if (archived) {
    return (
      <>
        <Seo title={`${property.title || 'Property'} — Removed | Dosnine Limited`} description="This property listing has been removed." />
        <div className="max-w-3xl mx-auto py-16 px-4 text-center">
          <h1 className="text-2xl font-semibold mb-4">This property listing has been removed</h1>
          <p className="mb-6">The listing you requested has been removed or expired. Browse similar properties below or explore search pages for the area.</p>

          {similarProperties && similarProperties.length > 0 && (
            <div className="space-y-4">
              {similarProperties.map((p) => (
                <a key={p.id} href={`/property/${p.slug}`} className="block text-left">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-medium">{p.title || `${p.bedrooms || ''} ${p.type || ''}`}</div>
                    <div className="text-sm text-gray-600">{p.parish} — {p.town}</div>
                    <div className="text-sm text-accent">{p.price ? formatPropertyMoney(p.price, p.currency) : ''}</div>
                  </div>
                </a>
              ))}
            </div>
          )}

          <div className="mt-8">
            <a href="/search/houses-for-rent" className="text-accent mr-4">Browse houses for rent</a>
            <a href="/search/apartments-for-rent" className="text-accent">Browse apartments for rent</a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo
        title={isLand
          ? `Land For Sale in ${property.parish} ${property.town ? `- ${property.town}` : ''} | ${formatPropertyMoney(property.price, property.currency)} | Dosnine Limited Jamaica`
          : `${property.bedrooms} Bedroom ${property.type === 'house' ? 'House' : 'Apartment'} for Rent in ${property.parish} ${property.town ? `- ${property.town}` : ''} | ${formatPropertyMoney(property.price, property.currency)}/month | Dosnine Limited Jamaica`
        }
        description={isLand
          ? `${property.town ? property.town + ', ' : ''}${property.parish} land for sale. ${property.description?.substring(0, 120)}... Contact owner directly.`
          : `${property.bedrooms} bedroom ${property.type || 'property'} for rent in ${property.town ? property.town + ', ' : ''}${property.parish}, Jamaica. ${property.description?.substring(0, 120)}... Contact landlord directly.`
        }
        image={currentImage}
        url={`https://dosnine.com/property/${property.slug}`}
        structuredData={[jsonLdProperty, jsonLdBreadcrumb, jsonLdFAQ]}
      />

      <div className="property-page container mx-auto px-4 py-8 text-slate-700">
        {/* Breadcrumb Navigation */}
        <div className="mb-4">
          <button type="button" onClick={handleBack} className="btn-outline btn-sm inline-flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Back to Browse
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Images Section */}
          <div className="lg:col-span-2">
            <div className="flex justify-end mb-3">
              <button
                onClick={handleShare}
                className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-slate-700 px-3 py-1 rounded-full text-sm font-semibold transition"
                title="Share this property"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
            <div
              className="relative bg-gray-200 rounded-xl overflow-hidden mb-4"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={currentImage}
                alt={property.title}
                className="w-full h-96 object-cover cursor-pointer hover:opacity-90 transition"
                onClick={() => setFullscreenIndex(currentImageIndex)}
              />

              {allImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {allImages.length}
                  </div>
                </>
              )}
            </div>

            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2 mb-6">
                {allImages.map((imgUrl, i) => (
                  <button
                    key={i}
                    onClick={() => setFullscreenIndex(i)}
                    className={`h-20 rounded-lg overflow-hidden border-2 transition cursor-pointer ${i === currentImageIndex ? 'border-blue-500' : 'border-gray-300 hover:border-gray-400'}`}
                  >
                    <img src={imgUrl} alt={`${property.title} ${i + 1}`} className="w-full h-full object-cover hover:opacity-80 transition" />
                  </button>
                ))}
              </div>
            )}

            <div className="bg-yellow-50 border-l-4 font-medium border-yellow-600 p-2 m-2">
              <p className="text-gray-700 mb-2">
                <strong>Important:</strong> Never pay a deposit in order to view or &quot;hold&quot; a property
              </p>
            </div>

            <div className="p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-3">
                <div>
                  <h1 className="text-3xl font-bold">{property.title}</h1>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isVerifiedAgent && (
                    <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                      <BadgeCheck className="w-4 h-4" />
                      Verified
                    </div>
                  )}
                </div>
              </div>
              <p className="flex items-center gap-2 text-base text-slate-500 mb-4">
                <MapPin className="h-4 w-4 text-accent" />
                {property.town}, {property.parish}
              </p>

              <div className="flex items-center gap-6 mb-6 pb-6 border-b">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatPropertyMoney(property.price, property.currency)}
                  </div>
                  <div className="text-sm text-gray-600">{property.type === 'rent' ? '/ month' : null}</div>
                </div>
                {property.bedrooms === 0 && property.bathrooms === 0 ? (
                  <div className="text-center">
                    <div className="text-2xl font-bold"> Land</div>
                  </div>
                ) : (
                  <div className="flex gap-8">
                    <div className="text-center">
                      <div className="text-2xl font-bold flex items-center gap-2">
                        <Bed className="w-6 h-6" /> {property.bedrooms}
                      </div>
                      <div className="text-sm text-gray-600">Bedrooms</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold flex items-center gap-2">
                        <Bath className="w-6 h-6" /> {property.bathrooms}
                      </div>
                      <div className="text-sm text-gray-600">Bathrooms</div>
                    </div>
                  </div>
                )}
              </div>

              <h2 className="text-2xl font-bold mb-4">About this property</h2>
              <p className="text-gray-700 mb-4">{property.description}</p>

              <div className="bg-slate-50 p-4 rounded-xl mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Verified address:</strong>{' '}
                  {property.formatted_address || property.address || `${property.town}, ${property.parish}`}
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-white rounded-xl p-6 relative top-4">
              <h3 className="text-xl font-bold mb-4">
                {isVerifiedAgent ? 'Contact Agent' : 'Contact Landlord'}
              </h3>

              <div className="mb-5 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Posted by</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {owner?.businessName || owner?.name || 'Property owner'}
                </p>
                {owner?.businessName && <p className="text-sm text-slate-500">{owner.name}</p>}
                {isVerifiedAgent && (
                  <p className="mt-2 text-xs font-semibold text-blue-700">Verified real estate agent</p>
                )}
              </div>

              <button
                onClick={() => setShowRequestForm(true)}
                className="w-full btn-primary mb-4 flex items-center justify-center gap-2 text-lg py-3"
              >
                <MessageCircle className="w-5 h-5" />
                {isVerifiedAgent ? 'I Want This Property' : 'Request Property Information'}
              </button>

              <button
                onClick={handleShare}
                className="w-full btn-outline mb-4 flex items-center justify-center gap-2 py-3"
              >
                <Share2 className="w-5 h-5" /> Share this property
              </button>

              {isVerifiedAgent && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                    <BadgeCheck className="w-5 h-5" />
                    Verified Agent
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    This property is listed by a verified real estate agent
                  </p>
                </div>
              )}

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or contact directly</span>
                </div>
              </div>

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
                  <p className="flex items-center gap-1 text-sm text-gray-500">
                    <Eye className="w-4 h-4" /> Views:{' '}
                    <span className="font-semibold text-gray-700">{property.views || 0}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <InFeedAd />

        {/* ============================================================
            Popular searches — Instagram-style tiles that mirror the
            PropertyCard layout so they blend with the "More …"
            section below
           ============================================================ */}
        <section className="mt-12">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                {isLand ? 'Land in' : 'Renting in'} {property.parish}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                Popular searches in {property.parish}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                {isLand
                  ? `Explore land investment opportunities across ${property.parish}. Browse by property type, size, and nearby areas.`
                  : `Looking for a ${property.bedrooms} bedroom ${
                      property.type || 'property'
                    } for rent in ${property.parish}? Explore similar listings, other bedroom counts, and nearby areas.`}
              </p>
            </div>

            <Link
              href={viewAllHref}
              className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:text-accent/80 sm:inline-flex"
            >
              View all
              <ArrowUpRight size={12} />
            </Link>
          </div>

          {/* Same grid rhythm as the "More …" section below */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
            {searchSuggestions.map((s) => (
              <SearchSuggestionCard key={s.href} {...s} />
            ))}
          </div>

          <Link
            href={viewAllHref}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:hidden"
          >
            View all in {property.parish}
            <ArrowUpRight size={13} />
          </Link>
        </section>

        {/* Similar Properties Section */}
        {similarProperties && similarProperties.length > 0 && (
          <div className="mt-12">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {isLand
                  ? `More Land for Sale in ${property.parish}`
                  : `More ${property.bedrooms} Bedroom Properties for Rent in ${property.parish}`}
              </h2>

              <Link
                href={viewAllHref}
                className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:text-accent/80 sm:inline-flex"
              >
                View all
                <ArrowUpRight size={12} />
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
              {similarProperties.map((prop, index) => (
                <SimilarPropertyCard key={prop.id} property={prop} index={index} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 flex flex-col items-start gap-6">
          <PropertyPopupAd propertyId={property.id} />

          <a
            href={viewAllHref}
            className="btn-outline btn-sm inline-flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Browse more properties in {property.parish}
          </a>
        </div>
      </div>

      <PropertyAgentRequest
        property={property}
        agentId={property.owner_id}
        isOpen={showRequestForm}
        onClose={() => setShowRequestForm(false)}
      />

      {fullscreenIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center"
          onClick={() => setFullscreenIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            onClick={() => setFullscreenIndex(null)}
            className="absolute top-4 right-4 z-10 text-white hover:bg-white/20 p-2 rounded-lg transition"
            title="Close (Esc)"
          >
            <X className="w-8 h-8" />
          </button>

          <div
            className="flex items-center justify-center h-full w-full relative px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fullscreenImage}
              alt="Fullscreen"
              className="max-h-[90vh] max-w-full object-contain"
            />

            {allImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenIndex((i) => (i === 0 ? allImages.length - 1 : i - 1));
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 p-3 rounded-full transition"
                  title="Previous (←)"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenIndex((i) => (i === allImages.length - 1 ? 0 : i + 1));
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 p-3 rounded-full transition"
                  title="Next (→)"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                  {fullscreenIndex + 1} / {allImages.length}
                </div>
              </>
            )}
          </div>

          <div className="absolute bottom-4 left-4 text-white/70 text-sm">
            {allImages.length > 1 && <p>← → Arrow keys or buttons to navigate</p>}
            <p>Esc or click outside to close</p>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
 * SearchSuggestionCard — matches PropertyCard's DNA so the
 * suggestion grid flows into the "More …" grid below it.
 * ============================================================ */
const SUGGESTION_TONES = {
  accent: {
    cover: 'bg-gray-900',
    icon: 'text-white',
    tagBg: 'bg-white/95 text-accent',
  },
  blue: {
    cover: 'bg-gray-900',
    icon: 'text-white',
    tagBg: 'bg-white/95 text-blue-700',
  },
  emerald: {
    cover: 'bg-gray-900',
    icon: 'text-white',
    tagBg: 'bg-white/95 text-emerald-700',
  },
  violet: {
    cover: 'bg-gray-900',
    icon: 'text-white',
    tagBg: 'bg-white/95 text-violet-700',
  },
  amber: {
    cover: 'bg-gray-900',
    icon: 'text-white',
    tagBg: 'bg-white/95 text-amber-700',
  },
};

function SearchSuggestionCard({ icon: Icon, label, hint, href, tone = 'accent', tag }) {
  const style = SUGGESTION_TONES[tone] || SUGGESTION_TONES.accent;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-200 hover:-translate-y-1 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      {/* COVER — mirrors PropertyCard image area */}
      <div className={`relative flex h-40 w-full shrink-0 items-center justify-center overflow-hidden sm:h-44 ${style.cover}`}>
        {/* Dot pattern overlay for texture */}
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '14px 14px',
          }}
          aria-hidden="true"
        />

        <Icon size={34} className={`relative z-10 ${style.icon}`} strokeWidth={1.6} />

        {/* Top-right tag — matches PropertyCard's listing badge */}
        {tag && (
          <span
            className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur ${style.tagBg}`}
          >
            {tag}
          </span>
        )}
      </div>

      {/* BODY — mirrors PropertyCard's body rhythm */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">
          {label}
        </h3>

        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{hint}</span>
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">
          <span className="inline-flex items-center gap-1 transition group-hover:text-accent">
            Explore
            <ArrowUpRight
              size={12}
              className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ============================================================
 * SimilarPropertyCard — lightweight inline version so the
 * "More …" grid uses the SAME DNA as SearchSuggestionCard
 * ============================================================ */
function SimilarPropertyCard({ property, index = 0 }) {
  const img =
    property.image_urls?.[0] ||
    property.property_images?.[0]?.image_url ||
    '/placeholder.png';

  const listingType = String(
    property.listing_type || property.listingType || property.type || ''
  )
    .toLowerCase()
    .trim();
  const isRental = ['rent', 'rental', 'for rent', 'for_rent'].includes(listingType);
  const isLandProperty =
    Number(property.bedrooms) === 0 && Number(property.bathrooms) === 0;

  const listingBadge = isLandProperty ? 'Land' : isRental ? 'For Rent' : 'For Sale';
  const locationText = [property.town, property.parish].filter(Boolean).join(', ');

  return (
    <Link
      href={`/property/${property.slug || property.id}`}
      data-list-index={index}
      aria-label={property.title || 'View property'}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-200 hover:-translate-y-1 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      <div className="relative h-40 w-full shrink-0 overflow-hidden bg-slate-100 sm:h-44">
        <img
          src={img}
          alt={property.title || 'Property'}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/placeholder.png';
          }}
        />

        {property.is_featured && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 backdrop-blur">
            <Star size={10} className="fill-amber-500 text-amber-500" />
            Featured
          </span>
        )}

        <span className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
          {listingBadge}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-lg font-bold leading-none tracking-tight text-slate-900">
          {formatPropertyMoney(property.price, property.currency)}
          {isRental && <span className="ml-1 text-sm font-medium text-slate-500">/mo</span>}
        </p>

        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
          {property.title || 'Untitled property'}
        </h3>

        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{locationText || 'Location not set'}</span>
        </p>

        <div className="mt-auto flex items-center gap-3 border-t border-slate-100 pt-3 text-xs font-medium text-slate-600">
          {isLandProperty ? (
            <span className="inline-flex items-center gap-1.5">Land</span>
          ) : (
            <>
              {property.bedrooms != null && (
                <span className="inline-flex items-center gap-1">
                  <Bed size={13} className="text-slate-400" />
                  {property.bedrooms} bd
                </span>
              )}
              {property.bathrooms != null && (
                <span className="inline-flex items-center gap-1">
                  <Bath size={13} className="text-slate-400" />
                  {property.bathrooms} ba
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}