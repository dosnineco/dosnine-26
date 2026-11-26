import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SignUpButton } from '@clerk/nextjs';
import {
  ArrowRight,
  Building2,
  Check,
  Clock3,
  Home,
  Megaphone,
  Search,
} from 'lucide-react';
import PropertyRequestsMarketplace from '../components/PropertyRequestsMarketplace';
import VisitorEmailPopup from '../components/VisitorEmailPopup';

const HERO_IMAGE =
  'https://etikxypnxjsonefwnzkr.supabase.co/storage/v1/object/public/property-images/hero.jpg';

function formatGiveawayCountdown(value, now) {
  const distance = Math.max(0, new Date(value).getTime() - now);
  const days = Math.floor(distance / 86_400_000);
  const hours = Math.floor((distance % 86_400_000) / 3_600_000);
  const minutes = Math.floor((distance % 3_600_000) / 60_000);
  const seconds = Math.floor((distance % 60_000) / 1_000);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

const accountTypes = [
  {
    icon: Home,
    title: 'Clients',
    heading: 'Find or advertise a home',
    description:
      'Find a home, post what you need, or put your property in front of people searching.',
    features: ['Browse homes and rentals', 'Post property requests', 'Advertise your property'],
    href: '/verify?role=homeowner',
    action: 'Start a client account',
  },
  {
    icon: Building2,
    title: 'Real estate agents',
    heading: 'Grow your real estate business',
    description:
      'Build your presence, showcase listings, and connect with active property seekers.',
    features: ['Create an agent profile', 'Showcase property listings', 'Connect with buyers and renters'],
    href: '/verify?role=agent',
    action: 'Join as an agent',
  },
  {
    icon: Megaphone,
    title: 'Advertisers',
    heading: 'Reach property seekers',
    description:
      'Put your property-related business in front of a Jamaica-focused audience.',
    features: ['Promote your business', 'Choose an ad campaign', 'Receive customer enquiries'],
    href: '/verify?role=advertiser',
    action: 'Start advertising',
  },
];

const proFeatures = [
  'Post more than one property',
  'Get one free 30-day property visibility boost',
  'Access off-market properties',
  'Get a chance to win an Airbnb stay',
];

export default function PropertyRequestsPage() {
  const [giveaway, setGiveaway] = useState(null);
  const [giveawayNow, setGiveawayNow] = useState(null);
  const [giveawaySlide, setGiveawaySlide] = useState(0);
  const [heroSlide, setHeroSlide] = useState(0);

  useEffect(() => {
    let active = true;
    fetch('/api/giveaway')
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Unable to load giveaway.');
        if (active) {
          setGiveaway(payload.campaign || null);
          setHeroSlide(payload.campaign ? 0 : 1);
        }
      })
      .catch((error) => console.error('Unable to load homepage giveaway:', error));

    return () => {
      active = false;
    };
  }, []);

  const giveawayImages = giveaway?.image_urls?.length ? giveaway.image_urls : [];
  const showingGiveaway = Boolean(giveaway) && heroSlide === 0;

  useEffect(() => {
    if (!giveaway?.draw_at) return undefined;
    const updateTime = () => setGiveawayNow(Date.now());
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [giveaway?.draw_at]);

  useEffect(() => {
    if (!giveaway) return undefined;
    const timer = setInterval(() => {
      setHeroSlide((current) => (current === 0 ? 1 : 0));
    }, 8000);
    return () => clearInterval(timer);
  }, [giveaway]);

  return (
    <>
      <Head>
        <title>Dosnine | Jamaica’s Property Marketplace</title>
        <meta
          name="description"
          content="Advertise your property, post or browse property requests, explore off-market opportunities, and connect with Jamaica’s real estate community on Dosnine."
        />
        <meta
          property="og:title"
          content="Dosnine | Jamaica’s Property Marketplace"
        />
        <meta
          property="og:description"
          content="One platform to advertise property, discover off-market opportunities, and connect with clients, agents, and advertisers across Jamaica."
        />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:type" content="website" />
        <meta
          name="keywords"
          content="property Jamaica, advertise property Jamaica, off-market property, real estate agents Jamaica, property marketplace"
        />
        <link rel="canonical" href="https://dosnine.com/" />
      </Head>

      <VisitorEmailPopup />

      <main>
    
<section
  className="relative isolate min-h-[620px] overflow-hidden bg-[#171916] sm:min-h-[700px] lg:min-h-[760px]"
  aria-roledescription="carousel"
  aria-label="Dosnine homepage promotions"
>
  {/* Full-size hero image */}
  <div
    className="absolute inset-0"
    style={{
      backgroundImage: `url('${showingGiveaway
        ? giveawayImages[giveawaySlide]
        : HERO_IMAGE}')`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
    role="img"
    aria-label={
      showingGiveaway
        ? "Giveaway prize"
        : "Properties in Jamaica"
    }
  />

  {/* Image overlays */}
  <div className="absolute inset-0 bg-black/35" />
  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

  {/* Content */}
  <div className="relative z-10 mx-auto flex min-h-[620px] max-w-[1600px] flex-col justify-center px-6 py-24 sm:min-h-[700px] sm:px-12 lg:min-h-[760px] lg:px-20">

    <div className="max-w-3xl text-white">

      <div className="mb-7 flex items-center gap-3">
        <span className="h-px w-10 bg-[#D8B77A]" />
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#E8CB98]">
          {showingGiveaway
            ? "Exclusive Dosnine Rewards"
            : "Discover Jamaica with Dosnine"}
        </p>
      </div>

      {showingGiveaway ? (
        <>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
            {giveaway.title}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/90 sm:text-xl">
            {giveaway.prize_description}
          </p>

          <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
            Join Dosnine Pro for a chance to win. An active Pro plan is required to qualify.
          </p>

          {giveawayNow !== null && (
            <div className="mt-7 inline-flex items-center gap-4 border border-white/30 bg-black/25 px-5 py-4 backdrop-blur-md">
              <Clock3 size={22} className="text-[#E8CB98]" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">
                  Time until the draw
                </p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
                  {formatGiveawayCountdown(
                    giveaway.draw_at,
                    giveawayNow
                  )}
                </p>
              </div>
            </div>
          )}

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/premium-payment"
              className="inline-flex items-center justify-center gap-3 bg-[#D8B77A] px-7 py-4 text-sm font-semibold text-[#171916] transition hover:bg-[#E8CB98]"
            >
              Become a Pro to enter
              <ArrowRight size={17} />
            </Link>

            <Link
              href="/profile#premium-payment"
              className="inline-flex items-center justify-center border border-white/60 bg-white/10 px-7 py-4 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white hover:text-black"
            >
              Already a member? Upgrade
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.08] tracking-tight sm:text-6xl lg:text-8xl">
            Find your place.
            <br />
            <span className="font-light italic text-[#E8CB98]">
              Make your move.
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-8 text-white/85 sm:text-lg">
            Discover properties, connect with opportunities and
            take your next step in Jamaica's real estate market.
            Everything starts with Dosnine.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <SignUpButton
              mode="redirect"
              redirectUrl="/verify"
            >
              <button
                type="button"
                className="inline-flex items-center justify-center gap-3 bg-[#D8B77A] px-8 py-4 text-sm font-semibold text-[#171916] transition hover:bg-[#E8CB98]"
              >
                Get started
                <ArrowRight size={18} />
              </button>
            </SignUpButton>

            <Link
              href="/listing"
              className="inline-flex items-center justify-center gap-3 border border-white/70 bg-white/10 px-8 py-4 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white hover:text-black"
            >
              Explore properties
              <Search size={18} />
            </Link>
          </div>
        </>
      )}
    </div>

    {/* Image navigation */}
    {showingGiveaway && giveawayImages.length > 1 && (
      <div className="absolute bottom-8 right-6 flex items-center gap-5 text-white sm:right-12 lg:right-20">

        <span className="text-xs font-medium tabular-nums text-white/75">
          {String(giveawaySlide + 1).padStart(2, "0")} /{" "}
          {String(giveawayImages.length).padStart(2, "0")}
        </span>

        <button
          type="button"
          onClick={() =>
            setGiveawaySlide(
              (current) =>
                (current - 1 + giveawayImages.length) %
                giveawayImages.length
            )
          }
          aria-label="Previous image"
          className="flex h-11 w-11 items-center justify-center border border-white/50 transition hover:bg-white hover:text-black"
        >
          <ArrowLeft size={18} />
        </button>

        <button
          type="button"
          onClick={() =>
            setGiveawaySlide(
              (current) =>
                (current + 1) % giveawayImages.length
            )
          }
          aria-label="Next image"
          className="flex h-11 w-11 items-center justify-center border border-white/50 transition hover:bg-white hover:text-black"
        >
          <ArrowRight size={18} />
        </button>
      </div>
    )}

    {/* Bottom brand signature */}
    {!showingGiveaway && (
      <div className="absolute bottom-9 left-6 flex items-center gap-3 text-white/65 sm:left-12 lg:left-20">
        <span className="h-px w-8 bg-[#D8B77A]" />
        <span className="text-[10px] font-medium uppercase tracking-[0.25em]">
          Your property journey starts here
        </span>
      </div>
    )}
  </div>
</section>


        <PropertyRequestsMarketplace />


        <section
          aria-labelledby="account-types-heading"
          className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-accent">
                Choose your path
              </p>
              <h2
                id="account-types-heading"
                className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
              >
                Make Dosnine work for you
              </h2>
              <p className="mt-3 max-w-xl leading-7 text-gray-600">
                Choose the account that fits your goals. Create an account and
                get started right away.
              </p>
            </div>

            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {accountTypes.map((account) => {
                const Icon = account.icon;
                return (
                  <article
                    key={account.title}
                    className="flex flex-col rounded-xl bg-white p-6 sm:p-7"
                  >
                    <div className="flex items-center gap-3 text-accent">
                      <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                      <p className="text-xs font-semibold uppercase tracking-wider">
                        {account.title}
                      </p>
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-gray-900">
                      {account.heading}
                    </h3>
                    <p className="mt-2 min-h-[72px] text-sm leading-6 text-gray-600">
                      {account.description}
                    </p>
                    <ul className="mt-5 space-y-2.5">
                      {account.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2.5 text-sm text-gray-700"
                        >
                          <Check
                            size={16}
                            className="mt-0.5 shrink-0 text-accent"
                            aria-hidden="true"
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <SignUpButton mode="redirect" redirectUrl={account.href}>
                      <button
                        type="button"
                        className="btn-primary btn-lg mt-7 w-full rounded-lg"
                      >
                        {account.action}
                        <ArrowRight size={16} aria-hidden="true" />
                      </button>
                    </SignUpButton>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-gray-100 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">
                Make more moves with Pro
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                More visibility. More opportunity.
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-slate-600">
                Upgrade your regular or agent account for one month and get
                more ways to put your property journey in motion.
              </p>
              <ul className="mt-7 grid gap-4 sm:grid-cols-2">
                {proFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-700"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                      <Check size={13} aria-hidden="true" />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs leading-5 text-slate-500">
                Airbnb stay giveaway entry is subject to eligibility and
                campaign terms.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-7 sm:p-9">
              <p className="text-sm font-semibold text-slate-500">
                One-month Pro access
              </p>
              <p className="mt-3 flex items-baseline gap-2 text-slate-900">
                <span className="text-5xl font-bold tracking-tight">J$3,179</span>
                <span className="text-sm text-slate-500">/ month</span>
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Available for regular and agent accounts.
              </p>
              <div className="mt-6 space-y-3">
                <SignUpButton mode="redirect" redirectUrl="/verify">
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-accent/90"
                  >
                    Get started
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </SignUpButton>
                <Link
                  href="/profile#premium-payment"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-gray-200"
                >
                  Already have an account? Upgrade
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
