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

// Fewer cards on the page — the rest live on /listing and /request
const FEATURED_LIMIT = 8;
const REQUEST_LIMIT = 8;

const QUICK_LINKS = [
  { href: '/listing', label: 'View Properties' },
  { href: '/request', label: 'Submit a Request' },
  { href: '/agent/signup', label: 'Sign up as agent' },
  { href: '/advertise', label: 'Advertise with Us' },
];

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
      {/* Hero */}
      <section className="container mx-auto px-4 pt-20 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            What Clients Are Looking For
          </h1>
          <p className="mt-5 text-base leading-relaxed text-gray-600">
            Browse the latest property needs shared by clients across Jamaica.
            Find the right match and connect with clients who are ready to move.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {QUICK_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-900 hover:bg-gray-900 hover:text-white"
              >
                {label}
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Available Properties */}
      {!loadingFeatured && featuredProperties.length > 0 && (
        <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Available Properties
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                A quick look at fresh listings. Browse the full catalogue on our
                listings page.
              </p>
            </div>
            <Link
              href="/listing"
              className="inline-flex items-center gap-2 self-start rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 sm:self-auto"
            >
              View all properties
              <ArrowRight size={16} />
            </Link>
          </header>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featuredProperties.map((prop, idx) => (
              <Link
                key={prop.id}
                href="/listing"
                className="group block h-[22rem] rounded-2xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                aria-label="Browse more properties on the listings page"
              >
                <div className="h-full w-full transition-transform duration-200 group-hover:-translate-y-1">
                  <Suspense
                    fallback={
                      <div className="h-full w-full rounded-xl bg-gray-100" />
                    }
                  >
                    <PropertyCard property={prop} index={idx} />
                  </Suspense>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/listing"
              className="group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-900 hover:bg-gray-900 hover:text-white"
            >
              See more properties
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </section>
      )}

      {/* Client Requests */}
      <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Tell Us Your Needs Too
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Live demand from buyers and renters across the island. Submit your
              own request to reach agents directly.
            </p>
          </div>
          <Link
            href="/request"
            className="inline-flex items-center gap-2 self-start rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 sm:self-auto"
          >
            Submit a request
            <ArrowRight size={16} />
          </Link>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl border border-gray-100 bg-gray-50"
              />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
            <p className="text-gray-600">No requests available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {requests.map((request) => {
              const urgencyBadge = getUrgencyBadge(request.created_at);
              return (
                <Link
                  key={`${request.type}-${request.id}`}
                  href="/request"
                  className="group block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  aria-label="Go to the request page to submit your own property request"
                >
                  <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition group-hover:-translate-y-1 group-hover:border-gray-300 group-hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-base font-semibold leading-snug text-gray-900">
                        {renderRequestIcon(request.request_type)}
                        <span>{renderRequestTitle(request)}</span>
                      </h3>
                      {urgencyBadge && (
                        <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                          {urgencyBadge}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                      <CheckCircle size={12} className="text-green-600" />
                      Verified{' '}
                      {request.request_type === 'buy' ? 'buyer' : 'renter'}
                    </p>

                    <div className="mt-5 flex items-start gap-3">
                      <MapPin
                        className="mt-0.5 flex-shrink-0 text-red-500"
                        size={16}
                      />
                      <p className="text-sm font-medium leading-relaxed text-gray-700">
                        {formatLocation(
                          request.location,
                          request.area,
                          request.parish
                        )}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-1 items-start gap-3">
                      <DollarSign
                        className="mt-0.5 flex-shrink-0 text-gray-600"
                        size={16}
                      />
                      <p className="text-sm font-medium text-gray-700">
                        {formatBudget(request.budget_min, request.budget_max)}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-accent">
                      Submit your request
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <Link
            href="/request"
            className="group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-900 hover:bg-gray-900 hover:text-white"
          >
            Request a property
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </section>

      <RequestAgentPopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        prefilledData={{ requestType: 'agent-inquiry' }}
      />
    </div>
  );
}