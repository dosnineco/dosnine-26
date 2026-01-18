import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import RequestAgentPopup from './RequestAgentPopup';
import { Search, MapPin, DollarSign, Clock, FileText, CheckCircle, Lock, Users, Home, Smartphone, Star, Circle, Building2, Building, Filter, X, ArrowRight } from 'lucide-react';

export default function PropertyRequestsMarketplace() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
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

    // Real-time subscription for service_requests
    const serviceRequestsSubscription = supabase
      .channel('service_requests_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'service_requests' }, (payload) => {
        const newRequest = payload.new;
        if (newRequest.status === 'open' && (!newRequest.is_contacted || newRequest.is_contacted === false)) {
          const extractedBudget = (!newRequest.budget_min && !newRequest.budget && newRequest.description) 
            ? extractBudgetFromText(newRequest.description) 
            : { min: null, max: null };
          
          const formattedRequest = {
            ...newRequest,
            type: 'service_request',
            source: 'agent_request',
            budget_min: newRequest.budget_min || newRequest.budget || extractedBudget.min,
            budget_max: newRequest.budget_max || extractedBudget.max
          };

          const budgetValue = formattedRequest.budget_max || formattedRequest.budget_min || 0;
          if (budgetValue >= 80000) {
            setRequests(prev => [formattedRequest, ...prev].slice(0, 50));
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'service_requests' }, (payload) => {
        const updated = payload.new;
        if (updated.is_contacted || updated.status !== 'open') {
          setRequests(prev => prev.filter(r => !(r.type === 'service_request' && r.id === updated.id)));
        }
      })
      .subscribe();

    // Real-time subscription for visitor_emails
    const visitorEmailsSubscription = supabase
      .channel('visitor_emails_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visitor_emails' }, (payload) => {
        const newVisitor = payload.new;
        if (newVisitor.email_status === 'not_contacted') {
          const extractedBudget = (!newVisitor.budget_min && !newVisitor.budget && newVisitor.message) 
            ? extractBudgetFromText(newVisitor.message) 
            : { min: null, max: null };
          
          const formattedVisitor = {
            ...newVisitor,
            type: 'visitor_email',
            source: newVisitor.source || 'homepage_popup',
            client_name: 'Not provided',
            client_email: newVisitor.email,
            client_phone: newVisitor.phone || 'Not provided',
            request_type: newVisitor.intent || 'inquiry',
            property_type: 'house',
            location: newVisitor.parish || newVisitor.area || 'Not specified',
            budget_min: newVisitor.budget_min || newVisitor.budget || extractedBudget.min,
            budget_max: newVisitor.budget_max || extractedBudget.max,
            is_contacted: false
          };

          const budgetValue = formattedVisitor.budget_max || formattedVisitor.budget_min || 0;
          if (budgetValue >= 80000) {
            setRequests(prev => [formattedVisitor, ...prev].slice(0, 50));
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'visitor_emails' }, (payload) => {
        const updated = payload.new;
        if (updated.email_status !== 'not_contacted') {
          setRequests(prev => prev.filter(r => !(r.type === 'visitor_email' && r.id === updated.id)));
        }
      })
      .subscribe();

    // Real-time presence detection for typing indicator
    const presenceChannel = supabase.channel('request_form_activity')
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const activeUsers = Object.keys(state).length;
        setShowTypingIndicator(activeUsers > 0);
      })
      .subscribe();

    // Simulate typing indicator for now (checks if users on request page)
    const checkActivity = setInterval(() => {
      // Random chance to show typing to simulate real activity
      const randomChance = Math.random() > 0.7;
      setShowTypingIndicator(randomChance);
    }, 4000);

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(serviceRequestsSubscription);
      supabase.removeChannel(visitorEmailsSubscription);
      supabase.removeChannel(presenceChannel);
      clearInterval(checkActivity);
    };
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
    
    const formatValue = (val) => {
      if (val >= 1000000) {
        const millions = val / 1000000;
        return `${millions.toFixed(millions >= 10 ? 0 : 1)}M`;
      }
      return `$${val.toLocaleString()}`;
    };
    
    // If min and max are the same or very close, show as single value
    if (minVal && maxVal && Math.abs(minVal - maxVal) < 1000) {
      return `Up to JMD ${formatValue(minVal)}`;
    }
    
    // If both exist and different, show range
    if (minVal && maxVal) {
      return `JMD ${formatValue(minVal)} - ${formatValue(maxVal)}`;
    }
    
    // If only min exists
    if (minVal) return `JMD ${formatValue(minVal)}+`;
    
    // If only max exists
    return `Up to JMD ${formatValue(maxVal)}`;
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

  // Group similar requests (same type, parish, bedrooms)
  const getSimilarCount = (currentRequest, allRequests) => {
    return allRequests.filter(r => 
      r.id !== currentRequest.id &&
      r.request_type === currentRequest.request_type &&
      r.parish === currentRequest.parish &&
      r.bedrooms === currentRequest.bedrooms
    ).length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
  
      {/* Collapsible Filter Section */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto animate-fadeIn">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Request Type Filter */}
                  <select
                    name="requestType"
                    value={filters.requestType}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                  >
                    <option value="">Bedrooms</option>
                    <option value="1">1 Bedroom</option>
                    <option value="2">2 Bedrooms</option>
                    <option value="3">3 Bedrooms</option>
                    <option value="4">4 Bedrooms</option>
                    <option value="5">5+ Bedrooms</option>
                  </select>

                  {/* Location Search */}
                  <input
                    type="text"
                    name="location"
                    value={filters.location}
                    onChange={handleFilterChange}
                    placeholder="Search Location"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                  />

                  {/* Min Price Filter */}
                  <input
                    type="number"
                    name="minPrice"
                    value={filters.minPrice}
                    onChange={handleFilterChange}
                    placeholder="Min Price"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                  />

                  {/* Max Price Filter */}
                  <input
                    type="number"
                    name="maxPrice"
                    value={filters.maxPrice}
                    onChange={handleFilterChange}
                    placeholder="Max Price"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                  />
                </div>

                {/* Clear Filters Button */}
                {(filters.requestType || filters.parish || filters.bedrooms || filters.minPrice || filters.maxPrice || filters.location) && (
                  <div className="flex justify-center mt-3">
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
                      className="inline-flex items-center gap-1 px-4 py-1.5 text-sm rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-medium"
                    >
                      <X size={14} /> Clear All Filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom spacing from hero */}
      <div className="h-20"></div>

      {/* Live Requests Section */}
      <div className="container mx-auto mb-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Live Property Requests from Buyers & Renters
          </h1>
          <p className="text-gray-600 text-base mb-8 leading-relaxed">
            These are real people looking for properties. Claim a request to get their contact details.
          </p>
          
          {/* Action Links */}
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            <a
              href="/listing"
              className="flex items-center gap-2 text-sm text-gray-900 font-semibold hover:text-gray-700 transition-colors border-b-2 border-gray-900 hover:border-gray-700 pb-2"
            >
              View Properties
              <ArrowRight size={20} />
            </a>
            <a
              href="/request"
              className="flex items-center gap-2 text-sm text-gray-900 font-semibold hover:text-gray-700 transition-colors border-b-2 border-gray-900 hover:border-gray-700 pb-2"
            >
              Submit a Request
              <ArrowRight size={20} />
            </a>
            <a
              href="/agent-signup"
              className="flex items-center gap-2 text-sm text-gray-900 font-semibold hover:text-gray-700 transition-colors border-b-2 border-gray-900 hover:border-gray-700 pb-2"
            >
              Become an Agent
              <ArrowRight size={16} />
            </a>
            <a
              href="/advertise"
              className="flex items-center gap-2 text-sm text-gray-900 font-semibold hover:text-gray-700 transition-colors border-b-2 border-gray-900 hover:border-gray-700 pb-2"
            >
              Advertise
              <ArrowRight size={16} />
            </a>  
          </div>
          
          {/* Live Typing Indicator - Reserved Space */}
          <div className="h-12 flex items-center justify-center">
            {showTypingIndicator && (
              <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-4 py-2 rounded-full animate-pulse">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
                <span>Anonymous is typing another request...</span>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mt-2">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No requests match your filters</p>
          </div>
        ) : (
          <div className=" grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRequests.map(request => {
              const tier = getBudgetTier(request.budget_min, request.budget_max);
              const urgencyBadge = getUrgencyBadge(request.created_at);
              const similarCount = getSimilarCount(request, filteredRequests);
              
              return (
              <div key={`${request.type}-${request.id}`} className="relative h-full">
                {/* Stacked cards effect - show background cards for similar requests */}
                {similarCount > 0 && (
                  <>
                    <div className="absolute top-1 left-1 right-1 bottom-0 bg-gray-100 rounded-lg border border-gray-200 -z-10"></div>
                    {similarCount > 1 && (
                      <div className="absolute top-2 left-2 right-2 bottom-0 bg-gray-50 rounded-lg border border-gray-100 -z-20"></div>
                    )}
                  </>
                )}
                
              <div
                className={`bg-white rounded-lg p-6 hover:shadow-lg transition-all relative h-full flex flex-col ${
                  tier === 'premium' ? 'border-2  shadow-md' :
                  'border border-gray-200'
                }`}
              >
                {/* Premium Badge - Only for premium tier */}
                {tier === 'premium' && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-gray-700 to-gray-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                    <Star size={10} fill="white" /> Premium
                  </div>
                )}

                {/* Urgency Badge */}
                {urgencyBadge && (
                  <div className="inline-flex bg-green-50 border border-green-200 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 items-center gap-1">
                    <Circle size={8} fill="currentColor" /> {urgencyBadge}
                  </div>
                )}

                {/* Similar requests badge */}
                {similarCount > 0 && (
                  <div className="inline-flex  text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ml-2 items-center gap-1">
                    +{similarCount} similar {similarCount === 1 ? 'request' : 'requests'}
                  </div>
                )}

                {/* Title */}
                <h3 className="text-base font-semibold text-gray-900 mb-2 leading-tight flex items-center gap-2">
                  {request.request_type === 'buy' ? <Home size={16} className="text-gray-700" /> : request.request_type === 'rent' ? <Building2 size={16} className="text-gray-700" /> : <Building size={16} className="text-gray-700" />}
                  <span>{request.request_type === 'buy' ? 'Purchase' : request.request_type === 'rent' ? 'Rental' : 'Property'} • {formatBedrooms(request.bedrooms)}{formatBedrooms(request.bedrooms) === 'Flexible' ? ' Bedrooms' : ' Bedroom' + (request.bedrooms > 1 ? 's' : '')}</span>
                </h3>
                <p className="text-xs text-gray-500 mb-4 font-medium flex items-center gap-2">
                  <CheckCircle size={12} className="text-green-600" /> Verified {request.request_type === 'buy' ? 'buyer' : 'renter'}
                </p>

                {/* Location */}
                <div className="flex items-start gap-3 mb-4">
                  <MapPin className="text-red-500 flex-shrink-0" size={16} />
                  <p className="text-sm text-gray-700 font-medium leading-relaxed">
                    {formatLocation(request.location, request.area, request.parish)}
                  </p>
                </div>

                {/* Budget */}
                <div className="flex items-start gap-3 mb-5 flex-grow">
                  <DollarSign className="text-gray-600 flex-shrink-0" size={16} />
                  <p className="text-sm text-gray-700 font-medium">
                    {formatBudget(request.budget_min, request.budget_max)}
                  </p>
                </div>

                {/* Claim button */}
                {/* <button
                  onClick={() => router.push('/agent-signup')}
                  className={`w-full text-center font-semibold py-2 text-xs rounded-lg transition-colors mt-auto ${
                    tier === 'premium' ? 'bg-gray-700 hover:bg-gray-800 text-white' :
                    'bg-gray-800 hover:bg-gray-900 text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    Unlock Contact{tier === 'premium' && <Star size={10} fill="white" />}
                  </span>
                </button> */}
              </div>
              </div>
            );})}
          </div>
        )}
      </div>

      {/* How It Works Section */}
      <div className="bg-white border-t border-gray-200  py-20">
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
