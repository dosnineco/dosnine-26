import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { UserProfile, useAuth, useUser } from '@clerk/nextjs';
import { ArrowLeft, CheckCircle2, Clock3, Home, LockKeyhole, Save, ShieldCheck } from 'lucide-react';
import BankTransferPaymentPanel from '@/components/BankTransferPaymentPanel';

function formatDate(value) {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not provided'
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function getCountdown(value, now) {
  const distance = Math.max(0, new Date(value).getTime() - now);
  const days = Math.floor(distance / 86_400_000);
  const hours = Math.floor((distance % 86_400_000) / 3_600_000);
  const minutes = Math.floor((distance % 3_600_000) / 60_000);
  const seconds = Math.floor((distance % 60_000) / 1_000);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-accent"
      />
    </label>
  );
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [premiumPrice, setPremiumPrice] = useState(3178.4);
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [properties, setProperties] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showClerkProfile, setShowClerkProfile] = useState(false);
  const [showReceiptPending, setShowReceiptPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const profileLink = profile?.account_type === 'agent'
    ? '/agent/dashboard'
    : profile?.account_type === 'advertiser'
      ? '/dashboard'
      : '/dashboard';
  const countdown = useMemo(
    () => profile?.giveaway?.draw_at ? getCountdown(profile.giveaway.draw_at, now) : '',
    [profile?.giveaway?.draw_at, now]
  );

  useEffect(() => {
    if (profile?.premiumPaymentReceipt?.status === 'pending') {
      setShowReceiptPending(true);
    }
  }, [profile?.premiumPaymentReceipt?.status]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.replace('/dashboard');
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/user/profile', { credentials: 'include' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Unable to load your profile.');
        setProfile(payload);
        setForm({ full_name: payload.full_name || '', phone: payload.phone || '' });

        if (payload.premium && payload.account_type === 'regular') {
          const offMarketResponse = await fetch('/api/properties/off-market', { credentials: 'include' });
          const offMarketPayload = await offMarketResponse.json();
          if (!offMarketResponse.ok) throw new Error(offMarketPayload?.error || 'Unable to load off-market properties.');
          setProperties(offMarketPayload.properties || []);
        }
      } catch (loadError) {
        setError(loadError.message || 'Unable to load your profile.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isLoaded, user, router]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('/api/site-settings/payment-prices')
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Unable to load payment prices.');
        setPremiumPrice(Number(payload?.prices?.premium_service_price) || 3178.4);
      })
      .catch((priceError) => {
        console.error('Unable to load premium price:', priceError);
      });
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to save profile changes.');
      setNotice('Your profile was updated.');
      const refreshed = await fetch('/api/user/profile', { credentials: 'include' });
      const refreshedPayload = await refreshed.json();
      if (!refreshed.ok) throw new Error(refreshedPayload?.error || 'Profile saved, but could not refresh the page.');
      setProfile(refreshedPayload);
      setEditingProfile(false);
    } catch (saveError) {
      setError(saveError.message || 'Unable to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const submitPremiumReceipt = async (file) => {
    const token = await getToken();
    const body = new FormData();
    body.append('source_type', 'premium');
    body.append('source_id', profile.id);
    body.append('receipt', file);
    const response = await fetch('/api/payments/receipt', {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body,
    });
    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || 'Unable to submit payment receipt.');
    }
    setProfile((current) => ({ ...current, premiumPaymentReceipt: payload.receipt }));
  };

  if (!isLoaded || loading) {
    return <main className="mx-auto max-w-4xl px-4 py-20 text-center text-gray-600">Loading your profile…</main>;
  }

  const giveaway = profile?.giveaway;
  const eligibilityItems = giveaway ? [
    ['Premium plan active', giveaway.eligibility.isPremium],
    ['Level 4 buyer or rental readiness complete', giveaway.eligibility.hasLevelFourReadiness],
  ] : [];
  const levelFour = Math.max(profile?.readiness?.buyerLevel || 0, profile?.readiness?.rentalLevel || 0) >= 4;

  return (
    <>
      <Head><title>My Profile — Dosnine</title></Head>
      <main className="mx-auto max-w-5xl px-4 py-8">
        {showReceiptPending && profile?.premiumPaymentReceipt?.status === 'pending' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="receipt-pending-title"
              className="w-full max-w-md rounded-2xl bg-white p-6 text-center"
            >
              <Clock3 className="mx-auto h-10 w-10 text-accent" aria-hidden="true" />
              <h2 id="receipt-pending-title" className="mt-4 text-xl font-semibold text-gray-900">
                Receipt pending
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Your payment receipt has been received and is awaiting verification.
              </p>
              <button
                type="button"
                onClick={() => setShowReceiptPending(false)}
                className="mt-5 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent/90"
              >
                Got it
              </button>
            </section>
          </div>
        )}
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={profileLink} className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
            </Link>
            <h1 className="mt-4 text-3xl font-bold text-gray-900">My profile</h1>
            <p className="mt-1 text-gray-600">Manage your account details and rewards.</p>
          </div>
          <div className="rounded-xl bg-gray-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Account tier</p>
            <p className="mt-1 font-semibold text-gray-900">{profile?.premium ? 'Premium' : 'Standard'}</p>
            {profile?.premium && <p className="mt-0.5 text-xs text-gray-600">Access until {formatDate(profile.premium_service_request_expires)}</p>}
          </div>
        </div>

        {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

        {profile?.account_type === 'regular' && (
          <section id="premium-payment" className="mb-6 rounded-2xl bg-white p-6 ring-1 ring-gray-200">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {profile?.premium ? 'Premium tier' : 'Upgrade your tier'}
                  </h2>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                  Your first property listing, property requests, property management, and buyer readiness are free.
                  Premium is for posting more than one property and includes one 30-day property visibility boost.
                </p>
                {profile?.premium && (
                  <p className="mt-3 text-sm text-gray-600">
                    Your tier is active until {formatDate(profile.premium_service_request_expires)}. Additional 30-day property boosts cost J$500.
                  </p>
                )}
              </div>
              {profile?.premium && (
                <Link
                  href="/premium-payment"
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                >
                  Manage Premium tier
                </Link>
              )}
            </div>
            {!profile?.premium && (
              <div className="mt-5">
                <BankTransferPaymentPanel
                  amount={premiumPrice}
                  currency="JMD"
                  reference={profile.id}
                  receipt={profile.premiumPaymentReceipt}
                  onSubmit={submitPremiumReceipt}
                />
              </div>
            )}
            {profile?.premium && profile.premiumPaymentReceipt?.url && (
              <div className="mt-5 rounded-xl bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">Latest Premium payment receipt</p>
                <p className="mt-1 text-sm capitalize text-gray-600">
                  {profile.premiumPaymentReceipt.status} · {new Date(profile.premiumPaymentReceipt.submittedAt).toLocaleString()}
                </p>
                <a href={profile.premiumPaymentReceipt.url} target="_blank" rel="noreferrer" className="mt-3 inline-block">
                  <img
                    src={profile.premiumPaymentReceipt.url}
                    alt="Uploaded Premium bank transfer receipt"
                    className="max-h-56 rounded-lg object-contain"
                  />
                </a>
              </div>
            )}
          </section>
        )}

        <section className="mb-6 rounded-2xl bg-white p-6 ring-1 ring-gray-200">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Account details</h2>
              <p className="mt-1 text-sm text-gray-600">Email and username are managed by your verified sign-in identity.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditingProfile((current) => !current)}
                className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200"
              >
                {editingProfile ? 'Close editing' : 'Edit profile'}
              </button>
              <button
                type="button"
                onClick={() => setShowClerkProfile((current) => !current)}
                className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200"
              >
                {showClerkProfile ? 'Close sign-in settings' : 'Edit email or username'}
              </button>
            </div>
          </div>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Email', user?.primaryEmailAddress?.emailAddress || profile?.email || 'Not provided'],
              ['Username', user?.username || 'Not set'],
              ['Member since', formatDate(profile?.created_at)],
              ['Last active', formatDate(profile?.last_active_at)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                <p className="mt-1 break-words font-medium text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          {showClerkProfile && (
            <div className="mb-6 overflow-hidden rounded-xl bg-gray-50 p-4">
              <UserProfile routing="hash" />
            </div>
          )}

          {editingProfile && <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" autoComplete="name" value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} required />
            <Field label="Phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />

            {profile?.account_type === 'regular' && (
              <div className="sm:col-span-2 rounded-xl bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-gray-900">Buyer readiness</p>
                    <p className="mt-1 text-sm text-gray-600">Current level: {profile?.readiness?.buyerLevel || 'Not started'}{profile?.readiness?.buyerLevel ? ' of 4' : ''}. Complete your buyer verification to unlock verified buyer benefits.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="mr-3 rounded-xl bg-gray-100 px-5 py-3 font-semibold text-gray-800 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-white hover:bg-accent/90 disabled:opacity-50">
                <Save className="h-4 w-4" aria-hidden="true" /> {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>}
        </section>

        {profile?.account_type === 'regular' && (
          <section className="mb-6 rounded-2xl bg-white p-6 ring-1 ring-gray-200">
            <div className="mb-4 flex items-start gap-3">
              <Home className="mt-0.5 h-5 w-5 text-accent" aria-hidden="true" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Off-market properties</h2>
                <p className="mt-1 text-sm text-gray-600">Private rental and sales opportunities available to members with active Premium access.</p>
              </div>
            </div>
            {!profile.premium ? (
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                <LockKeyhole className="h-5 w-5 shrink-0 text-gray-500" aria-hidden="true" />
                <p>
                  Upgrade to Premium to view off-market properties and receive priority access when your readiness profile is complete.
                  {' '}<Link href="/contact" className="font-semibold text-accent hover:underline">Contact Dosnine</Link> to activate Premium.
                </p>
              </div>
            ) : properties.length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">No off-market properties are available right now.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {properties.map((property) => (
                  <article key={property.id} className="overflow-hidden rounded-xl bg-gray-50">
                    {property.image_urls?.[0] && <Image src={property.image_urls[0]} alt="" width={800} height={450} unoptimized className="h-44 w-full object-cover" />}
                    <div className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Private · {property.type || 'Property'}</p>
                      <h3 className="mt-1 font-semibold text-gray-900">{property.title}</h3>
                      <p className="mt-1 text-sm text-gray-600">{property.town}, {property.parish}</p>
                      <p className="mt-2 font-semibold text-gray-900">J${Number(property.price || 0).toLocaleString()}</p>
                      <Link href={`/property/${property.slug}`} className="mt-3 inline-flex text-sm font-semibold text-accent hover:underline">View property</Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {profile.premium && (
              <p className="mt-4 text-sm text-gray-600">
                Priority access: {levelFour
                  ? 'Your level 4 readiness is complete.'
                  : 'Complete level 4 rental or buyer readiness to qualify for priority access.'}
              </p>
            )}
          </section>
        )}

        {profile?.account_type === 'regular' && (giveaway ? (
          <section className="rounded-2xl bg-[#6E026F]/5 p-6 ring-1 ring-[#6E026F]/15">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Member reward</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">{giveaway.title}</h2>
                <p className="mt-1 text-gray-700">{giveaway.prize_description}</p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3 text-center">
                <Clock3 className="mx-auto h-5 w-5 text-accent" aria-hidden="true" />
                <p className="mt-1 text-xs font-semibold uppercase text-gray-500">Giveaway countdown</p>
                <p className="mt-1 font-mono text-lg font-bold text-gray-900">{countdown}</p>
              </div>
            </div>
            <p className="mt-5 text-sm font-semibold text-gray-800">
              {giveaway.eligible ? 'You qualify for this giveaway.' : 'Complete the requirements below to qualify.'}
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {eligibilityItems.map(([label, complete]) => (
                <li key={label} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle2 className={`h-4 w-4 ${complete ? 'text-emerald-600' : 'text-gray-300'}`} aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gray-500">One giveaway entry per eligible account.</p>
          </section>
        ) : (
          <section className="rounded-2xl bg-gray-50 p-6">
            <p className="font-semibold text-gray-900">No giveaway is open right now</p>
            <p className="mt-1 text-sm text-gray-600">When the next reward opens, its prize, eligibility checklist, and countdown will appear here.</p>
          </section>
        ))}
      </main>
    </>
  );
}
