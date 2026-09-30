import React, { useState, useEffect, Suspense, lazy } from 'react';
import toast from 'react-hot-toast';
import RequestAgentPopup from './RequestAgentPopup';
import {
  MapPin,
  DollarSign,
  CheckCircle,
  Home,
  Building2,
  Building,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

const PropertyCard = lazy(() => import('./PropertyCard'));

const FEATURED_LIMIT = 8;
const REQUEST_LIMIT = 8;

export default function PropertyRequestsMarketplace() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [featuredProperties, setFeaturedProperties] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  // Featured properties
  useEffect(() => {
    const fetchFeaturedProperties = async () => {
      try {
        const response = await fetch(
          `/api/properties/public-list?perPage=${FEATURED_LIMIT}&page=1`
        );
        const payload = await response.json();
        if (payload?.success && payload?.properties) {
          setFeaturedProperties(payload.properties.slice(0, FEATURED_LIMIT));
        }
      } catch (error) {
        console.error('Failed to load featured properties:', error);
      } finally {
        setLoadingFeatured(false);
      }
    };
    fetchFeaturedProperties();
  }, []);

  // Client requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/marketplace/requests?limit=${REQUEST_LIMIT}&page=1`
        );
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to load requests');
        }
        setRequests((payload.requests || []).slice(0, REQUEST_LIMIT));
      } catch (err) {
        console.error('Error fetching requests:', err);
        toast.error('Failed to load requests');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
    const refreshInterval = setInterval(fetchRequests, 60000);
    return () => clearInterval(refreshInterval);
  }, []);

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

    if (minVal && maxVal && Math.abs(minVal - maxVal) < 1000) {
      return `Up to JMD ${formatValue(minVal)}`;
    }
    if (minVal && maxVal) {
      return `JMD ${formatValue(minVal)} - ${formatValue(maxVal)}`;
    }
    if (minVal) return `JMD ${formatValue(minVal)}+`;
    return `Up to JMD ${formatValue(maxVal)}`;
  };

  const formatBedrooms = (bedrooms) => {
    if (!bedrooms || bedrooms === 0 || bedrooms === null) return 'Flexible';
    return bedrooms;
  };

  const formatLocation = (location, area, parish) => {
    if (area && parish && area !== parish) return `${area}, ${parish}`;
    if (parish && area) return `${parish} (${area})`;
    if (parish) return `${parish} (Area flexible)`;
    return location || 'Location flexible';
  };

  const getUrgencyBadge = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const hoursDiff = Math.floor((now - created) / (1000 * 60 * 60));
    if (hoursDiff < 24) return 'Posted today';
    if (hoursDiff < 48) return 'Active now';
    return null;
  };

  const renderRequestIcon = (type) => {
    if (type === 'buy') return <Home size={16} className="text-gray-700" />;
    if (type === 'rent') return <Building2 size={16} className="text-gray-700" />;
    return <Building size={16} className="text-gray-700" />;
  };

  const renderRequestTitle = (request) => {
    const label =
      request.request_type === 'buy'
        ? 'Purchase'
        : request.request_type === 'rent'
        ? 'Rental'
        : 'Property';
    const bedrooms = formatBedrooms(request.bedrooms);
    const bedroomLabel =
      bedrooms === 'Flexible'
        ? 'Flexible Bedrooms'
        : `${bedrooms} Bedroom${request.bedrooms > 1 ? 's' : ''}`;
    return `${label} • ${bedroomLabel}`;
  };

  return (
    <div className="min-h-screen bg-white">
     

     {/* ============================================================
    CLIENT REQUESTS — people looking for properties
    ============================================================ */}
<section className="border-t border-slate-100 bg-slate-50/50">
  <div className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
    {/* ============================================================
        Section header — reinforces "these are people, not listings"
        ============================================================ */}
    <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
          Real Requests
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          People who need a property
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          These are{' '}
          <strong className="font-semibold text-slate-900">
            not properties for sale
          </strong>
          . They are real requests from buyers and renters looking for a home.
          Tap any request to answer it.
        </p>
      </div>
      <Link
        href="/request"
        className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 sm:self-auto"
      >
        Submit your request
        <ArrowRight size={15} />
      </Link>
    </header>

    {/* ============================================================
        States
        ============================================================ */}
    {loading ? (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-2xl border border-slate-100 bg-white"
          />
        ))}
      </div>
    ) : requests.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
        <p className="text-sm font-semibold text-slate-700">
          Nobody is looking right now
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Be the first to post what you need — agents will reach out.
        </p>
        <Link
          href="/request"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90"
        >
          Submit your request
          <ArrowRight size={15} />
        </Link>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {requests.map((request) => {
          const urgencyBadge = getUrgencyBadge(request.created_at);
          const isBuy = request.request_type === 'buy';
          const bedrooms = formatBedrooms(request.bedrooms);
          const propertyType =
            request.property_type?.replace('_', ' ') || 'property';

          /* Headline written as a sentence about a person */
          const headline =
            bedrooms === 'Flexible'
              ? `Looking for a ${propertyType}`
              : `Looking for a ${bedrooms}-bedroom ${propertyType}`;

          /* Location written as "in <place>" */
          const locationText = formatLocation(
            request.location,
            request.area,
            request.parish
          );

          /* Optional first name if the API returns it */
          const firstName = request.client_name
            ? String(request.client_name).trim().split(' ')[0]
            : null;

          return (
            <Link
              key={`${request.type}-${request.id}`}
              href="/request"
              aria-label={`${firstName || 'Someone'} is looking for a property. Tap to answer.`}
              className="group block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 group-hover:-translate-y-1 group-hover:border-accent/40">
                {/* ============================================================
                    TOP — Person + "Looking for" tag
                    ============================================================ */}
                <div className="flex items-center gap-3">
                  {/* Avatar circle — reads as a person, not a property */}
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                      isBuy ? 'bg-blue-500' : 'bg-violet-500'
                    }`}
                    aria-hidden="true"
                  >
                    {firstName ? firstName.slice(0, 1).toUpperCase() : 'DLtd'}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {firstName || 'A verified client'}
                    </p>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      {isBuy ? 'Buyer' : 'Renter'}
                    </p>
                  </div>

                  {urgencyBadge && (
                    <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      {urgencyBadge}
                    </span>
                  )}
                </div>

                {/* ============================================================
                    HEADLINE — "Looking for a 3-bedroom house"
                    ============================================================ */}
                <h3 className="mt-4 text-base font-bold leading-snug text-slate-900">
                  {headline}
                </h3>

                {/* Location sentence */}
                <p className="mt-1.5 flex items-start gap-1.5 text-sm leading-snug text-slate-600">
                  <MapPin
                    size={14}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />
                  <span className="line-clamp-2">in {locationText}</span>
                </p>

                {/* ============================================================
                    BUDGET — labeled as "Their budget" (possessive)
                    ============================================================ */}
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Their budget
                  </p>
                  <p className="mt-0.5 truncate text-sm font-bold text-slate-900">
                    {formatBudget(request.budget_min, request.budget_max)}
                  </p>
                </div>

               
              </article>
            </Link>
          );
        })}
      </div>
    )}

    {/* Footer CTA */}
    <div className="mt-10 flex justify-center">
      <Link
        href="/request"
        className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
      >
        Post what you are looking for
        <ArrowRight
          size={15}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  </div>
</section>

{/* ============================================================
    AVAILABLE PROPERTIES
    ============================================================ */}
{!loadingFeatured && featuredProperties.length > 0 && (
  <section className="border-b border-slate-100 bg-white">
    <div className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      {/* Section header */}
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Available Properties
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Fresh listings across Jamaica
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            A quick look at what&apos;s new. Browse the full catalogue on our
            listings page.
          </p>
        </div>
        <Link
          href="/listing"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 sm:self-auto"
        >
          View all properties
          <ArrowRight size={15} />
        </Link>
      </header>

      {/* Grid — no fixed heights, cards size naturally */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
        {featuredProperties.map((prop, idx) => (
          <Suspense
            key={prop.id}
            fallback={
              <div className="h-72 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
            }
          >
            <PropertyCard property={prop} index={idx} />
          </Suspense>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="mt-10 flex justify-center">
        <Link
          href="/listing"
          className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
        >
          See more properties
          <ArrowRight
            size={15}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </div>
  </section>
)}

      <RequestAgentPopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        prefilledData={{ requestType: 'agent-inquiry' }}
      />
    </div>
  );
}