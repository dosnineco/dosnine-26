import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  useUser,
  UserButton,
  SignInButton,
  SignUpButton,
} from '@clerk/clerk-react';
import {
  Menu,
  X,
  Home,
  Building2,
  Search,
  User,
  LogIn,
  LayoutDashboard,
} from 'lucide-react';

/* Routes where the header should be transparent over a dark hero */
const TRANSPARENT_HEADER_ROUTES = ['/'];

export default function Header() {
  const router = useRouter();
  const { isSignedIn, user, isLoaded } = useUser();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const isTransparentEligible = TRANSPARENT_HEADER_ROUTES.includes(
    router.pathname
  );
  const isTransparent = isTransparentEligible && !scrolled && !mobileOpen;

  /* ----------------------------------------------------------
   * Scroll listener
   * ---------------------------------------------------------- */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Close the mobile menu on navigation */
  useEffect(() => {
    setMobileOpen(false);
  }, [router.pathname]);

  /* Lock body scroll while the drawer is open */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  /* ----------------------------------------------------------
   * Admin role check
   * ---------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    const checkAdmin = async () => {
      if (!isLoaded || !isSignedIn || !user) {
        if (!cancelled) setIsAdmin(false);
        return;
      }

      try {
        const response = await fetch('/api/user/profile', {
          credentials: 'include',
        });
        if (!response.ok) {
          if (!cancelled) setIsAdmin(false);
          return;
        }
        const profile = await response.json();
        if (!cancelled) {
          setIsAdmin(profile?.role === 'admin');
        }
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    };

    checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user?.id]);

  const navItems = [
    { href: '/listing', label: 'Properties', icon: Building2 },
    { href: '/request', label: 'Requests', icon: Search },
    { href: '/agent/signup', label: 'Become an Agent', icon: Home },
    { href: '/advertise', label: 'Advertise', icon: User },
  ];

  /* ----------------------------------------------------------
   * Style tokens
   * ---------------------------------------------------------- */
  const shellClasses = isTransparent
    ? 'bg-transparent'
    : 'bg-white border-b border-gray-100';

  const navLinkClasses = isTransparent
    ? 'text-white/90 hover:text-white hover:bg-white/10'
    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50';

  const logoTextClasses = isTransparent ? 'text-white' : 'text-gray-900';
  const logoSubClasses = isTransparent ? 'text-white/70' : 'text-gray-500';

  const menuButtonClasses = isTransparent
    ? 'bg-white/20 text-white ring-1 ring-white/40 backdrop-blur-sm hover:bg-white/30'
    : 'bg-gray-100 text-gray-900 hover:bg-gray-200';

  const adminLinkClasses = isTransparent
    ? 'bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-sm hover:bg-white/25'
    : 'bg-accent/10 text-accent hover:bg-accent/15';

  const signInButtonClasses = isTransparent
    ? 'text-white/90 hover:bg-white/10 hover:text-white'
    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900';

  /* ----------------------------------------------------------
   * Clerk UserButton appearance
   * ---------------------------------------------------------- */
  const userButtonAppearance = {
    elements: {
      avatarBox: isTransparent
        ? 'h-9 w-9 ring-2 ring-white/60 ring-offset-0'
        : 'h-9 w-9 ring-2 ring-gray-200 ring-offset-0',
      userButtonPopoverCard: 'rounded-xl border border-slate-200 shadow-none',
      userButtonPopoverActionButton:
        'text-slate-700 hover:bg-slate-100 rounded-lg',
      userButtonPopoverFooter: 'hidden',
    },
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${shellClasses}`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* ---------- Logo ---------- */}
          <Link
            href="/"
            className="flex items-baseline gap-2 transition-opacity hover:opacity-90"
          >
            <span className={`text-lg font-bold tracking-tight ${logoTextClasses}`}>
              Dosnine
            </span>
            <span
              className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${logoSubClasses}`}
            >
              Limited
            </span>
          </Link>

          {/* ---------- Desktop nav ---------- */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${navLinkClasses}`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* ---------- Desktop auth ---------- */}
          <div className="hidden items-center gap-2 lg:flex">
            {isSignedIn ? (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${adminLinkClasses}`}
                    title="Admin dashboard"
                  >
                    Admin
                  </Link>
                )}

                <Link
                  href="/dashboard"
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${navLinkClasses}`}
                >
                  <LayoutDashboard size={14} />
                  Dashboard
                </Link>

                <div className="ml-1">
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={userButtonAppearance}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Sign in — opens Clerk modal */}
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${signInButtonClasses}`}
                  >
                    <LogIn size={14} />
                    Sign in
                  </button>
                </SignInButton>

                {/* Sign up — opens Clerk modal */}
                <SignUpButton mode="modal">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent/90"
                  >
                    Get started
                  </button>
                </SignUpButton>
              </>
            )}
          </div>

          {/* ---------- Mobile menu toggle ---------- */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition lg:hidden ${menuButtonClasses}`}
          >
            {mobileOpen ? (
              <X size={22} strokeWidth={2.5} />
            ) : (
              <Menu size={22} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </header>

      {/* ---------- Mobile drawer overlay ---------- */}
      <div
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-30 bg-slate-900/50 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!mobileOpen}
      />

      {/* ---------- Mobile drawer ---------- */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 flex w-72 max-w-[85vw] flex-col border-l border-slate-200 bg-white transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Menu
          </span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Signed-in account card */}
        {isSignedIn && (
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-3">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: 'h-11 w-11 ring-2 ring-white ring-offset-0',
                    userButtonPopoverCard:
                      'rounded-xl border border-slate-200 shadow-none',
                    userButtonPopoverActionButton:
                      'text-slate-700 hover:bg-slate-100 rounded-lg',
                    userButtonPopoverFooter: 'hidden',
                  },
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  Your account
                </p>
                <p className="truncate text-xs text-slate-500">
                  Tap the avatar to manage
                </p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  <Icon size={16} className="shrink-0 text-slate-400" />
                  <span className="flex-1 truncate">{label}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-slate-100 pt-4">
            {isSignedIn ? (
              <ul className="space-y-1">
                {isAdmin && (
                  <li>
                    <Link
                      href="/admin"
                      className="flex items-center gap-3 rounded-lg bg-accent/10 px-3 py-3 text-sm font-semibold text-accent transition hover:bg-accent/15"
                    >
                      Admin dashboard
                    </Link>
                  </li>
                )}

                <li>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    <LayoutDashboard size={16} className="text-slate-400" />
                    Go to dashboard
                  </Link>
                </li>
              </ul>
            ) : (
              <div className="space-y-2 px-1">
                {/* Sign in — opens Clerk modal */}
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <LogIn size={14} />
                    Sign in
                  </button>
                </SignInButton>

                {/* Sign up — opens Clerk modal */}
                <SignUpButton mode="modal">
                  <button
                    type="button"
                    className="flex w-full items-center justify-center rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/90"
                  >
                    Get started
                  </button>
                </SignUpButton>
              </div>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}