import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { Sparkle, Zap } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { formatMoney } from '../lib/formatMoney';
const PROPERTIES_PER_PAGE = 12;

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

  useEffect(() => {
    fetchProperties();
  }, [filters, page]);

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

      const { data, count, error } = await query
        .range((page - 1) * PROPERTIES_PER_PAGE, page * PROPERTIES_PER_PAGE - 1);

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

  const totalPages = Math.ceil(totalCount / PROPERTIES_PER_PAGE);

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
      <Head>
        <title>Browse Rentals — Dosnine Properties</title>
        <meta name="description" content="Find rental properties in Jamaica." />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-4 text-gray-900">Find Your Perfect Rental</h1>
        <p className="text-center text-gray-600 mb-8">Browse available properties across Jamaica</p>

        {!loading && (
          <div className="mb-4 text-center text-sm text-gray-500">
            Found {totalCount} properties
          </div>
        )}

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
            Apply Filters
          </button>
        </form>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading properties...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No properties found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {properties.map((prop) => {
                const firstImage = prop.image_urls?.[0] || prop.property_images?.[0]?.image_url;
                const isOwner = userOwnerId && prop.owner_id === userOwnerId;
                
                return (
                  <div key={prop.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden transition">
                    <Link href={`/property/${prop.slug || prop.id}`} className="block">
                      <div className="relative h-48 bg-gray-100">
                        {firstImage ? (
                          <img 
                            src={firstImage} 
                            alt={prop.title} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400 text-3xl">📷</div>
                        )}
                        {prop.is_featured && (
                          <div className="absolute top-2 right-2 items-center justify-center flex-row bg-red-400 text-white px-3 py-1 rounded-full text-xs font-medium">
                            <Sparkle className=' inline text-yellow-400 w-4 h-4  '/> Featured
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-gray-900/80 text-white px-2 py-1 rounded text-xs">
                          👁️ {prop.views || 0}
                        </div>
                        <div className="absolute bottom-2 left-2 bg-gray-800 text-white px-3 py-1 rounded-lg text-sm font-semibold">
                          {formatMoney(prop.price)}/mo
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{prop.title}</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          📍 {prop.town}, {prop.parish}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-700 mb-3">
                          <span>🛏️ {prop.bedrooms} bed</span>
                          <span>🚿 {prop.bathrooms} bath</span>
                        </div>

                        {prop.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{prop.description}</p>
                        )}
                      </div>
                    </Link>
                    
                    {isOwner && !prop.is_featured && (
                      <div className="px-4 pb-4">
                        <Link 
                          href="/landlord/boost-property"
                          className="block w-full text-center bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-2.5 rounded-lg hover:from-yellow-500 hover:to-orange-600 transition font-semibold text-sm"
                        >
                          <Zap className="inline w-4 h-4 mr-1" /> Boost This Property
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <nav className="flex justify-center items-center gap-2 mb-8">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
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

            <div className="text-center text-sm text-gray-600 mb-8">
              Showing {(page - 1) * PROPERTIES_PER_PAGE + 1}-{Math.min(page * PROPERTIES_PER_PAGE, totalCount)} of {totalCount} properties
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
