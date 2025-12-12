import { useEffect, useState, useRef, lazy, Suspense } from 'react';
const PropertyCard = lazy(() => import('../components/PropertyCard'));
import Head from 'next/head';
import Seo from '../components/Seo';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { Sparkle, Zap, Search } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { formatMoney } from '../lib/formatMoney';
import BetaBanner from '../components/BetaBanner';
const PROPERTIES_PER_PAGE = 20;

const PARISHES = [
  'Kingston', 'St Andrew', 'St Catherine', 'St James', 'Clarendon',
  'Manchester', 'St Ann', 'Portland', 'St Thomas', 'St Elizabeth', 'Trelawny', 'Hanover'
];


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

      if (filters.parish) query = query.eq('parish', filters.parish);
      if (filters.minPrice) query = query.gte('price', Number(filters.minPrice));
      if (filters.maxPrice) query = query.lte('price', Number(filters.maxPrice));
      if (filters.bedrooms) query = query.eq('bedrooms', filters.bedrooms);
      
      // Partial location search - matches town, address, or parish
      if (filters.location) {
        const searchTerm = `%${filters.location}%`;
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

      {/* Beta Banner */}
      {/* <BetaBanner propertyCount={totalCount} /> */}

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-4 text-gray-900">Find Your Perfect Rental</h1>
        <p className="text-center text-gray-600 mb-8">Browse available properties across Jamaica</p>

        {/* {!loading && (
          <div className="mb-4 text-center text-sm text-gray-500">
            Found {totalCount+20} properties
          </div>
        )} */}

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

          <button type="submit" className="bg-gray-800 text-white px-6 py-2.5 rounded-lg hover:bg-gray-700 transition font-medium">
            Update Results
          </button>
        </form>


        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading properties...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12">
            {hasActiveFilters ? (
              // Show "No results" message when filters are active
              <div className="max-w-2xl mx-auto bg-blue-50 border-2 border-blue-200 rounded-xl p-8">
                <Search className="w-12 h-12 text-blue-600 mx-auto mb-4" />
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
                  className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition shadow-lg"
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
                  href="/landlord/dashboard"
                  className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg font-bold hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
                >
                  Claim Your Spot →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
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
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
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
                      className={`px-4 py-2 rounded-lg transition ${page === pageNum ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
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
