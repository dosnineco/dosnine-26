import Link from 'next/link';
import {
  Mail,
  Phone,
  MapPin,
  Shield,
  ArrowUpRight,
} from 'lucide-react';

const MARKETPLACE_LINKS = [
  { href: '/landlord/dashboard', label: 'Post Property' },
  { href: '/agent/signup', label: 'Register as an Agent' },
  { href: '/market', label: 'Market Analytics' },
  { href: '/logo', label: 'Dosnine HTV' },
];

const LEGAL_LINKS = [
  { href: '/about', label: 'About Us' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms-of-service', label: 'Terms of Service' },
  { href: '/refund-policy', label: 'Refund Policy' },
];

const CONTACT = [
  {
    href: 'mailto:admin@dosnine.com',
    label: 'admin@dosnine.com',
    icon: Mail,
    sub: 'Email us',
  },
  {
    href: 'tel:+18763369045',
    label: '+1 (876) 336-9045',
    icon: Phone,
    sub: 'Call or WhatsApp',
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50">
      {/* Thin accent line at the top */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ============================================================
            MAIN GRID
           ============================================================ */}
        <div className="grid gap-12 py-14 sm:py-16 lg:grid-cols-12 lg:gap-10">
          {/* ---------- Brand (5 cols) ---------- */}
          <div className="lg:col-span-5">
            <Link
              href="/"
              className="inline-flex items-baseline gap-2 transition-opacity hover:opacity-90"
            >
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Dosnine
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Limited
              </span>
            </Link>

            <p className="mt-5 max-w-md text-sm leading-6 text-slate-600">
              Jamaica&apos;s property discovery and rental marketplace — where
              buyers, renters, landlords, and agents connect directly.
            </p>

            {/* Trust pill */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Live across Jamaica
              </span>
            </div>
          </div>

          {/* ---------- Marketplace (3 cols) ---------- */}
          <div className="lg:col-span-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Marketplace
            </h3>
            <ul className="mt-5 space-y-3">
              {MARKETPLACE_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 transition hover:text-accent"
                  >
                    {label}
                    <ArrowUpRight
                      size={12}
                      className="opacity-0 transition group-hover:opacity-100"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ---------- Contact (4 cols) ---------- */}
          <div className="lg:col-span-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Get in touch
            </h3>
            <ul className="mt-5 space-y-3">
              {CONTACT.map(({ href, label, icon: Icon, sub }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-accent/40 hover:bg-accent/5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-accent/10 group-hover:text-accent">
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {sub}
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-semibold text-slate-900">
                        {label}
                      </span>
                    </span>
                  </a>
                </li>
              ))}

              {/* Location — static, no link */}
              <li className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <MapPin size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Located in
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-semibold text-slate-900">
                    Kingston, Jamaica
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* ============================================================
            DISCLAIMER — lighter treatment
           ============================================================ */}
        <div className="border-t border-slate-200 py-6">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
              <Shield size={12} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Disclaimer
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Dosnine Ltd (dosnine.com) is an independent property listing
                and discovery platform. We do not act as a real estate agent,
                broker, intermediary, negotiator, or representative for any
                party. Our role is limited to providing visibility and
                facilitating direct connections only.
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================
            BOTTOM BAR
           ============================================================ */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 py-6 text-xs text-slate-500 sm:flex-row">
          <p className="order-2 sm:order-1">
            &copy; {year} Dosnine Limited. All rights reserved.
          </p>

          <nav
            aria-label="Legal"
            className="order-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:order-2"
          >
            {LEGAL_LINKS.map(({ href, label }, idx) => (
              <span key={href} className="inline-flex items-center gap-4">
                <Link
                  href={href}
                  className="transition hover:text-accent"
                >
                  {label}
                </Link>
                {idx < LEGAL_LINKS.length - 1 && (
                  <span
                    className="hidden h-3 w-px bg-slate-300 sm:block"
                    aria-hidden="true"
                  />
                )}
              </span>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}