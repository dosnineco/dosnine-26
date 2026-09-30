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
    HERO — full viewport with soft bottom blend
    ============================================================ */}
<section className="relative isolate flex min-h-screen items-center overflow-hidden">
  {/* Background image */}
  <div
    className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
    style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
    aria-hidden="true"
  />

  {/* Layered overlay — softer, more even */}
  <div
    className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/45 to-black/60"
    aria-hidden="true"
  />

  {/* Bottom blend — tall, multi-stop gradient that fades smoothly
      into the white marketplace section below */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-white/40 to-white"
  />

  <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
    <div className="mx-auto max-w-3xl text-center">
      {/* Headline */}
      <h1 className="text-5xl font-bold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
        What clients are
        <br className="hidden sm:block" /> looking for.
      </h1>

      {/* Subheadline */}
      <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">
        Real buyers and renters searching for property across Jamaica.
        Browse their requests, connect directly, and close deals faster.
      </p>

      {/* Primary CTAs */}
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
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

      {/* Secondary links */}
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
    </div>
  </div>
</section>

      {/* ============================================================
          MARKETPLACE — properties + requests
          ============================================================ */}
      <PropertyRequestsMarketplace />

    </>
  );
}