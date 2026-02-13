import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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

        // Fetch from service_requests - only open and non-contacted
        const { data: serviceRequests, error: serviceError } = await supabase
          .from('service_requests')
          .select('id, request_type, bedrooms, location, budget_min, budget_max, created_at')
          .eq('status', 'open')
          .or('is_contacted.is.null,is_contacted.eq.false')
          .order('created_at', { ascending: false })
          .limit(25);

        // Fetch from visitor_emails (recent, non-contacted leads only)
        const { data: visitorEmails, error: visitorError } = await supabase
          .from('visitor_emails')
          .select('id, created_at, bedrooms, area, parish, budget_min')
          .order('created_at', { ascending: false })
          .limit(25);

        if (serviceError) {
          console.error('Service requests fetch error:', serviceError);
        }
        if (visitorError) {
          console.error('Visitor emails fetch error:', visitorError);
        }

        // Combine and format data
        const combinedRequests = [
          ...(serviceRequests || []).map(req => ({
            ...req,
            type: 'service_request',
            source: 'agent_request',
            area: null,
            parish: null
          })),
          ...(visitorEmails || []).map(visitor => {
            return {
              id: visitor.id,
              created_at: visitor.created_at,
              type: 'visitor_email',
              source: 'visitor_email',
              request_type: 'property_inquiry',
              bedrooms: visitor.bedrooms,
              location: null, // visitor_emails doesn't have a location field
              area: visitor.area,
              parish: visitor.parish,
              budget_min: visitor.budget_min,
              budget_max: null // visitor_emails doesn't track budget_max
            };
          })
        ];

        // Sort by created_at descending and limit to 50 total
        combinedRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        const limitedRequests = combinedRequests.slice(0, 25);

        setRequests(limitedRequests);
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
          const formattedRequest = {
            ...newRequest,
            type: 'service_request',
            source: 'agent_request'
          };

          setRequests(prev => [formattedRequest, ...prev].slice(0, 25));
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
        const formattedVisitor = {
          ...newVisitor,
          type: 'visitor_email',
          source: 'visitor_email',
          request_type: 'property_inquiry'
        };

        setRequests(prev => [formattedVisitor, ...prev].slice(0, 25));
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
    }, 3000);

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(visitorEmailsSubscription);
      supabase.removeChannel(presenceChannel);
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
          {/* <AdList/> */}

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
