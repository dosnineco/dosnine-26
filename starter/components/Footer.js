import Link from 'next/link';
import {
  Mail,
  Phone,
  MapPin,
  ArrowUpRight,
  Shield,
  TrendingUp,
} from 'lucide-react';

const USEFUL_LINKS = [
  { href: '/landlord/dashboard', label: 'Post Property' },
  { href: '/agent/signup', label: 'Register as an Agent' },
  { href: '/market', label: 'Market Analytics' },
  { href: '/logo', label: 'Dosnine HTV' },
];

const RESOURCE_LINKS = [
  { href: '/about', label: 'About Us' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms-of-service', label: 'Terms of Service' },
  { href: '/refund-policy', label: 'Refund Policy' },
];

const INVEST_LINKS = [
  { href: '/invest', label: 'Invest in Dosnine' },
  { href: '/invest#how', label: 'How it works' },
  { href: '/invest#inquiry', label: 'Show interest' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ============================================================
            Top — brand + columns
           ============================================================ */}
        <div className="grid gap-12 py-12 sm:py-16 lg:grid-cols-12 lg:gap-8">
          {/* Brand block */}
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <img
                src="/logos/dosnine_co_logo.png"
                alt="Dosnine Limited"
                className="h-14 w-auto"
              />
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-600">
              Jamaica&apos;s property discovery and rental marketplace — where
              buyers, renters, landlords, and agents connect directly.
            </p>

            {/* Contact chips */}
            <ul className="mt-6 space-y-3 text-sm">
              <li>
                <a
                  href="mailto:admin@dosnine.com"
                  className="group inline-flex items-center gap-2.5 text-slate-700 transition hover:text-accent"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 transition group-hover:bg-accent/10 group-hover:text-accent">
                    <Mail size={14} />
                  </span>
                  <span className="font-medium">admin@dosnine.com</span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+18763369045"
                  className="group inline-flex items-center gap-2.5 text-slate-700 transition hover:text-accent"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 transition group-hover:bg-accent/10 group-hover:text-accent">
                    <Phone size={14} />
                  </span>
                  <span className="font-medium">+1 (876) 336-9045</span>
                </a>
              </li>
              <li className="inline-flex items-center gap-2.5 text-slate-700">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500">
                  <MapPin size={14} />
                </span>
                <span className="font-medium">Kingston, Jamaica</span>
              </li>
            </ul>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8 lg:gap-10">
            <FooterColumn title="Marketplace" links={USEFUL_LINKS} />
            <FooterColumn title="Company" links={RESOURCE_LINKS} />

            {/* Invest column — visually distinct */}
            <div className="col-span-2 sm:col-span-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Investors
              </h3>
              <ul className="mt-4 space-y-3">
                {INVEST_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 transition hover:text-accent"
                    >
                      <span>{label}</span>
                      <ArrowUpRight
                        size={13}
                        className="opacity-0 transition group-hover:opacity-100"
                      />
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Mini invest card */}
              <div className="mt-6 rounded-2xl border border-accent/20 bg-accent/5 p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-accent" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                    2–6% Annual
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Fund property purchases and rental construction. Secured and
                  reviewed by counsel.
                </p>
                <Link
                  href="/invest"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition hover:text-accent/80"
                >
                  Show interest
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            Disclaimer
           ============================================================ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Shield size={14} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Disclaimer
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Dosnine Ltd (dosnine.com) is an independent property listing and
                discovery platform. Dosnine Ltd does not act as a real estate
                agent, broker, intermediary, negotiator, or representative for
                buyers, sellers, landlords, tenants, or agents. By using this
                platform, users acknowledge that Dosnine Ltd&apos;s role is
                limited to providing visibility and facilitating direct
                connections only.
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================
            Bottom bar
           ============================================================ */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 py-6 text-xs text-slate-500 sm:flex-row">
          <p>
            &copy; {year} Dosnine Limited. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy-policy"
              className="transition hover:text-accent"
            >
              Privacy
            </Link>
            <span className="h-3 w-px bg-slate-300" />
            <Link
              href="/terms-of-service"
              className="transition hover:text-accent"
            >
              Terms
            </Link>
            <span className="h-3 w-px bg-slate-300" />
            <Link href="/about" className="transition hover:text-accent">
              About
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
 * Column helper
 * ============================================================ */
function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </h3>
      <ul className="mt-4 space-y-3">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="text-sm font-medium text-slate-700 transition hover:text-accent"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}