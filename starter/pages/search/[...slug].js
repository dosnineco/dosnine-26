import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
// formatMoney not used here
import PropertyCard from '../../components/PropertyCard';
import { useUser } from '@clerk/nextjs';
import { PARISHES, normalizeParish } from '../../lib/normalizeParish';

export default function SearchLandingPage({ slug, properties: initialProperties, totalCount, pageTitle, pageDescription, pageKeywords }) {
  const { user } = useUser();
  const [properties, setProperties] = useState(initialProperties || []);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [userOwnerId, setUserOwnerId] = useState(null);

  useEffect(() => {
    const getUserId = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user.id)
        .single();
      if (data) setUserOwnerId(data.id);
    };
    getUserId();
  }, [user]);

  // Parse slug to extract filters
  const parseSlug = (slugArray) => {
    const slugStr = (slugArray || []).join('-').toLowerCase();
    const filters = { parish: '', bedrooms: '', type: '' };

    // Extract parish (case-insensitive match against known parishes)
    PARISHES.forEach(p => {
      if (slugStr.includes(p.toLowerCase().replace(/ /g, '-'))) {
        filters.parish = normalizeParish(p);
      }
    });

    // Extract bedrooms
    const bedroomMatch = slugStr.match(/(\d+)-bedroom/);
    if (bedroomMatch) filters.bedrooms = bedroomMatch[1];

    // Extract type
    if (slugStr.includes('apartment') || slugStr.includes('apt')) filters.type = 'apartment';
    if (slugStr.includes('house')) filters.type = 'house';
    if (slugStr.includes('condo') || slugStr.includes('townhouse')) filters.type = 'condo';

    return filters;
  };

  const filters = parseSlug(slug);

  // Generate human-readable title from slug
  const generateTitle = () => {
    const parts = (slug || []).map(s => {
      const normalized = s.replace(/-/g, ' ');
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    });
    return parts.join(' ');
  };

  const saveListState = (index) => {
    try {
      const state = { page, scrollY: window.scrollY, index };
      sessionStorage.setItem('dosnine_list_state', JSON.stringify(state));
    } catch (err) {
      console.error('Failed to save list state', err);
    }
  };

  const PROPERTIES_PER_PAGE = 20;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / PROPERTIES_PER_PAGE) : 1;

  return (
    <div>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={pageKeywords} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <link rel="canonical" href={`https://dosnine.com/search/${(slug || []).join('/')}`} />

        {/* Schema.org Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SearchResultsPage',
              name: pageTitle,
              description: pageDescription,
              url: `https://dosnine.com/search/${(slug || []).join('/')}`,
              mainEntity: {
                '@type': 'ItemList',
                numberOfItems: totalCount,
                itemListElement: (initialProperties || []).slice(0, 10).map((prop, index) => ({
                  '@type': 'ListItem',
                  position: index + 1,
                  item: {
                    '@type': 'Residence',
                    name: `${prop.bedrooms} Bedroom ${prop.type || 'Property'} for Rent in ${prop.parish}`,
                    url: `https://dosnine.com/property/${prop.slug}`,
                    image: prop.image_urls?.[0] || '',
                    offers: {
                      '@type': 'Offer',
                      price: prop.price,
                      priceCurrency: 'JMD'
                    },
                    address: {
                      '@type': 'PostalAddress',
                      addressLocality: prop.town || '',
                      addressRegion: prop.parish || '',
                      addressCountry: 'JM'
                    }
                  }
                }))
              },
              isPartOf: {
                '@type': 'WebSite',
                name: 'Dosnine Properties',
                description: 'Jamaica\'s premier property rental marketplace - Houses and Apartments for Rent',
                url: 'https://dosnine.com',
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: `How many ${filters.bedrooms ? filters.bedrooms + ' bedroom ' : ''}properties are available in ${filters.parish || 'this area'}?`,
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: `We currently have ${totalCount} ${filters.bedrooms ? filters.bedrooms + ' bedroom ' : ''}properties for rent in ${filters.parish || 'this area'}. New listings are added daily, so check back often for the latest rentals.`
                  }
                },
                {
                  '@type': 'Question',
                  name: 'Can I contact the landlord directly?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes! Every property listing on Dosnine includes direct contact information for the landlord or property owner. You can reach out via WhatsApp or phone call. There are no agent fees or commissions.'
                  }
                },
                {
                  '@type': 'Question',
                  name: `What is the average rent for properties in ${filters.parish || 'Jamaica'}?`,
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: `Rental prices in ${filters.parish || 'Jamaica'} vary based on size, location, and amenities. Browse our listings to see current market rates for ${filters.bedrooms ? filters.bedrooms + ' bedroom ' : ''}properties. Prices are shown in Jamaican dollars per month.`
                  }
                }
              ]
            }),
          }}
        />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="text-accent hover:underline text-sm">← Back to Browse All</Link>
        </div>

        <h1 className="text-4xl font-bold mb-2 text-gray-900">{generateTitle()}</h1>
        <p className="text-lg text-gray-600 mb-4">{pageDescription}</p>
        
        {/* SEO-rich location content */}
        {properties.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-3 text-gray-900">
              {filters.parish && filters.bedrooms 
                ? `${filters.bedrooms} Bedroom ${filters.type ? filters.type.charAt(0).toUpperCase() + filters.type.slice(1) + 's' : 'Properties'} Available in ${filters.parish}`
                : `Rental Properties in ${filters.parish || 'Jamaica'}`
              }
            </h2>
            <p className="text-gray-700 text-sm leading-relaxed">
              {filters.parish === 'St Catherine' && (
                <>
                  Looking for <strong>houses for rent in St Catherine Jamaica</strong>? 
                  Browse our listings in Spanish Town, Portmore, and surrounding areas. 
                  Find <strong>1 bedroom, 2 bedroom, and 3 bedroom houses for rent in St Catherine</strong> with direct landlord contact. 
                  No agent fees - connect directly with property owners.
                </>
              )}
              {filters.parish && filters.parish !== 'St Catherine' && (
                <>
                  Browse <strong>houses and apartments for rent in {filters.parish}, Jamaica</strong>. 
                  Our listings include {filters.bedrooms ? `${filters.bedrooms} bedroom ` : ''}properties 
                  with verified landlord contact information. Connect directly with property owners for the best rental deals in {filters.parish}.
                </>
              )}
              {!filters.parish && (
                <>
                  Discover rental properties across Jamaica including St Catherine, Kingston, St James, and more. 
                  Browse <strong>houses and apartments for rent</strong> with direct landlord contact - no agent fees or commissions.
                </>
              )}
            </p>
          </div>
        )}

        {properties.length === 0 ? (
          <div className="text-center py-12 bg-blue-50 rounded-lg border border-blue-200 p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Properties Found</h2>
            <p className="text-gray-600 mb-6">We don't currently have listings matching "{generateTitle()}". Check back soon!</p>
            <Link href="/" className="btn-primary">
              Browse All Properties
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-6">Found {totalCount} properties matching your search</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {properties.map((prop, idx) => {
                const isOwner = userOwnerId && prop.owner_id === userOwnerId;
                return (
                  <div key={prop.id} onClick={() => saveListState(idx)}>
                    <PropertyCard property={prop} isOwner={isOwner} index={idx} />
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <nav className="flex justify-center items-center gap-2 mb-8">
                <Link href={`/search/${(slug || []).join('/')}?page=${Math.max(1, page - 1)}`} className="btn-primary btn-sm">
                  ← Prev
                </Link>

                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  const pageNum = page > 3 ? page + i - 2 : i + 1;
                  if (pageNum > totalPages) return null;
                  return (
                    <Link
                      key={pageNum}
                      href={`/search/${(slug || []).join('/')}?page=${pageNum}`}
                      className={`btn-sm ${page === pageNum ? 'btn-primary' : 'btn-outline'}`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}

                <Link href={`/search/${(slug || []).join('/')}?page=${Math.min(totalPages, page + 1)}`} className="btn-primary btn-sm">
                  Next →
                </Link>
              </nav>
            )}

            {/* FAQ and Search Suggestions Section */}
            <div className="mt-12 grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
                <div className="space-y-4 text-sm">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">How do I find houses for rent in {filters.parish || 'Jamaica'}?</h3>
                    <p className="text-gray-600">
                      Browse our listings above to find available properties. Each listing shows photos, prices, and direct landlord contact information. 
                      You can filter by bedrooms, location, and property type.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Can I contact landlords directly?</h3>
                    <p className="text-gray-600">
                      Yes! All our listings include direct WhatsApp and phone contact for property owners. 
                      No agent fees or commissions - connect with landlords directly.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Are these listings updated regularly?</h3>
                    <p className="text-gray-600">
                      Our property listings are updated daily. New properties are added regularly, so check back often for the latest rentals.
                    </p>
                  </div>
                  {filters.parish === 'St Catherine' && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">What areas of St Catherine do you cover?</h3>
                      <p className="text-gray-600">
                        We have listings across St Catherine including Spanish Town, Portmore, Old Harbour, Linstead, and surrounding communities.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-2xl font-bold mb-4">Popular Searches</h2>
                <div className="space-y-2 text-sm">
                  <Link href="/search/1-bedroom-apartment-st-catherine" className="block text-accent hover:underline">
                    → 1 Bedroom House for rent in St Catherine
                  </Link>
                  <Link href="/search/2-bedroom-house-st-catherine" className="block text-accent hover:underline">
                    → 2 Bedroom House for rent in St Catherine
                  </Link>
                  <Link href="/search/3-bedroom-house-st-catherine" className="block text-accent hover:underline">
                    → 3 Bedroom House for rent in St Catherine
                  </Link>
                  <Link href="/search/houses-for-rent-spanish-town" className="block text-accent hover:underline">
                    → House for rent Spanish Town
                  </Link>
                  <Link href="/search/houses-for-rent-portmore" className="block text-accent hover:underline">
                    → House for rent in Portmore
                  </Link>
                  <Link href="/search/apartments-for-rent-kingston" className="block text-accent hover:underline">
                    → Apartments for rent in Kingston
                  </Link>
                  <Link href="/search/houses-for-rent-st-james" className="block text-accent hover:underline">
                    → Houses for rent in St James
                  </Link>
                  <Link href="/search/2-bedroom-apartment-st-andrew" className="block text-accent hover:underline">
                    → 2 Bedroom Apartments in St Andrew
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export async function getStaticPaths() {
  // Fetch all parishes and property combinations from DB
  const { data: properties } = await supabase
    .from('properties')
    .select('parish, bedrooms, type')
    .limit(1000);

  const paths = [];

  if (properties && properties.length > 0) {
    // Create base paths for each parish
    const parishesSeen = new Set();
    properties.forEach(prop => {
      if (prop.parish && !parishesSeen.has(prop.parish)) {
        parishesSeen.add(prop.parish);
        // Format parish as slug: "St James" -> "st-james"
        const parishSlug = prop.parish.toLowerCase().replace(/ /g, '-');
        paths.push({
          params: { slug: ['apartments-for-rent', parishSlug] },
        });
        paths.push({
          params: { slug: ['houses-for-rent', parishSlug] },
        });
      }
    });

    // Create paths for bedrooms + parish combinations
    const bedroomParishSeen = new Set();
    properties.forEach(prop => {
      if (prop.bedrooms && prop.parish) {
        const parishSlug = prop.parish.toLowerCase().replace(/ /g, '-');
        const key = `${prop.bedrooms}-${parishSlug}`;
        if (!bedroomParishSeen.has(key)) {
          bedroomParishSeen.add(key);
          paths.push({
            params: { slug: [`${prop.bedrooms}-bedroom-apartment`, parishSlug] },
          });
        }
      }
    });
  }

  return {
    paths: paths.slice(0, 100), // Limit to 100 to avoid build timeouts
    fallback: 'blocking', // Allow dynamic generation for other combinations
  };
}

export async function getStaticProps({ params }) {
  const slug = params.slug || [];
  const slugStr = slug.join('-').toLowerCase();

  const PARISHES = [
    'Kingston', 'St Andrew', 'St Catherine', 'St James', 'Clarendon',
    'Manchester', 'St Ann', 'Portland', 'St Thomas', 'St Elizabeth',
    'Trelawny', 'Hanover'
  ];

  // Parse filters from slug
  const filters = { parish: '', bedrooms: '', type: '' };
  PARISHES.forEach(p => {
    if (slugStr.includes(p.toLowerCase().replace(/ /g, '-'))) {
      filters.parish = normalizeParish(p);
    }
  });

  const bedroomMatch = slugStr.match(/(\d+)-bedroom/);
  if (bedroomMatch) filters.bedrooms = bedroomMatch[1];
  if (slugStr.includes('apartment') || slugStr.includes('apt')) filters.type = 'apartment';
  if (slugStr.includes('house')) filters.type = 'house';

  // Build query with harsh partial matching across multiple fields
  let query = supabase
    .from('properties')
    .select('*', { count: 'exact' })
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  // Apply precise filters when present
  if (filters.parish) query = query.eq('parish', normalizeParish(filters.parish));
  if (filters.bedrooms) query = query.eq('bedrooms', Number(filters.bedrooms));

  // Harsh partial search: tokenize slug and OR-match across title, description, parish, town, address
  const tokens = slugStr
    .replace(/_/g, '-')
    .split('-')
    .filter(Boolean)
    .map(t => t.trim())
    .filter(t => t.length > 1);

  if (tokens.length > 0) {
    const ors = [];
    tokens.forEach(tok => {
      const like = `%${tok}%`;
      ors.push(`title.ilike.${like}`);
      ors.push(`description.ilike.${like}`);
      ors.push(`parish.ilike.${like}`);
      ors.push(`town.ilike.${like}`);
      ors.push(`address.ilike.${like}`);
      ors.push(`type.ilike.${like}`);
    });
    // Supabase OR expects comma-separated conditions
    query = query.or(ors.join(','));
  }

  // Fetch with limit; if empty, fallback to latest available to avoid empty page
  let { data: properties, count } = await query.limit(20);
  if (!properties || properties.length === 0) {
    const fallback = await supabase
      .from('properties')
      .select('*', { count: 'exact' })
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20);
    properties = fallback.data || [];
    count = fallback.count || properties.length;
  }

  // Generate meta tags with better SEO optimization
  const parts = slug.map(s => s.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
  const bedroomCount = filters.bedrooms || '';
  const propertyType = filters.type ? filters.type.charAt(0).toUpperCase() + filters.type.slice(1) : 'Property';
  const parishName = filters.parish || 'Jamaica';
  
  const pageTitle = bedroomCount 
    ? `${bedroomCount} Bedroom ${propertyType} for Rent in ${parishName} | Dosnine Properties Jamaica`
    : `${parts.join(' ')} | Houses & Apartments for Rent in Jamaica | Dosnine Properties`;
  
  const pageDescription = `Find ${bedroomCount ? bedroomCount + ' bedroom ' : ''}${filters.type || 'properties'} for rent in ${parishName}, Jamaica. Browse ${count || 'available'} listings with photos, prices, and landlord contact info. No agent fees. Connect directly with property owners.`;
  
  const pageKeywords = [
    `${bedroomCount} bedroom ${filters.type || 'house'} for rent in ${parishName}`,
    `${filters.type || 'property'} for rent ${parishName} Jamaica`,
    `houses for rent in ${parishName}`,
    `apartments for rent ${parishName}`,
    `rental properties ${parishName}`,
    'Sunday Gleaner classified',
    'house for rent Jamaica',
    parishName === 'St Catherine' ? 'house for rent Spanish Town, house for rent Portmore' : '',
    'rental listings Jamaica'
  ].filter(Boolean).join(', ');

  return {
    props: {
      slug,
      properties: properties || [],
      totalCount: count || 0,
      pageTitle,
      pageDescription,
      pageKeywords,
    },
    revalidate: 3600, // Revalidate every hour
  };
}
