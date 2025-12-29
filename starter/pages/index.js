import { useEffect, useState, useRef, lazy, Suspense } from 'react';
const PropertyCard = lazy(() => import('../components/PropertyCard'));
import Seo from '../components/Seo';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { FiSearch } from 'react-icons/fi';
import { useUser, useClerk } from '@clerk/nextjs';
import { Home as HomeIcon, Users, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/router';
import { PARISHES, normalizeParish } from '../lib/normalizeParish';
import VisitorEmailPopup from '@/components/VisitorEmailPopup';
const PROPERTIES_PER_PAGE = 20;
import AdList from '../components/AdList';

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
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ parish: '', minPrice: '', maxPrice: '', location: '', bedrooms: '' });
  const [totalCount, setTotalCount] = useState(0);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [userOwnerId, setUserOwnerId] = useState(null);

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

  useEffect(() => {
    fetchProperties();
  }, [filters, page]);

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

  async function fetchProperties() {
    setLoading(true);
    try {
      let query = supabase
        .from('properties')
        .select('*', { count: 'exact' })
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      const parishFilter = normalizeParish(filters.parish);
      const minPriceFilter = filters.minPrice ? Number(filters.minPrice) : null;
      const maxPriceFilter = filters.maxPrice ? Number(filters.maxPrice) : null;
      const bedroomsFilter = filters.bedrooms ? Number(filters.bedrooms) : null;
      const locationFilter = (filters.location || '').trim();

      // Apply all filters with AND logic (all must match if active)
      if (parishFilter) query = query.eq('parish', parishFilter);
      if (minPriceFilter !== null && !Number.isNaN(minPriceFilter)) query = query.gte('price', minPriceFilter);
      if (maxPriceFilter !== null && !Number.isNaN(maxPriceFilter)) query = query.lte('price', maxPriceFilter);
      if (bedroomsFilter !== null && !Number.isNaN(bedroomsFilter)) query = query.eq('bedrooms', bedroomsFilter);
      
      // Location search - matches town, address, or parish (only if location filter is active AND no parish filter)
      if (locationFilter && !parishFilter) {
        const searchTerm = `%${locationFilter}%`;
        query = query.or(`town.ilike.${searchTerm},address.ilike.${searchTerm},parish.ilike.${searchTerm}`);
      }

      // Supabase range uses inclusive end index. For page p with size n:
      // start = (p - 1) * n, end = start + n - 1
      const start = (page - 1) * PROPERTIES_PER_PAGE;
      const end = start + PROPERTIES_PER_PAGE - 1;
      const { data, count, error } = await query.range(start, end);

      if (error) {
        console.error('Error fetching properties:', error);
        setProperties([]);
        setTotalCount(0);
      } else {
        console.log('Fetched properties:', data);
        console.log('Total count from DB:', count);
        const availableProps = (data || []).filter(p => 
          !p.status || p.status === 'available' || p.status === ''
        );
        setProperties(availableProps);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setProperties([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }

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

  const fetchLocationSuggestions = async (searchText) => {
    if (!searchText || searchText.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    try {
      const searchTerm = `%${searchText}%`;
      const { data, error } = await supabase
        .from('properties')
        .select('town, parish, address')
        .or(`town.ilike.${searchTerm},address.ilike.${searchTerm},parish.ilike.${searchTerm}`)
        .limit(10);

      if (error) throw error;

      // Extract unique locations
      const locations = new Set();
      data.forEach(prop => {
        if (prop.town) locations.add(prop.town);
        if (prop.parish) locations.add(prop.parish);
        // Extract main area from address
        if (prop.address) {
          const addressParts = prop.address.split(',');
          if (addressParts[0]) locations.add(addressParts[0].trim());
        }
      });

      const filtered = Array.from(locations).filter(loc => 
        loc.toLowerCase().includes(searchText.toLowerCase())
      ).slice(0, 8);

      setLocationSuggestions(filtered);
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
        title="Browse Rentals — Dosnine Properties"
        description="Find rental properties in Jamaica. Search by location, price, bedrooms, and more."
        url={process.env.NEXT_PUBLIC_SITE_URL + '/'}
      />

    <VisitorEmailPopup/>
      {/* Beta Banner */}

      {/* User Role Selection */}

      <div className="container  mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-4 text-gray-900">Find Your Perfect Property</h1>
        <p className="text-center text-gray-600 mb-8">Browse available properties across Jamaica</p>



        <form 
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            setFilters({
              parish: fd.get('parish') || '',
              minPrice: fd.get('minPrice') || '',
              maxPrice: fd.get('maxPrice') || '',
              location: locationInput || '',
              bedrooms: fd.get('bedrooms') || ''
            });
            setPage(1);
            setShowSuggestions(false);
          }}
          className="bg-white p-6 rounded-lg border border-gray-200 flex gap-3 flex-wrap items-end mb-8"
        >
          <div className="flex-1 min-w-[200px] relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Location Search</label>
            <input
              type="text"
              name="location"
              value={locationInput}
              onChange={handleLocationInput}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Enter area, town, or landmark..."
              className="w-full border border-gray-300 px-3 py-2.5 rounded-lg"
              autoComplete="off"
            />
            {showSuggestions && locationSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {locationSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectSuggestion(suggestion)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-100 transition text-sm text-gray-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
            <select name="bedrooms" className="w-full border border-gray-300 px-3 py-2.5 rounded-lg">
              <option value="">Any</option>
              <option value="1">1 Bed</option>
              <option value="2">2 Beds</option>
              <option value="3">3 Beds</option>
              <option value="4">4 Beds</option>
              <option value="5">5+ Beds</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Parish</label>
            <select name="parish" className="w-full border border-gray-300 px-3 py-2.5 rounded-lg">
              <option value="">All Parishes</option>
              {PARISHES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
            <input 
              name="minPrice" 
              type="number"
              placeholder="0" 
              className="w-full border border-gray-300 px-3 py-2.5 rounded-lg" 
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
            <input 
              name="maxPrice" 
              type="number"
              placeholder="Any" 
              className="w-full border border-gray-300 px-3 py-2.5 rounded-lg" 
            />
          </div>

          <button type="submit" className="btn-primary">
            Update Results
          </button>
        </form>

         <AdList/>



        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading properties...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12">
            {hasActiveFilters ? (
              // Show "No results" message when filters are active
              <div className="max-w-2xl mx-auto bg-blue-50 border-2 border-blue-200 rounded-xl p-8">
                <FiSearch className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-800 mb-3">No Results Found</h3>
                <p className="text-gray-700 mb-6">
                  We couldn't find any properties matching your search criteria. Try adjusting your filters or clearing your search.
                </p>
                <button
                  onClick={() => {
                    setFilters({ parish: '', minPrice: '', maxPrice: '', location: '', bedrooms: '' });
                    setLocationInput('');
                    setPage(1);
                  }}
                  className="btn-primary btn-lg"
                >
                  Clear All Filters
                </button>
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
                const isOwner = userOwnerId && prop.owner_id === userOwnerId;
                return (
                  <Suspense key={prop.id} fallback={<div className="bg-white rounded-lg border p-4 h-48" />}>
                    <div onClick={() => saveListState(idx)}>
                      <PropertyCard property={prop} isOwner={isOwner} index={idx} />
                    </div>
                  </Suspense>
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
