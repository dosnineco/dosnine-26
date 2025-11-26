import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { Sparkle, Zap } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { formatMoney } from '../lib/formatMoney';
import BetaBanner from '../components/BetaBanner';
const PROPERTIES_PER_PAGE = 12;

const PARISHES = [
  'Kingston', 'St Andrew', 'St Catherine', 'St James', 'Clarendon',
  'Manchester', 'St Ann', 'Portland', 'St Thomas', 'St Elizabeth', 'Trelawny', 'Hanover'
];

// Fake properties to fill the grid
const FAKE_PROPERTIES = [
  { id: 'fake-1', title: '3 Bedroom Villa in New Kingston', parish: 'Kingston', town: 'New Kingston', bedrooms: 3, bathrooms: 2, price: 180000, image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500' },
  { id: 'fake-2', title: 'Modern Apartment in Liguanea', parish: 'St Andrew', town: 'Liguanea', bedrooms: 2, bathrooms: 2, price: 120000, image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=500' },
  { id: 'fake-3', title: 'Luxury Condo in Montego Bay', parish: 'St James', town: 'Montego Bay', bedrooms: 4, bathrooms: 3, price: 250000, image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500' },
  { id: 'fake-4', title: 'Cozy Studio in Half Way Tree', parish: 'St Andrew', town: 'Half Way Tree', bedrooms: 1, bathrooms: 1, price: 75000, image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500' },
  { id: 'fake-5', title: 'Family Home in Portmore', parish: 'St Catherine', town: 'Portmore', bedrooms: 3, bathrooms: 2, price: 145000, image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=500' },
  { id: 'fake-6', title: 'Beachfront Property in Ocho Rios', parish: 'St Ann', town: 'Ocho Rios', bedrooms: 5, bathrooms: 4, price: 400000, image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500' },
  { id: 'fake-7', title: '2 Bedroom Flat in Mandeville', parish: 'Manchester', town: 'Mandeville', bedrooms: 2, bathrooms: 1, price: 95000, image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500' },
  { id: 'fake-8', title: 'Townhouse in Spanish Town', parish: 'St Catherine', town: 'Spanish Town', bedrooms: 3, bathrooms: 2, price: 130000, image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=500' },
  { id: 'fake-9', title: 'Penthouse in Kingston', parish: 'Kingston', town: 'Downtown Kingston', bedrooms: 4, bathrooms: 3, price: 320000, image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500' },
  { id: 'fake-10', title: 'Garden Apartment in Stony Hill', parish: 'St Andrew', town: 'Stony Hill', bedrooms: 2, bathrooms: 2, price: 110000, image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=500' },
  { id: 'fake-11', title: 'Duplex in May Pen', parish: 'Clarendon', town: 'May Pen', bedrooms: 3, bathrooms: 2, price: 125000, image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500' },
  { id: 'fake-12', title: 'Bachelor Pad in Cross Roads', parish: 'St Andrew', town: 'Cross Roads', bedrooms: 1, bathrooms: 1, price: 68000, image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=500' },
  { id: 'fake-13', title: 'Estate Home in Ironshore', parish: 'St James', town: 'Ironshore', bedrooms: 5, bathrooms: 4, price: 450000, image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=500' },
  { id: 'fake-14', title: 'Cottage in Port Antonio', parish: 'Portland', town: 'Port Antonio', bedrooms: 2, bathrooms: 1, price: 85000, image: 'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=500' },
  { id: 'fake-15', title: 'Modern Loft in New Kingston', parish: 'Kingston', town: 'New Kingston', bedrooms: 2, bathrooms: 2, price: 155000, image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=500' },
  { id: 'fake-16', title: 'Bungalow in Mandeville', parish: 'Manchester', town: 'Mandeville', bedrooms: 3, bathrooms: 2, price: 115000, image: 'https://images.unsplash.com/photo-1600566753051-f0ba01efe27a?w=500' },
  { id: 'fake-17', title: 'Seafront Villa in Negril', parish: 'Hanover', town: 'Negril', bedrooms: 4, bathrooms: 3, price: 380000, image: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=500' },
  { id: 'fake-18', title: 'City Apartment in Kingston', parish: 'Kingston', town: 'Kingston', bedrooms: 2, bathrooms: 1, price: 98000, image: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=500' },
  { id: 'fake-19', title: 'Country House in St Elizabeth', parish: 'St Elizabeth', town: 'Black River', bedrooms: 4, bathrooms: 2, price: 165000, image: 'https://images.unsplash.com/photo-1600566752229-250ed79470f6?w=500' },
  { id: 'fake-20', title: 'Hillside Home in Irish Town', parish: 'St Andrew', town: 'Irish Town', bedrooms: 3, bathrooms: 2, price: 195000, image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=500' },
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

      {/* Beta Banner */}
      {/* <BetaBanner propertyCount={totalCount} /> */}

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-4 text-gray-900">Find Your Perfect Rental</h1>
        <p className="text-center text-gray-600 mb-8">Browse available properties across Jamaica</p>

        {!loading && (
          <div className="mb-4 text-center text-sm text-gray-500">
            Found {totalCount+20} properties
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

        {/* Always show landlord-focused CTA */}
        <div className="bg-red-600 rounded-2xl p-8 text-white text-center mb-12 shadow-2xl">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">🎉 Accepting Landlords Now!</h2>
            <p className="text-lg md:text-xl mb-6 text-white/90">
              List your property for FREE • Get featured placement • Reach thousands of renters
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/landlord/dashboard"
                className="bg-white text-purple-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                List Your Property Free →
              </Link>
              <div className="text-sm text-white/80">
                ✓ No credit card required • ✓ Takes 5 minutes
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading properties...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12">
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
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {/* Real Properties - Clickable */}
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

              {/* Fake Properties - Blurred and Non-clickable */}
              {properties.length < 20 && FAKE_PROPERTIES.slice(0, 20 - properties.length).map((fakeProp) => (
                <div key={fakeProp.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden transition relative">
                  {/* Blur overlay */}
                  <div className="absolute inset-0 backdrop-blur-sm bg-white/30 z-10 flex items-center justify-center">
                    <div className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-lg">
                      🔒 List to Unlock
                    </div>
                  </div>
                  
                  <div className="pointer-events-none">
                    <div className="relative h-48 bg-gray-100">
                      <img 
                        src={fakeProp.image} 
                        alt={fakeProp.title} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-gray-900/80 text-white px-2 py-1 rounded text-xs">
                        👁️ {Math.floor(Math.random() * 500) + 100}
                      </div>
                      <div className="absolute bottom-2 left-2 bg-gray-800 text-white px-3 py-1 rounded-lg text-sm font-semibold">
                        {formatMoney(fakeProp.price)}/mo
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{fakeProp.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        📍 {fakeProp.town}, {fakeProp.parish}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-gray-700 mb-3">
                        <span>🛏️ {fakeProp.bedrooms} bed</span>
                        <span>🚿 {fakeProp.bathrooms} bath</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
              Showing {(page - 1) * PROPERTIES_PER_PAGE + 1}-{Math.min(page * PROPERTIES_PER_PAGE, totalCount+20)} of {totalCount+20} properties
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
