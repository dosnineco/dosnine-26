import Head from 'next/head';
import Link from 'next/link';
import { SignUpButton } from '@clerk/nextjs';
import {
  ArrowRight,
  Building2,
  Check,
  Home,
  Megaphone,
  Search,
  Sparkles,
} from 'lucide-react';
import PropertyRequestsMarketplace from '../components/PropertyRequestsMarketplace';
import VisitorEmailPopup from '../components/VisitorEmailPopup';

const HERO_IMAGE =
  'https://etikxypnxjsonefwnzkr.supabase.co/storage/v1/object/public/property-images/hero.jpg';

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
        <section className="relative isolate flex min-h-[620px] items-center overflow-hidden bg-slate-950 pt-16 sm:min-h-[680px]">
          <div
            className="absolute inset-0 -z-10 bg-cover bg-center"
            style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/35"
            aria-hidden="true"
          />
          <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
                Your next property move starts here.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
                Advertise a property, post what you’re looking for, discover
                off-market opportunities, or grow your real estate business—all
                in one place.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <SignUpButton mode="redirect" redirectUrl="/verify">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent/90"
                  >
                    Get started
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                </SignUpButton>
                <Link
                  href="/listing"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                >
                  Explore properties
                  <Search size={17} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

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

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 rounded-3xl bg-slate-900 p-7 text-white sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-200">
                For Jamaican businesses
              </p>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                Put your business in front of property seekers.
              </h2>
              <p className="mt-3 leading-7 text-white/70">
                Advertisers can launch campaigns across Dosnine. Campaign
                placements start at J$17,999 for 14 days.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <SignUpButton mode="redirect" redirectUrl="/verify?role=advertiser">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-gray-100"
                >
                  Create advertiser account
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </SignUpButton>
              <Link
                href="/advertise"
                className="inline-flex items-center justify-center rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                View ad options
              </Link>
            </div>
          </div>
        </section>

        <PropertyRequestsMarketplace />
      </main>
    </>
  );
}
