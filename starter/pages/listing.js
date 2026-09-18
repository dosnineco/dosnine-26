import { useEffect, useState, useRef, useCallback, lazy, Suspense, Fragment } from 'react';
const PropertyCard = lazy(() => import('../components/PropertyCard'));
const InFeedAd = lazy(() => import('../components/InFeedAd'));
import Seo from '../components/Seo';
import Link from 'next/link';
import { FiSearch } from 'react-icons/fi';
import { useUser, useClerk } from '@clerk/clerk-react';
import { Home as HomeIcon, Users, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/router';
import { PARISHES, normalizeParish } from '../lib/normalizeParish';
import VisitorEmailPopup from '@/components/VisitorEmailPopup';
import BecomeAgentBanner from '../components/BecomeAgentBanner';
const PROPERTIES_PER_PAGE = 30;

const PARISH_ALIAS_LOOKUP = {
  'st andrew': 'St Andrew',
  'st catherine': 'St Catherine',
  'st james': 'St James',
  'st mary': 'St Mary',
  'st ann': 'St Ann',
  'st thomas': 'St Thomas',
  'st elizabeth': 'St Elizabeth',
  'kingston': 'Kingston',
  'portland': 'Portland',
  'clarendon': 'Clarendon',
  'manchester': 'Manchester',
  'trelawny': 'Trelawny',
  'hanover': 'Hanover',
  'westmoreland': 'Westmoreland',
};

const LOCATION_HINTS = [
  'kingston 6',
  'half way tree',
  'hwt',
  'greater portmore',
  'portmore',
  'braeton',
  'spanish town',
  'montego bay',
  'mobay',
  'ocho rios',
  'ochi',
  'mandeville',
  'may pen',
  'negril',
  'old harbour',
  'morant bay',
  'falmouth',
  'port antonio',
  'savanna-la-mar',
  'linstead',
  'brownstown',
  'westmor',
];

function convertPrice(value, suffix = '') {
  const numericValue = Number(String(value || '').replace(/,/g, '').trim());
  if (!Number.isFinite(numericValue)) return '';

  const normalizedSuffix = String(suffix || '').toLowerCase();
  let total = numericValue;

  if (normalizedSuffix === 'k') total *= 1000;
  if (normalizedSuffix === 'm' || normalizedSuffix === 'million') total *= 1000000;

  return String(Math.round(total));
}

function parseSearchQuery(query) {
  const text = String(query || '').toLowerCase().trim();
  const result = { location: '', parish: '', bedrooms: '', minPrice: '', maxPrice: '' };

  if (!text) return result;

  const bedroomMap = {
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    ten: '10',
  };

  const explicitBedroomMatch = text.match(/(\d+)\s*(?:bed|beds|bedroom|bedrooms)/i);
  if (explicitBedroomMatch) {
    result.bedrooms = explicitBedroomMatch[1];
  }

  if (!result.bedrooms) {
    const wordBedroomMatch = text.match(/(one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:bed|beds|bedroom|bedrooms)/i);
    if (wordBedroomMatch) {
      result.bedrooms = bedroomMap[wordBedroomMatch[1].toLowerCase()] || '';
    }
  }

  const rangeMatch = text.match(/(?:between|from)\s*([\d,]+(?:\.\d+)?)\s*(k|m|million)?\s*(?:and|to|-|–)\s*([\d,]+(?:\.\d+)?)\s*(k|m|million)?/i)
    || text.match(/([\d,]+(?:\.\d+)?)\s*(k|m|million)?\s*(?:to|-|–|and)\s*([\d,]+(?:\.\d+)?)\s*(k|m|million)?/i);

  if (rangeMatch) {
    const [, minRaw, minSuffix, maxRaw, maxSuffix] = rangeMatch;
    const minValue = convertPrice(minRaw, minSuffix || '');
    const maxValue = convertPrice(maxRaw, maxSuffix || '');

    if (minValue) result.minPrice = minValue;
    if (maxValue) result.maxPrice = maxValue;
  }

  if (!result.maxPrice) {
    const maxPriceMatch = text.match(/(?:under|below|less than|not more than|up to|upto|max(?:imum)?|budget)\s*(?:jmd|j\$|\$)?\s*([\d,]+(?:\.\d+)?)\s*(k|m|million)?/i);
    if (maxPriceMatch) {
      result.maxPrice = convertPrice(maxPriceMatch[1], maxPriceMatch[2]);
    }
  }

  if (!result.minPrice) {
    const minPriceMatch = text.match(/(?:from|starting at|starting from|at least|above|over|more than|min(?:imum)?)\s*(?:jmd|j\$|\$)?\s*([\d,]+(?:\.\d+)?)\s*(k|m|million)?/i);
    if (minPriceMatch) {
      result.minPrice = convertPrice(minPriceMatch[1], minPriceMatch[2]);
    }
  }

  if (!result.minPrice && !result.maxPrice && /\d/.test(text)) {
    const singlePriceMatch = text.match(/(?:jmd|j\$|\$)?\s*([\d,]+(?:\.\d+)?)\s*(k|m|million)?/i);
    const hasPriceCue = /(?:k|m|million|jmd|j\$|\$)/.test(text) || /(?:under|below|less than|budget|max|minimum|up to|upto)/.test(text);

    if (singlePriceMatch && hasPriceCue) {
      const [, amount, suffix] = singlePriceMatch;
      if (amount) {
        result.maxPrice = convertPrice(amount, suffix || '');
      }
    }
  }

  const parishCandidates = Object.entries(PARISH_ALIAS_LOOKUP).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, label] of parishCandidates) {
    if (text.includes(alias) && !text.includes('kingston 6')) {
      result.parish = label;
      break;
    }
  }

  const locationCandidates = [...LOCATION_HINTS]
    .filter((candidate) => text.includes(candidate))
    .sort((a, b) => b.length - a.length);
  if (locationCandidates.length > 0) {
    result.location = locationCandidates
      .map((candidate) => candidate.replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim())
      .join(' and ');
  }

  if (!result.location) {
    const fallbackLocationMatch = text.match(/(?:in|around|near|for|at)\s+([a-z0-9\s&-]+?)(?=\s+(?:under|below|less than|max|maximum|budget|bed|beds|bedroom|bedrooms|house|apartment|flat|townhouse)|$)/i);
    if (fallbackLocationMatch) {
      const location = fallbackLocationMatch[1].trim();
      if (location && !location.includes('st ') && !location.includes('kingston')) {
        result.location = location.replace(/\s+/g, ' ').trim();
      }
    }
  }

  if (!result.location && !result.parish) {
    const textSansNumbers = text.replace(/\d+/g, ' ').replace(/\b(?:bed|beds|bedroom|bedrooms|under|below|less than|max|maximum|budget|house|apartment|flat|townhouse|looking|for|need|around|near|in|at|to)\b/g, ' ');
    const locationTokens = textSansNumbers.split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
    if (locationTokens.length > 2 && !locationTokens.includes('st ') && !locationTokens.includes('kingston')) {
      result.location = locationTokens.trim();
    }
  }

  return result;
}

// Role Card Component - same size as PropertyCard
function RoleCard({ title, subtitle, icon: Icon, bgColor, textColor, link, user, bgImage }) {
  const router = useRouter();
  const { redirectToSignIn } = useClerk();
  const { isLoaded } = useUser();

  const handleClick = () => {
    if (!isLoaded) return;
    
    if (user) {
      router.push(link);
    } else {
      sessionStorage.setItem('redirectAfterSignIn', link);
      redirectToSignIn({ redirectUrl: link });
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`${bgImage ? 'bg-cover bg-center' : bgColor} rounded-lg hover:shadow-lg border-2 border-transparent p-6 cursor-pointer transition-all group h-full flex flex-col relative overflow-hidden`}
      style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}}
    >
      {/* Overlay for better text readability when using background image */}
      {bgImage && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30"></div>
      )}

      <div className="relative z-0">
        {/* Icon */}
        <div className={`w-12 h-12 ${bgImage ? 'text-white  bg-white/20 backdrop-blur-sm' : `${textColor} bg-white`} rounded-lg flex items-center justify-center mb-3 shadow-sm group-hover:shadow-md transition`}>
          <Icon className="w-6 h-6" />
        </div>

        {/* Title */}
        <h3 className={`text-xl font-bold mb-1 ${bgImage ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h3>
        <p className={`text-sm font-semibold mb-3 ${bgImage ? 'text-white/90' : textColor}`}>
          {subtitle}
        </p>

        {/* CTA */}
        <div className={`mt-auto flex items-center font-medium group-hover:translate-x-1 transition text-white`}>
          Get Started
          <ArrowRight className="w-4 h-4 ml-1" />
        </div>
      </div>
    </div>
  );
}


export default function Home() {
  const { user } = useUser();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ parish: '', minPrice: '', maxPrice: '', location: '', bedrooms: '' });
  const [totalCount, setTotalCount] = useState(0);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Restore list state if present (page, filters, scroll position)
  const [restoring, setRestoring] = useState(false);
  const restoreRef = useRef(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('dosnine_list_state');
      if (!raw) return;
      const state = JSON.parse(raw);
      if (!state) return;
      // Apply saved filters and page, mark restoring so we don't scroll to top
      if (state.filters) setFilters(state.filters);
      if (state.page) setPage(state.page);
      restoreRef.current = state;
      setRestoring(true);
      // remove stored state to avoid repeated restores
      sessionStorage.removeItem('dosnine_list_state');
    } catch (err) {
      console.error('Failed to restore list state', err);
    }
  }, []);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const parishFilter = normalizeParish(filters.parish);
      const minPriceFilter = filters.minPrice ? Number(filters.minPrice) : null;
      const maxPriceFilter = filters.maxPrice ? Number(filters.maxPrice) : null;
      const bedroomsFilter = filters.bedrooms ? Number(filters.bedrooms) : null;
      const locationFilter = (filters.location || '').trim();

      const params = new URLSearchParams({
        page: String(page),
        perPage: String(PROPERTIES_PER_PAGE),
        parish: parishFilter || '',
        minPrice: minPriceFilter !== null ? String(minPriceFilter) : '',
        maxPrice: maxPriceFilter !== null ? String(maxPriceFilter) : '',
        bedrooms: bedroomsFilter !== null ? String(bedroomsFilter) : '',
        location: locationFilter,
      });

      const response = await fetch(`/api/properties/public-list?${params.toString()}`);
      const raw = await response.text();
      let payload = null;

      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.success) {
        const message = payload?.error || payload?.message || 'Failed to load properties';
        console.error('Error fetching properties:', message);
        setLoadError(message);
        setProperties([]);
        setTotalCount(0);
      } else {
        setProperties(payload.properties || []);
        setTotalCount(payload.totalCount || 0);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setLoadError('Failed to load properties');
      setProperties([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // After properties load, if we're restoring from a saved state, scroll to saved position
  useEffect(() => {
    if (!restoring) return;
    if (loading) return;
    try {
      const state = restoreRef.current;
      if (state) {
        // Try to scroll to the exact card, else restore scrollY
        const el = document.querySelector(`[data-list-index="${state.index}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'auto', block: 'center' });
        } else if (typeof state.scrollY === 'number') {
          window.scrollTo(0, state.scrollY);
        }
      }
    } catch (err) {
      console.error('Error restoring scroll position', err);
    } finally {
      setRestoring(false);
      restoreRef.current = null;
    }
  }, [properties, loading, restoring]);

  const totalPages =  PROPERTIES_PER_PAGE > 0 ? Math.ceil(totalCount / PROPERTIES_PER_PAGE) : 0;

  // Save list state before navigating to a property
  const saveListState = (index) => {
    try {
      const state = { page, filters, scrollY: window.scrollY, index };
      sessionStorage.setItem('dosnine_list_state', JSON.stringify(state));
    } catch (err) {
      console.error('Failed to save list state', err);
    }
  };

  // Check if any filter is active
  const hasActiveFilters = filters.parish || filters.minPrice || filters.maxPrice || filters.location || filters.bedrooms;

  const activeFilterEntries = [
    filters.location ? { key: 'location', label: `Location: ${filters.location}` } : null,
    filters.parish ? { key: 'parish', label: `Parish: ${filters.parish}` } : null,
    filters.bedrooms ? { key: 'bedrooms', label: `Bedrooms: ${filters.bedrooms}` } : null,
    filters.minPrice ? { key: 'minPrice', label: `Min: J$${Number(filters.minPrice).toLocaleString()}` } : null,
    filters.maxPrice ? { key: 'maxPrice', label: `Max: J$${Number(filters.maxPrice).toLocaleString()}` } : null,
  ].filter(Boolean);

  const handleRemoveFilter = (field) => {
    setFilters((prev) => ({ ...prev, [field]: '' }));
    setPage(1);
  };

  const fetchLocationSuggestions = async (searchText) => {
    if (!searchText || searchText.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/properties/suggestions?q=${encodeURIComponent(searchText)}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to fetch suggestions');
      setLocationSuggestions(payload.suggestions || []);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
  };

  const handleLocationInput = (e) => {
    const value = e.target.value;
    setLocationInput(value);
    setShowSuggestions(true);
    fetchLocationSuggestions(value);
  };

  const selectSuggestion = (suggestion) => {
    setLocationInput(suggestion);
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  return (
    <div>
      <Seo
        title="Browse Rentals — Dosnine Limited"
        description="Find rental properties in Jamaica. Search by location, price, bedrooms, and more."
        url={process.env.NEXT_PUBLIC_SITE_URL + '/'}
      />

      {/* Beta Banner */}

      {/* User Role Selection */}

      <div className="container  mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-4 text-gray-900">Find Your Perfect Property</h1>
        <p className="text-center text-gray-600 mb-8">Browse properties across Jamaica</p>

        {/* Become Agent Banner */}



        <form
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = parseSearchQuery(locationInput);
            setFilters(parsed);
            setPage(1);
            setShowSuggestions(false);
          }}
          className="bg-white p-4 rounded-xl border border-gray-200 mb-4"
        >
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Properties</label>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />

                <input
                  type="text"
                  name="search"
                  value={locationInput}
                  onChange={handleLocationInput}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Try '2 bedroom house in Portmore under 150k'"
                  className="w-full border border-gray-300 pl-11 pr-4 py-3.5 rounded-lg text-base"
                  autoComplete="off"
                />

                {showSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                    {locationSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectSuggestion(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 text-sm text-gray-700"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" className="btn-primary px-6 py-3 rounded-lg">
                Search
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="text-gray-500">Try:</span>

              {[
                '2 bedroom in Portmore',
                'Kingston under 150k',
                '3 bedroom St Andrew',
                'Montego Bay',
              ].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setLocationInput(example);
                    setFilters(parseSearchQuery(example));
                    setPage(1);
                  }}
                  className="px-3 py-1.5 bg-gray-100 rounded-full hover:bg-gray-200"
                >
                  {example}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowFilterPanel((current) => !current)}
              className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {showFilterPanel ? 'Hide filters' : 'Filters'}
            </button>
          </div>

          {showFilterPanel && (
            <div className="mt-4 border-t border-gray-200 pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1">Bedrooms</label>
                <select
                  value={filters.bedrooms}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, bedrooms: e.target.value }));
                    setPage(1);
                  }}
                  className="w-full border border-gray-300 px-3 py-2.5 rounded-lg"
                >
                  <option value="">Any</option>
                  <option value="1">1 Bed</option>
                  <option value="2">2 Beds</option>
                  <option value="3">3 Beds</option>
                  <option value="4">4 Beds</option>
                  <option value="5">5+ Beds</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1">Parish</label>
                <select
                  value={filters.parish}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, parish: e.target.value }));
                    setPage(1);
                  }}
                  className="w-full border border-gray-300 px-3 py-2.5 rounded-lg"
                >
                  <option value="">All Parishes</option>
                  {PARISHES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1">Min Price</label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, minPrice: e.target.value }));
                    setPage(1);
                  }}
                  placeholder="0"
                  className="w-full border border-gray-300 px-3 py-2.5 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1">Max Price</label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, maxPrice: e.target.value }));
                    setPage(1);
                  }}
                  placeholder="Any"
                  className="w-full border border-gray-300 px-3 py-2.5 rounded-lg"
                />
              </div>
            </div>
          )}
        </form>

        {activeFilterEntries.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2">
              {activeFilterEntries.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => handleRemoveFilter(entry.key)}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
                >
                  <span>{entry.label}</span>
                  <span aria-label={`Remove ${entry.label}`}>×</span>
                </button>
              ))}
            </div>
            {filters.location && (
              <p className="mt-2 text-sm text-gray-500" aria-live="polite">
                Showing listings with partial matches for &quot;{filters.location}&quot;.
              </p>
            )}
          </div>
        )}



        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading properties...</p>
          </div>
        ) : loadError ? (
          <div className="text-center py-12">
            <div className="max-w-2xl mx-auto bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Couldn&apos;t Load Properties</h3>
              <p className="text-gray-700 mb-6">{loadError}</p>
              <button onClick={fetchProperties} className="btn-primary">Try Again</button>
            </div>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12">
            {hasActiveFilters ? (
              // Turn an unsuccessful search into a prefilled request.
             <div className="max-w-2xl mx-auto bg-blue-50 border-2 border-blue-200 rounded-xl p-8 text-center">
              <FiSearch className="w-12 h-12 text-blue-600 mx-auto mb-4" />

              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                Tell Us What You&apos;re Looking For
              </h3>

              <p className="text-gray-700 mb-6">
                We couldn&apos;t find an exact match, but you can tell us what you need and verified agents will send you matching options.
              </p>

              <Link
                href={{
                  pathname: '/request',
                  query: {
                    requestType: 'rent',
                    location: filters.location,
                    parish: filters.parish,
                    bedrooms: filters.bedrooms,
                    budgetMin: filters.minPrice,
                    budgetMax: filters.maxPrice,
                  },
                }}
                className="inline-block bg-accent text-white font-semibold px-6 py-3 rounded-lg transition"
              >
                Tell Us What You Need
              </Link>
            </div>
            ) : (
              // Show "Be Among The First" CTA when no properties in system and no filters applied
              <div className="max-w-2xl mx-auto bg-purple-50 border-2 border-purple-200 rounded-xl p-8">
                <div className="text-5xl mb-4">🚀</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Be Among The First</h3>
                <p className="text-gray-700 mb-6">
                  Early landlords get exclusive benefits including free featured listings, priority placement, and a beta tester badge.
                </p>
                <Link
                  href="/properties/my-listings"
                  className="btn-primary btn-lg"
                >
                  Claim Your Spot →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {/* Role Cards */}
              {/* <RoleCard
                title="Post your Property"
                subtitle="Rent or sell"
                icon={HomeIcon}
                bgColor='bg-blue-300'
                link="/landlord/new-property"
                user={user}
              />
              <RoleCard
                title="Become a Agent"
                subtitle="Verified pros"
                icon={Users}
                bgColor="bg-red-300"
                link="/agent/signup"
                user={user}
              /> */}
              {/* Real Properties - Clickable */}
              {properties.map((prop, idx) => {
                return (
                  <Fragment key={prop.id}>
                    <Suspense fallback={<div className="bg-white rounded-lg border p-4 h-48" />}>
                      <div onClick={() => saveListState(idx)}>
                        <PropertyCard property={prop} index={idx} />
                      </div>
                    </Suspense>
                    {(idx + 1) % 6 === 0 && (
                      <Suspense fallback={null}>
                        <InFeedAd />
                      </Suspense>
                    )}
                  </Fragment>
                );
              })}

             
            </div>

            {totalPages > 1 && (
              <nav className="flex justify-center items-center gap-2 mb-8">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  className="btn-accent px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  ← Prev
                </button>

                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  const pageNum = page > 3 ? page + i - 2 : i + 1;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-4 py-2 rounded-lg transition ${page === pageNum ? 'btn-accent' : 'btn-accent-outline'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="btn-accent px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  Next →
                </button>
              </nav>
            )}

            {/* <div className="text-center text-sm text-gray-600 mb-8">
              Showing {(page - 1) * PROPERTIES_PER_PAGE + 1}-{Math.min(page * PROPERTIES_PER_PAGE, totalCount+20)} of {totalCount+20} properties
            </div> */}
          </div>
        )}
      </div>
    </div>
  );
}
