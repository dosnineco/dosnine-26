import Head from 'next/head';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import PropertyRequestsMarketplace from '../components/PropertyRequestsMarketplace';
import VisitorEmailPopup from '../components/VisitorEmailPopup';

const HERO_IMAGE =
  'https://etikxypnxjsonefwnzkr.supabase.co/storage/v1/object/public/property-images/hero.jpg';

const QUICK_LINKS = [
  { href: '/listing', label: 'View Properties' },
  { href: '/request', label: 'Submit a Request' },
  { href: '/agent/signup', label: 'Sign up as agent' },
  { href: '/advertise', label: 'Advertise with Us' },
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
          HERO — full-bleed image with dark overlay
          ============================================================ */}
      <section className="relative isolate overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
          aria-hidden="true"
        />

        {/* Dark gradient overlay for legibility */}
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/45 to-black/70"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
           

            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              What Clients Are Looking For
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">
              Browse the latest property needs shared by clients across Jamaica.
              Find the right match and connect with clients who are ready to move.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              {QUICK_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="group inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white hover:bg-white hover:text-gray-900"
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
        </div>

        {/* Bottom fade into the white page below */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-white"
          aria-hidden="true"
        />
      </section>

      <PropertyRequestsMarketplace />
    </>
  );
}