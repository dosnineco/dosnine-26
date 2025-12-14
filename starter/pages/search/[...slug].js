import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { formatMoney } from '../../lib/formatMoney';
import PropertyCard from '../../components/PropertyCard';
import { useUser } from '@clerk/nextjs';

const PARISHES = [
  'Kingston', 'St Andrew', 'St Catherine', 'St James', 'Clarendon',
  'Manchester', 'St Ann', 'Portland', 'St Thomas', 'St Elizabeth',
  'Trelawny', 'Hanover'
];

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
        filters.parish = p;
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
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SearchResultsPage',
            name: pageTitle,
            description: pageDescription,
            url: `https://dosnine.com/search/${(slug || []).join('/')}`,
            mainEntity: {
              '@type': 'LocalBusiness',
              name: 'Dosnine Properties',
              description: 'Property listing marketplace in Jamaica',
              url: 'https://dosnine.com',
            },
          })}
        </script>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="text-accent hover:underline text-sm">← Back to Browse All</Link>
        </div>

        <h1 className="text-4xl font-bold mb-2 text-gray-900">{generateTitle()}</h1>
        <p className="text-lg text-gray-600 mb-8">{pageDescription}</p>

        {properties.length === 0 ? (
          <div className="text-center py-12 bg-blue-50 rounded-lg border border-blue-200 p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Properties Found</h2>
            <p className="text-gray-600 mb-6">We don't currently have listings matching "{generateTitle()}". Check back soon!</p>
            <Link href="/" className="btn-accent px-6 py-3 rounded-lg inline-block">
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
                <Link href={`/search/${(slug || []).join('/')}?page=${Math.max(1, page - 1)}`} className="btn-accent px-4 py-2 rounded-lg">
                  ← Prev
                </Link>

                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  const pageNum = page > 3 ? page + i - 2 : i + 1;
                  if (pageNum > totalPages) return null;
                  return (
                    <Link
                      key={pageNum}
                      href={`/search/${(slug || []).join('/')}?page=${pageNum}`}
                      className={`px-4 py-2 rounded-lg transition ${page === pageNum ? 'btn-accent' : 'btn-accent-outline'}`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}

                <Link href={`/search/${(slug || []).join('/')}?page=${Math.min(totalPages, page + 1)}`} className="btn-accent px-4 py-2 rounded-lg">
                  Next →
                </Link>
              </nav>
            )}
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
      filters.parish = p;
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
  if (filters.parish) query = query.eq('parish', filters.parish);
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

  // Generate meta tags
  const parts = slug.map(s => s.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
  const pageTitle = `${parts.join(' ')} - Dosnine Properties`;
  const pageDescription = `Browse ${parts.join(' ')} in Jamaica. Find rental properties with detailed information and contact landlords directly.`;
  const pageKeywords = `${parts.join(', ')}, rental properties Jamaica, apartments for rent`;

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
