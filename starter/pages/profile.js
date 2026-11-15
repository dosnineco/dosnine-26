import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import { ArrowLeft, CheckCircle2, Clock3, Home, LockKeyhole, Save, ShieldCheck } from 'lucide-react';
import RentalReadinessProgress from '../components/RentalReadinessProgress';

const EMPTY_RENTAL_READINESS = {
  monthly_rent_budget: '',
  monthly_income: '',
  employment_status: '',
  move_in_date: '',
  occupants: '',
  has_rental_references: false,
};

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
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [rentalReadiness, setRentalReadiness] = useState(EMPTY_RENTAL_READINESS);
  const [properties, setProperties] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        setRentalReadiness({
          ...EMPTY_RENTAL_READINESS,
          ...(payload.rentalReadiness || {}),
          monthly_rent_budget: payload.rentalReadiness?.monthly_rent_budget ?? '',
          monthly_income: payload.rentalReadiness?.monthly_income ?? '',
          occupants: payload.rentalReadiness?.occupants ?? '',
        });

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

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const profileChanges = { ...form };
      if (profile?.account_type === 'regular') {
        profileChanges.rentalReadiness = rentalReadiness;
      }
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileChanges),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to save profile changes.');
      setNotice('Your profile was updated.');
      const refreshed = await fetch('/api/user/profile', { credentials: 'include' });
      const refreshedPayload = await refreshed.json();
      if (!refreshed.ok) throw new Error(refreshedPayload?.error || 'Profile saved, but could not refresh the page.');
      setProfile(refreshedPayload);
      setRentalReadiness({
        ...EMPTY_RENTAL_READINESS,
        ...(refreshedPayload.rentalReadiness || {}),
        monthly_rent_budget: refreshedPayload.rentalReadiness?.monthly_rent_budget ?? '',
        monthly_income: refreshedPayload.rentalReadiness?.monthly_income ?? '',
        occupants: refreshedPayload.rentalReadiness?.occupants ?? '',
      });
    } catch (saveError) {
      setError(saveError.message || 'Unable to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded || loading) {
    return <main className="mx-auto max-w-4xl px-4 py-20 text-center text-gray-600">Loading your profile…</main>;
  }

  const giveaway = profile?.giveaway;
  const eligibilityItems = giveaway ? [
    ['Premium access active', giveaway.eligibility.isPremium],
    ['Active on Dosnine within 30 days', giveaway.eligibility.isActive],
    ['Created at least one request', giveaway.eligibility.hasCreatedRequest],
    ['Boosted at least one of your requests', giveaway.eligibility.hasPaidBoost],
    ['Level 4 buyer or rental readiness', giveaway.eligibility.hasLevelFourReadiness],
  ] : [];
  const levelFour = Math.max(profile?.readiness?.buyerLevel || 0, profile?.readiness?.rentalLevel || 0) >= 4;

  return (
    <>
      <Head><title>My Profile — Dosnine</title></Head>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={profileLink} className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
            </Link>
            <h1 className="mt-4 text-3xl font-bold text-gray-900">My profile</h1>
            <p className="mt-1 text-gray-600">Manage your account details, readiness, and rewards.</p>
          </div>
          <div className="rounded-xl bg-gray-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subscription</p>
            <p className="mt-1 font-semibold text-gray-900">{profile?.premium ? 'Premium' : 'Standard'}</p>
            {profile?.premium && <p className="mt-0.5 text-xs text-gray-600">Access until {formatDate(profile.premium_service_request_expires)}</p>}
          </div>
        </div>

        {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

        <section className="mb-6 rounded-2xl bg-white p-6 ring-1 ring-gray-200">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gray-900">Account details</h2>
            <p className="mt-1 text-sm text-gray-600">Email and username are managed by your verified sign-in identity.</p>
          </div>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Email', profile?.email || user?.primaryEmailAddress?.emailAddress || 'Not provided'],
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

          <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" autoComplete="name" value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} required />
            <Field label="Phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />

            {profile?.account_type === 'regular' && (
              <div className="sm:col-span-2">
                <div className="mb-4">
                  <RentalReadinessProgress level={profile?.readiness?.rentalLevel} />
                  <p className="mt-2 text-sm text-gray-600">
                    Add your details to show rental readiness and improve rental matches. Your income and rent amounts stay private; agents only see your readiness level. This is self-reported, not financial verification.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Monthly rent budget (J$)" type="number" min="0" value={rentalReadiness.monthly_rent_budget} onChange={(event) => setRentalReadiness((current) => ({ ...current, monthly_rent_budget: event.target.value }))} />
                  <Field label="Target move-in date" type="date" value={rentalReadiness.move_in_date || ''} onChange={(event) => setRentalReadiness((current) => ({ ...current, move_in_date: event.target.value }))} />
                  <Field label="Monthly income (J$)" type="number" min="0" value={rentalReadiness.monthly_income} onChange={(event) => setRentalReadiness((current) => ({ ...current, monthly_income: event.target.value }))} />
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">Employment status</span>
                    <select value={rentalReadiness.employment_status || ''} onChange={(event) => setRentalReadiness((current) => ({ ...current, employment_status: event.target.value }))} className="w-full rounded-xl bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-accent">
                      <option value="">Select status</option>
                      <option value="employed">Employed</option>
                      <option value="self-employed">Self-employed</option>
                      <option value="student">Student</option>
                      <option value="retired">Retired</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <Field label="Household size" type="number" min="1" max="30" value={rentalReadiness.occupants} onChange={(event) => setRentalReadiness((current) => ({ ...current, occupants: event.target.value }))} />
                  <label className="flex items-center gap-3 self-end rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                    <input type="checkbox" checked={Boolean(rentalReadiness.has_rental_references)} onChange={(event) => setRentalReadiness((current) => ({ ...current, has_rental_references: event.target.checked }))} className="h-4 w-4 rounded accent-[#6E026F]" />
                    I can provide rental references
                  </label>
                </div>
                <p className="mt-3 text-xs text-gray-500">Level 4 requires a budget, move-in date, income, employment status, household size, and rental references.</p>
              </div>
            )}

            {profile?.account_type === 'regular' && (
              <div className="sm:col-span-2 rounded-xl bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-gray-900">Buyer readiness</p>
                    <p className="mt-1 text-sm text-gray-600">Current level: {profile?.readiness?.buyerLevel || 'Not started'}{profile?.readiness?.buyerLevel ? ' of 4' : ''}. Complete your buyer verification to unlock verified buyer benefits.</p>
                    <Link href="/buyer-prequalification" className="mt-2 inline-flex text-sm font-semibold text-accent hover:underline">Open buyer readiness</Link>
                  </div>
                </div>
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-white hover:bg-accent/90 disabled:opacity-50">
                <Save className="h-4 w-4" aria-hidden="true" /> {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>
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

        {giveaway ? (
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
            <p className="mt-4 text-xs text-gray-500">Winner is selected from eligible accounts that created a request. One giveaway entry per account.</p>
          </section>
        ) : (
          <section className="rounded-2xl bg-gray-50 p-6">
            <p className="font-semibold text-gray-900">No giveaway is open right now</p>
            <p className="mt-1 text-sm text-gray-600">When the next reward opens, its prize, eligibility checklist, and countdown will appear here.</p>
          </section>
        )}
      </main>
    </>
  );
}
