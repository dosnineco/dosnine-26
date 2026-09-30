import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ShieldCheck,
  TrendingUp,
  Clock,
  Building2,
  Search,
  Home,
  Users,
  Sparkles,
} from 'lucide-react';
import PropertyRequestsMarketplace from '../components/PropertyRequestsMarketplace';
import VisitorEmailPopup from '../components/VisitorEmailPopup';

const HERO_IMAGE =
  'https://etikxypnxjsonefwnzkr.supabase.co/storage/v1/object/public/property-images/hero.jpg';

const HERO_STATS = [
  { value: '500+', label: 'Active requests', icon: Search },
  { value: '200+', label: 'Verified agents', icon: Users },
  { value: '57K', label: 'Monthly visitors', icon: TrendingUp },
];

const INVEST_STATS = [
  { value: '2–6%', label: 'Annual returns', icon: TrendingUp },
  { value: 'Annual', label: 'Payout schedule', icon: Clock },
  { value: 'Secured', label: 'By property title', icon: ShieldCheck },
  { value: '48 hrs', label: 'Response time', icon: Building2 },
];

const INVEST_TRUST = [
  'Reviewed by independent legal counsel',
  'Secured against property title',
  'Transparent quarterly reporting',
  'Contracted in writing before funds deploy',
];

export default function PropertyRequestsPage() {
  return (
    <>
      <Head>
        <title>
          Live Property Requests from Buyers & Renters | Dosnine Jamaica
        </title>
        <meta
          name="description"
          content="Real buyers and renters looking for properties in Jamaica right now. Claim a request to get their contact details. Connect with verified property seekers instantly."
        />
        <meta
          property="og:title"
          content="Live Property Requests from Buyers & Renters - Dosnine"
        />
        <meta
          property="og:description"
          content="These are real people looking for properties. Claim a request to get their contact details. Live property marketplace in Jamaica."
        />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:type" content="website" />
        <meta
          name="keywords"
          content="property requests Jamaica, buyers looking for property, renters looking for property, property marketplace Jamaica, real estate leads Jamaica"
        />
        <link rel="canonical" href="https://dosnine.com/" />
      </Head>

      <VisitorEmailPopup />

      {/* ============================================================
          HERO
          ============================================================ */}
      <section className="relative isolate overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
          aria-hidden="true"
        />

        {/* Layered overlay — darker at edges, lighter in center */}
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/50 to-black/80"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            {/* Eyebrow badge */}
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live in Jamaica
            </span>

            {/* Headline */}
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              What clients are
              <br className="hidden sm:block" /> looking for.
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">
              Real buyers and renters searching for property across Jamaica.
              Browse their requests, connect directly, and close deals faster.
            </p>

            {/* Primary CTAs */}
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/listing"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-white/90 sm:w-auto"
              >
                Browse properties
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/request"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white hover:bg-white hover:text-slate-900 sm:w-auto"
              >
                Submit a request
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            {/* Secondary links — agents & advertisers */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-white/70">
              <Link
                href="/agent/signup"
                className="inline-flex items-center gap-1.5 transition hover:text-white"
              >
                <Home size={13} />
                Become an agent
              </Link>
              <span className="hidden h-3 w-px bg-white/20 sm:block" aria-hidden />
              <Link
                href="/advertise"
                className="inline-flex items-center gap-1.5 transition hover:text-white"
              >
                <Sparkles size={13} />
                Advertise with us
              </Link>
            </div>

            {/* Trust stats */}
            <div className="mt-12 grid grid-cols-3 gap-4 border-t border-white/15 pt-8 sm:gap-8">
              {HERO_STATS.map(({ value, label, icon: Icon }) => (
                <div key={label} className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Icon
                      size={14}
                      strokeWidth={1.75}
                      className="hidden text-white/60 sm:block"
                    />
                    <p className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">
                      {value}
                    </p>
                  </div>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60 sm:text-[11px]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade into white section below */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-white"
          aria-hidden="true"
        />
      </section>

      {/* ============================================================
          MARKETPLACE — properties + requests
          ============================================================ */}
      <PropertyRequestsMarketplace />

      {/* ============================================================
          INVEST CTA
          ============================================================ */}
      <section className="relative overflow-hidden bg-slate-900 py-20 text-white sm:py-28">
        {/* Accent glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 -top-40 h-[420px] w-[min(820px,100%)] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
        />

        {/* Subtle grid texture */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            <span className="h-px w-8 bg-accent" />
            Invest in Dosnine Limited
          </div>

          {/* Headline + supporting copy */}
          <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-12">
            <div className="lg:col-span-7">
              <h2 className="text-3xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Own a piece of
                <br className="hidden sm:block" /> Jamaica&apos;s{' '}
                <span className="text-accent">rental growth.</span>
              </h2>
            </div>
            <div className="lg:col-span-5 lg:pb-2">
              <p className="text-base leading-7 text-slate-300 sm:text-lg">
                Fund property purchases and rental construction with Dosnine
                Limited. Secured placements, returns from 2% to 6%, fully
                contracted and reviewed by independent counsel.
              </p>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] lg:grid-cols-4">
            {INVEST_STATS.map(({ value, label, icon: Icon }) => (
              <div
                key={label}
                className="border-b border-white/10 bg-slate-900/40 p-5 last:border-b-0 sm:p-6 lg:border-b-0 lg:border-r lg:last:border-r-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
                    {value}
                  </p>
                  <Icon
                    size={18}
                    strokeWidth={1.5}
                    className="shrink-0 text-accent"
                  />
                </div>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Trust checklist */}
          <ul className="mt-8 grid gap-2.5 sm:grid-cols-2">
            {INVEST_TRUST.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-slate-300"
              >
                <Check
                  size={15}
                  strokeWidth={2.5}
                  className="mt-0.5 shrink-0 text-accent"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {/* CTA row */}
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <Link
              href="/invest"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-accent/90"
            >
              Show my interest
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>

            <Link
              href="/invest#how"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-7 py-3.5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/5"
            >
              How it works
            </Link>

            <p className="text-xs text-slate-400 sm:ml-2">
              No obligation · 48-hour response · Confidential
            </p>
          </div>
        </div>
      </section>
    </>
  );
}