import React, { useState, useEffect, Link } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import RequestAgentPopup from './RequestAgentPopup';
import { Search, MapPin, DollarSign, Clock, FileText, CheckCircle, Lock, Users, Home, Smartphone, Star, Circle, Building2, Building, Filter, X, ArrowRight } from 'lucide-react';
import AdList from './AdList';

export default function PropertyRequestsMarketplace() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);

  // Fetch requests from both service_requests and visitor_emails tables
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/marketplace/requests');
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to load requests');
        }
        setRequests(payload.requests || []);
      } catch (err) {
        console.error('Error fetching requests:', err);
        toast.error('Failed to load requests');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();

    const refreshInterval = setInterval(fetchRequests, 15000);

    // Simulate typing indicator for now (checks if users on request page)
    const checkActivity = setInterval(() => {
      // Random chance to show typing to simulate real activity
      const randomChance = Math.random() > 0.7;
      setShowTypingIndicator(randomChance);
    }, 3000);

    // Cleanup subscriptions
    return () => {
      clearInterval(refreshInterval);
      clearInterval(checkActivity);
    };
  }, []);

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
              href="/agent/signup"
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

                  <AdList/>


        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mt-2">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No requests available</p>
          </div>
        ) : (
          <div className=" grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {requests.map(request => {
              const tier = getBudgetTier(request.budget_min, request.budget_max);
              const urgencyBadge = getUrgencyBadge(request.created_at);
              const similarCount = getSimilarCount(request, requests);
              
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
                className='bg-white rounded-lg p-6 border border-gray-200 transition-all relative h-full flex flex-col'
              
              >
            


               

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

                {urgencyBadge && (
                  <div className="absolute top-3 right-3 bg-accent text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                    {urgencyBadge}
                  </div>
                )}

                {/* Budget */}
                <div className="flex items-start gap-3 mb-5 flex-grow">
                  <DollarSign className="text-gray-600 flex-shrink-0" size={16} />
                  <p className="text-sm text-gray-700 font-medium">
                    {formatBudget(request.budget_min, request.budget_max)}
                  </p>
                </div>

                 {/* Similar requests badge */}
                {similarCount > 0 && (
                  <div className="inline-flex  text-blue-700 text-[10px] font-semibold  py-0.5 rounded-full mb-2 ml-2 items-center gap-1">
                    +{similarCount} similar {similarCount === 1 ? 'request' : 'requests'}
                  </div>
                )}

               
              </div>
              </div>
            );})}
          </div>
        )}
      </div>

      {/* How It Works Section */}
      

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
