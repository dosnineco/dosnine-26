import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import RequestAgentPopup from './RequestAgentPopup';
import { Search, MapPin, DollarSign, Clock, FileText, CheckCircle, Lock, Users, Home, Smartphone, Star, Circle } from 'lucide-react';

export default function PropertyRequestsMarketplace() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    bedrooms: '',
    location: '',
    budget: '',
    requestType: '', // buy, rent, sale
    parish: '',
    minPrice: '',
    maxPrice: ''
  });

  // Fetch requests from both service_requests and visitor_emails tables
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);

        // Fetch from service_requests - only open and non-contacted
        const { data: serviceRequests, error: serviceError } = await supabase
          .from('service_requests')
          .select('*')
          .eq('status', 'open')
          .or('is_contacted.is.null,is_contacted.eq.false')
          .order('created_at', { ascending: false })
          .limit(50);

        // Fetch from visitor_emails (recent, non-contacted leads only)
        const { data: visitorEmails, error: visitorError } = await supabase
          .from('visitor_emails')
          .select('*')
          .eq('email_status', 'not_contacted')
          .order('created_at', { ascending: false })
          .limit(50);

        if (serviceError) {
          console.error('Service requests fetch error:', serviceError);
        }
        if (visitorError) {
          console.error('Visitor emails fetch error:', visitorError);
        }

        // Combine and format data
        const combinedRequests = [
          ...(serviceRequests || []).map(req => {
            const extractedBudget = (!req.budget_min && !req.budget && req.description) 
              ? extractBudgetFromText(req.description) 
              : { min: null, max: null };
            
            return {
              ...req,
              type: 'service_request',
              source: 'agent_request',
              is_contacted: req.is_contacted,
              budget_min: req.budget_min || req.budget || extractedBudget.min,
              budget_max: req.budget_max || extractedBudget.max
            };
          }),
          ...(visitorEmails || []).map(visitor => {
            const extractedBudget = (!visitor.budget_min && !visitor.budget && visitor.message) 
              ? extractBudgetFromText(visitor.message) 
              : { min: null, max: null };
            
            return {
              ...visitor,
              type: 'visitor_email',
              source: visitor.source || 'homepage_popup',
              client_name: 'Not provided',
              client_email: visitor.email,
              client_phone: visitor.phone || 'Not provided',
              request_type: visitor.intent || 'inquiry',
              property_type: 'house',
              location: visitor.parish || visitor.area || 'Not specified',
              budget_min: visitor.budget_min || visitor.budget || extractedBudget.min,
              budget_max: visitor.budget_max || extractedBudget.max,
              is_contacted: visitor.email_status === 'emailed'
            };
          })
        ];

        // Sort by created_at descending and limit to 50 total
        combinedRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // Filter to only show requests with budget >= 80k
        const premiumRequests = combinedRequests.filter(req => {
          const budgetValue = req.budget_max || req.budget_min || 0;
          return budgetValue >= 80000;
        });
        
        const limitedRequests = premiumRequests.slice(0, 50);

        setRequests(limitedRequests);
        setFilteredRequests(limitedRequests);
      } catch (err) {
        console.error('Error fetching requests:', err);
        toast.error('Failed to load requests');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = requests;

    // Filter by request type (buy, rent, sale)
    if (filters.requestType) {
      filtered = filtered.filter(req =>
        req.request_type && req.request_type.toLowerCase() === filters.requestType.toLowerCase()
      );
    }

    // Filter by bedrooms
    if (filters.bedrooms) {
      filtered = filtered.filter(req => req.bedrooms === parseInt(filters.bedrooms));
    }

    // Filter by parish
    if (filters.parish) {
      filtered = filtered.filter(req =>
        (req.parish && req.parish.toLowerCase().includes(filters.parish.toLowerCase())) ||
        (req.location && req.location.toLowerCase().includes(filters.parish.toLowerCase()))
      );
    }

    // Filter by location (general search)
    if (filters.location) {
      filtered = filtered.filter(req =>
        req.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Filter by minimum price
    if (filters.minPrice) {
      const minAmount = parseFloat(filters.minPrice);
      filtered = filtered.filter(req => {
        const reqMin = req.budget_min || 0;
        const reqMax = req.budget_max || Infinity;
        return reqMax >= minAmount;
      });
    }

    // Filter by maximum price
    if (filters.maxPrice) {
      const maxAmount = parseFloat(filters.maxPrice);
      filtered = filtered.filter(req => {
        const reqMin = req.budget_min || 0;
        return reqMin <= maxAmount;
      });
    }

    // Legacy budget filter
    if (filters.budget) {
      const budgetAmount = parseFloat(filters.budget);
      filtered = filtered.filter(req =>
        (req.budget_max && req.budget_max >= budgetAmount) ||
        (!req.budget_max && req.budget_min <= budgetAmount)
      );
    }

    setFilteredRequests(filtered);
  }, [filters, requests]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Extract budget from description text using regex
  const extractBudgetFromText = (text) => {
    if (!text) return { min: null, max: null };
    
    const lowerText = text.toLowerCase();
    
    // Pattern 1: Range like "50k-100k" or "$50k - $100k" or "JMD 50,000 - 100,000"
    const rangePattern = /(?:jmd|[$]|budget|price)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:k|thousand|million|m)?\s*(?:-|to)\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|thousand|million|m)?/i;
    const rangeMatch = text.match(rangePattern);
    
    if (rangeMatch) {
      let min = parseFloat(rangeMatch[1].replace(/,/g, ''));
      let max = parseFloat(rangeMatch[2].replace(/,/g, ''));
      const unit = rangeMatch[3] || rangeMatch[1].match(/k|thousand|million|m/i)?.[0];
      
      if (unit?.match(/k|thousand/i)) {
        min *= 1000;
        max *= 1000;
      } else if (unit?.match(/m|million/i)) {
        min *= 1000000;
        max *= 1000000;
      } else if (min < 1000) {
        min *= 1000;
        max *= 1000;
      }
      
      return { min, max };
    }
    
    // Pattern 2: Single value like "50k" or "$50,000" or "JMD 50k"
    const singlePattern = /(?:jmd|[$]|budget|price)\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|thousand|million|m)?/i;
    const singleMatch = text.match(singlePattern);
    
    if (singleMatch) {
      let value = parseFloat(singleMatch[1].replace(/,/g, ''));
      const unit = singleMatch[2];
      
      if (unit?.match(/k|thousand/i)) {
        value *= 1000;
      } else if (unit?.match(/m|million/i)) {
        value *= 1000000;
      } else if (value < 1000) {
        value *= 1000;
      }
      
      return { min: value, max: null };
    }
    
    // Pattern 3: Just numbers like "50000-100000"
    const numberPattern = /(\d{4,})(?:\s*-\s*|\s+to\s+)(\d{4,})/i;
    const numberMatch = text.match(numberPattern);
    
    if (numberMatch) {
      return { 
        min: parseFloat(numberMatch[1]),
        max: parseFloat(numberMatch[2])
      };
    }
    
    return { min: null, max: null };
  };

  const formatBudget = (min, max) => {
    const minVal = min ? parseFloat(min) : null;
    const maxVal = max ? parseFloat(max) : null;
    
    if (!minVal && !maxVal) return 'Budget flexible';
    
    // If min and max are the same or very close, show as single value
    if (minVal && maxVal && Math.abs(minVal - maxVal) < 1000) {
      return `Up to JMD ${(minVal / 1000).toFixed(0)}k`;
    }
    
    // If both exist and different, show range
    if (minVal && maxVal) {
      return `JMD ${(minVal / 1000).toFixed(0)}k - ${(maxVal / 1000).toFixed(0)}k`;
    }
    
    // If only min exists
    if (minVal) return `JMD ${(minVal / 1000).toFixed(0)}k+`;
    
    // If only max exists
    return `Up to JMD ${(maxVal / 1000).toFixed(0)}k`;
  };

  const formatBedrooms = (bedrooms) => {
    if (!bedrooms || bedrooms === 0 || bedrooms === null) return 'Flexible';
    return bedrooms;
  };

  const formatLocation = (location, area, parish) => {
    if (area && parish && area !== parish) {
      return `${area}, ${parish}`;
    }
    if (parish && area) {
      return `${parish} (${area})`;
    }
    if (parish) {
      return `${parish} (Area flexible)`;
    }
    return location || 'Location flexible';
  };

  const getBudgetTier = (min, max) => {
    const value = max || min || 0;
    if (value >= 90000) return 'premium';
    if (value >= 60000) return 'mid';
    return 'standard';
  };

  const getUrgencyBadge = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const hoursDiff = Math.floor((now - created) / (1000 * 60 * 60));
    
    if (hoursDiff < 24) return 'Posted today';
    if (hoursDiff < 48) return 'Active now';
    return null;
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const created = new Date(date);
    const diffHours = Math.floor((now - created) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className="min-h-screen bg-gray-50">
  
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-block bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold px-4 py-2 rounded-full mb-4">
            These are REQUESTS from buyers & renters — not property listings
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Real Buyers & Renters<br />Looking for Properties Right Now
          </h1>
          
          <button
            onClick={() => router.push('/request')}
            className="btn-primary btn-lg mb-8 flex items-center gap-2 justify-center mx-auto"
          >
            <Search size={20} /> Submit Your Property Request
          </button>

          {/* Filter Section */}
          <div className="max-w-4xl mx-auto mt-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Request Type Filter */}
              <select
                name="requestType"
                value={filters.requestType}
                onChange={handleFilterChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="buy">Buy</option>
                <option value="rent">Rent</option>
                <option value="sale">Sale</option>
              </select>

              {/* Parish Filter */}
              <select
                name="parish"
                value={filters.parish}
                onChange={handleFilterChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">All Parishes</option>
                <option value="Kingston">Kingston</option>
                <option value="St. Andrew">St. Andrew</option>
                <option value="St. Catherine">St. Catherine</option>
                <option value="Clarendon">Clarendon</option>
                <option value="Manchester">Manchester</option>
                <option value="St. Elizabeth">St. Elizabeth</option>
                <option value="Westmoreland">Westmoreland</option>
                <option value="Hanover">Hanover</option>
                <option value="St. James">St. James</option>
                <option value="Trelawny">Trelawny</option>
                <option value="St. Ann">St. Ann</option>
                <option value="St. Mary">St. Mary</option>
                <option value="Portland">Portland</option>
                <option value="St. Thomas">St. Thomas</option>
              </select>

              {/* Bedrooms Filter */}
              <select
                name="bedrooms"
                value={filters.bedrooms}
                onChange={handleFilterChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">Bedrooms</option>
                <option value="1">1 Bedroom</option>
                <option value="2">2 Bedrooms</option>
                <option value="3">3 Bedrooms</option>
                <option value="4">4 Bedrooms</option>
                <option value="5">5+ Bedrooms</option>
              </select>

              {/* Min Price Filter */}
              <input
                type="number"
                name="minPrice"
                value={filters.minPrice}
                onChange={handleFilterChange}
                placeholder="Min Price (JMD)"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />

              {/* Max Price Filter */}
              <input
                type="number"
                name="maxPrice"
                value={filters.maxPrice}
                onChange={handleFilterChange}
                placeholder="Max Price (JMD)"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />

              {/* Location Search */}
              <input
                type="text"
                name="location"
                value={filters.location}
                onChange={handleFilterChange}
                placeholder="Search Location"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Clear Filters Button */}
            {(filters.requestType || filters.parish || filters.bedrooms || filters.minPrice || filters.maxPrice || filters.location) && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setFilters({
                    bedrooms: '',
                    location: '',
                    budget: '',
                    requestType: '',
                    parish: '',
                    minPrice: '',
                    maxPrice: ''
                  })}
                  className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Requests Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Live Property Requests from Buyers & Renters
          </h2>
          <p className="text-gray-600 text-sm">
            These are real people looking for properties. Claim a request to get their contact details.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">⏳</div>
            <p className="text-gray-600 mt-2">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No requests match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map(request => {
              const tier = getBudgetTier(request.budget_min, request.budget_max);
              const urgencyBadge = getUrgencyBadge(request.created_at);
              
              return (
              <div
                key={`${request.type}-${request.id}`}
                className={`bg-white rounded-lg p-6 hover:shadow-lg transition-all relative ${
                  tier === 'premium' ? 'border-2 border-yellow-400 shadow-md' :
                  tier === 'mid' ? 'border-2 border-blue-300' :
                  'border border-gray-200'
                }`}
              >
                {/* Premium Badge */}
                {tier === 'premium' && (
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                    <Star size={14} fill="white" /> Premium
                  </div>
                )}

                {/* Urgency Badge */}
                {urgencyBadge && (
                  <div className="inline-block bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-2 py-1 rounded-full mb-3 flex items-center gap-1">
                    <Circle size={10} fill="currentColor" /> {urgencyBadge}
                  </div>
                )}

                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Live {request.request_type === 'buy' ? 'Purchase' : request.request_type === 'rent' ? 'Rental' : 'Property'} Request — {formatBedrooms(request.bedrooms)}{formatBedrooms(request.bedrooms) === 'Flexible' ? ' Bedrooms' : '-Bedroom'}
                </h3>
                <p className="text-xs text-gray-500 mb-4 font-medium flex items-center gap-1">
                  <CheckCircle size={14} className="text-green-600" /> Verified {request.request_type === 'buy' ? 'buyer' : 'renter'}
                </p>

                {/* Location */}
                <div className="flex items-start gap-3 mb-3">
                  <MapPin className="text-red-500 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-gray-700 font-medium">
                      {formatLocation(request.location, request.area, request.parish)}
                    </p>
                  </div>
                </div>

                {/* Budget */}
                <div className="flex items-start gap-3 mb-3">
                  <DollarSign className="text-yellow-500 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-gray-700 font-medium">
                      {formatBudget(request.budget_min, request.budget_max)}
                    </p>
                  </div>
                </div>

                {/* Urgency Text */}
     

                {/* Posted */}
                {/* <div className="flex items-start gap-3 mb-6">
                  <Clock className="text-gray-500 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-gray-600 text-sm">Posted {getTimeAgo(request.created_at)}</p>
                  </div>
                </div> */}

                {/* Description if available */}
                {/* {request.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {request.description}
                  </p>
                )} */}

                {/* Additional info for visitor leads */}
                {/* {request.type === 'visitor_email' && (
                  <p className="text-gray-600 text-sm mb-4">
                    Lead from {request.source === 'homepage_popup' ? 'homepage popup' : 'visitor form'}. 
                    Bedrooms: {request.bedrooms || 'Not specified'}, 
                    Parish: {request.parish || 'Not specified'}, 
                    Area: {request.area || 'Not specified'}
                    {request.budget_min && `, Budget: ${formatBudget(request.budget_min, request.budget_max)}`}
                  </p>
                )} */}

                {/* Claim button */}
                <button
                  onClick={() => router.push('/agent-signup')}
                  className={`w-full text-center font-semibold py-3 rounded-lg transition-colors ${
                    tier === 'premium' ? 'bg-yellow-400 hover:bg-yellow-500 text-gray-900' :
                    tier === 'mid' ? 'bg-blue-500 hover:bg-blue-600 text-white' :
                    'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Unlock & Respond {tier === 'premium' ? '(Priority)' : tier === 'mid' ? '' : '(Limited Slots)'}
                </button>
              </div>
            );})}
          </div>
        )}
      </div>

      {/* How It Works Section */}
      <div className="bg-white border-t border-gray-200 py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <FileText size={48} className="text-gray-700" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                1. Submit Your Request
              </h3>
              <p className="text-gray-600">
                Fill in your details in 60 seconds.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Users size={48} className="text-gray-700" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                2. We Match You With Agents
              </h3>
              <p className="text-gray-600">
                Agents contact you with options.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Home size={48} className="text-gray-700" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                3. You Choose What Works
              </h3>
              <p className="text-gray-600">
                Pick the best home for you.
              </p>
            </div>
          </div>

          <p className="text-center text-gray-600 mb-12">
            Dosnine is where renters and buyers post requests, and agents respond.
          </p>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-8">
            <div className="flex items-center gap-2">
              <CheckCircle size={24} className="text-green-600" />
              <span className="font-semibold text-gray-900">Verified Agents</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock size={24} className="text-blue-600" />
              <span className="font-semibold text-gray-900">Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={24} className="text-purple-600" />
              <span className="font-semibold text-gray-900">Trusted by Thousands</span>
            </div>
          </div>
        </div>
      </div>

      {/* Request Popup Modal */}
      <RequestAgentPopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        prefilledData={{
          requestType: 'agent-inquiry'
        }}
      />
    </div>
  );
}
