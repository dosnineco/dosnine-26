import Head from 'next/head';
import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  DollarSign,
  Scale,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import AutoPlayYouTube from '../components/AutoPlayYouTube';

const serif = { fontFamily: 'Tai Heritage Pro, serif' };

const TIERS = [
  {
    tier: 'I',
    name: 'Entry',
    amount: '10K',
    rate: '2–3',
    benefits: ['Secured placement', 'Annual statements', 'Legal review'],
  },
  {
    tier: 'II',
    name: 'Growth',
    amount: '25K',
    rate: '3–4',
    featured: true,
    benefits: [
      'Secured placement',
      'Quarterly updates',
      'Priority allocation',
      'Account manager',
    ],
  },
  {
    tier: 'III',
    name: 'Prime',
    amount: '50K',
    rate: '4–5',
    benefits: [
      'Secured placement',
      'Priority construction',
      'Direct updates',
      'Performance reports',
    ],
  },
  {
    tier: 'IV',
    name: 'Signature',
    amount: '100K',
    rate: '5–6',
    benefits: [
      'First-position',
      'Direct leadership line',
      'Custom structure',
      'Bespoke reporting',
    ],
  },
];

export default function InvestInDosninePage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!fullName.trim() || !email.trim() || !investmentAmount.trim()) {
      setStatus({ type: 'error', message: 'Please fill in all required fields.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/hill-lot/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          investmentAmount,
          message: investmentAmount
            ? `Dosnine investor interest: ${investmentAmount}`
            : '',
        }),
      });

      let payload = null;
      const responseText = await response.text();
      try {
        payload = responseText ? JSON.parse(responseText) : null;
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error ||
            response.statusText ||
            responseText ||
            'Unable to submit your inquiry.'
        );
      }

      setStatus({
        type: 'success',
        message: 'Your investor inquiry has been received.',
      });
      setShowSuccessModal(true);
      setFullName('');
      setEmail('');
      setPhone('');
      setInvestmentAmount('');
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Invest in Dosnine — Secured Property Investment</title>
        <meta
          name="description"
          content="Fund Dosnine's property acquisitions and rental construction. Secured placement. 2–6% annual returns."
        />
        <meta property="og:title" content="Invest in Dosnine" />
        <meta
          property="og:description"
          content="Secured property investment. 2–6% annual returns."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://dosnine.com/invest" />
      </Head>

      <main className="min-h-screen bg-[#0a0a0a] text-neutral-100 antialiased selection:bg-[#c9a961]/30">
        {/* ============================================================
            HERO
           ============================================================ */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#c9a961]/[0.06] blur-3xl"
          />

          <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-24 sm:px-10 sm:pb-32 sm:pt-32 lg:px-16 lg:pt-40">
            <div className="flex items-center gap-4 text-[11px] font-medium uppercase tracking-[0.32em] text-[#c9a961]">
              <span className="h-px w-10 bg-[#c9a961]/60" />
              Invest in Dosnine
            </div>

            {/* HERO — bigger on mobile */}
            <h1
              className="mt-10 max-w-5xl text-6xl font-normal leading-[0.98] tracking-[-0.03em] text-white sm:text-7xl lg:text-[7rem]"
              style={serif}
            >
              Fund property.
              <br />
              <span className="italic text-[#e6d5a8]">Earn securely.</span>
            </h1>

            <p className="mt-10 max-w-xl text-lg leading-relaxed text-neutral-400 sm:text-xl">
              Secured placements funding Dosnine&apos;s rental pipeline.
              Returns from 2% to 6%.
            </p>

            <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4">
              <a
                href="#inquiry"
                className="group inline-flex items-center gap-3 rounded-full bg-[#c9a961] px-8 py-4 text-sm font-medium uppercase tracking-[0.18em] text-neutral-950 transition hover:bg-[#e6d5a8]"
              >
                Begin inquiry
                <ArrowRight
                  size={16}
                  className="transition group-hover:translate-x-1"
                />
              </a>
              <a
                href="#how"
                className="group inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-neutral-400 transition hover:text-white"
              >
                How it works
                <ArrowUpRight
                  size={16}
                  className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </a>
            </div>
          </div>
        </section>

        {/* ============================================================
            STAT BAR — bigger mobile numbers
           ============================================================ */}
        <section className="border-y border-white/[0.06]">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-white/[0.06] px-6 sm:px-10 lg:grid-cols-4 lg:divide-x lg:px-0">
            {[
              { value: '2–6%', label: 'Annual returns' },
              { value: '100%', label: 'Secured' },
              { value: 'Annual', label: 'Payouts' },
              { value: 'Rental', label: 'Pipeline' },
            ].map((s) => (
              <div
                key={s.label}
                className="border-b border-white/[0.06] px-4 py-10 text-center sm:py-14 lg:border-b-0 lg:px-10"
              >
                <p
                  className="text-5xl font-normal tracking-tight text-white sm:text-6xl lg:text-7xl"
                  style={serif}
                >
                  {s.value}
                </p>
                <p className="mt-4 text-[10px] uppercase tracking-[0.32em] text-neutral-500">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================
            VIDEO
           ============================================================ */}
        <section className="px-6 py-20 sm:px-10 sm:py-28 lg:px-16">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-sm border border-white/[0.06]">
            <AutoPlayYouTube pageId="invest-in-dosnine" />
          </div>
        </section>

        {/* ============================================================
            PILLARS
           ============================================================ */}
        <section
          id="how"
          className="border-t border-white/[0.06] px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-[#c9a961]">
                The structure
              </p>
              <h2
                className="mt-6 text-5xl font-normal leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl"
                style={serif}
              >
                Three principles.
                <br />
                <span className="italic text-neutral-400">One standard.</span>
              </h2>
            </div>

            <div className="mt-20 grid gap-px overflow-hidden border border-white/[0.06] sm:grid-cols-3">
              {[
                {
                  n: '01',
                  icon: Building2,
                  title: 'Capital deployed',
                  text: 'Funds acquire land, properties, and construction.',
                },
                {
                  n: '02',
                  icon: TrendingUp,
                  title: 'Returns delivered',
                  text: 'Annual interest between 2% and 6%.',
                },
                {
                  n: '03',
                  icon: ShieldCheck,
                  title: 'Secured by title',
                  text: 'Backed by property. Reviewed by counsel.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.n}
                    className="group bg-[#0a0a0a] p-10 transition hover:bg-white/[0.02] sm:p-12"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-[0.32em] text-neutral-600">
                        {item.n}
                      </span>
                      <Icon
                        size={20}
                        strokeWidth={1.25}
                        className="text-[#c9a961]"
                      />
                    </div>
                    <h3
                      className="mt-16 text-3xl font-normal leading-tight text-white sm:text-3xl lg:text-4xl"
                      style={serif}
                    >
                      {item.title}
                    </h3>
                    <p className="mt-4 text-base leading-relaxed text-neutral-500 sm:text-sm">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================================================
            TIERS
           ============================================================ */}
        <section className="border-t border-white/[0.06] px-6 py-24 sm:px-10 sm:py-32 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-[#c9a961]">
                  Tiers
                </p>
                <h2
                  className="mt-6 text-5xl font-normal leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl"
                  style={serif}
                >
                  Four placements.
                  <br />
                  <span className="italic text-neutral-400">
                    One pipeline.
                  </span>
                </h2>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-neutral-500">
                Final terms are set in writing with legal counsel.
              </p>
            </div>

            <div className="mt-20 grid gap-px overflow-hidden border border-white/[0.06] md:grid-cols-2 xl:grid-cols-4">
              {TIERS.map((t) => (
                <div
                  key={t.tier}
                  className={`relative flex flex-col p-10 transition sm:p-12 ${
                    t.featured
                      ? 'bg-[#c9a961]/[0.04]'
                      : 'bg-[#0a0a0a] hover:bg-white/[0.02]'
                  }`}
                >
                  {t.featured && (
                    <span className="absolute right-10 top-10 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.28em] text-[#c9a961]">
                      <span className="h-1 w-1 rounded-full bg-[#c9a961]" />
                      Popular
                    </span>
                  )}

                  <span
                    className="text-4xl font-normal italic text-[#c9a961] sm:text-3xl"
                    style={serif}
                  >
                    {t.tier}
                  </span>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.32em] text-neutral-500">
                    {t.name}
                  </p>

                  <div className="mt-12 flex items-baseline gap-2">
                    <span className="text-xs uppercase tracking-[0.28em] text-neutral-500">
                      USD
                    </span>
                    <span
                      className="text-6xl font-normal tracking-tight text-white sm:text-5xl"
                      style={serif}
                    >
                      {t.amount}
                    </span>
                    <span className="text-sm text-neutral-500">+</span>
                  </div>

                  <div className="mt-6 flex items-baseline gap-2 border-t border-white/[0.06] pt-6">
                    <span
                      className="text-4xl font-normal text-white sm:text-3xl"
                      style={serif}
                    >
                      {t.rate}
                    </span>
                    <span className="text-xs uppercase tracking-[0.28em] text-neutral-500">
                      % / year
                    </span>
                  </div>

                  <ul className="mt-8 flex-1 space-y-3">
                    {t.benefits.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-3 text-sm text-neutral-400"
                      >
                        <Check
                          size={14}
                          strokeWidth={1.5}
                          className="mt-0.5 shrink-0 text-[#c9a961]"
                        />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href="#inquiry"
                    className={`mt-10 inline-flex items-center justify-between gap-3 border-b pb-3 text-xs uppercase tracking-[0.28em] transition ${
                      t.featured
                        ? 'border-[#c9a961] text-[#c9a961] hover:text-white'
                        : 'border-white/20 text-neutral-400 hover:border-white hover:text-white'
                    }`}
                  >
                    Select
                    <ArrowRight size={14} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================
            LIFECYCLE — bigger mobile numbers + steps
           ============================================================ */}
        <section className="border-t border-white/[0.06] px-6 py-24 sm:px-10 sm:py-32 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-[#c9a961]">
                Lifecycle
              </p>
              <h2
                className="mt-6 text-5xl font-normal leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl"
                style={serif}
              >
                From inquiry
                <br />
                <span className="italic text-neutral-400">to payout.</span>
              </h2>
            </div>

            <ol className="mt-20 divide-y divide-white/[0.06] border-y border-white/[0.06]">
              {[
                'Submit your inquiry',
                'Legal consultation & contract review',
                'Capital deployed into construction',
                'Annual returns paid per terms',
              ].map((step, i) => (
                <li
                  key={step}
                  className="grid grid-cols-[auto_1fr] items-baseline gap-8 py-8 sm:grid-cols-[80px_1fr] sm:gap-16 sm:py-10"
                >
                  <span
                    className="text-4xl font-normal italic text-[#c9a961] sm:text-4xl"
                    style={serif}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p
                    className="text-2xl font-normal leading-tight text-white sm:text-3xl"
                    style={serif}
                  >
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ============================================================
            INQUIRY
           ============================================================ */}
        <section
          id="inquiry"
          className="border-t border-white/[0.06] px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-[#c9a961]">
                  Inquiry
                </p>
                <h2
                  className="mt-6 text-5xl font-normal leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl"
                  style={serif}
                >
                  Join the
                  <br />
                  <span className="italic text-neutral-400">
                    investor list.
                  </span>
                </h2>
                <p className="mt-10 max-w-md text-base leading-relaxed text-neutral-400">
                  Our team responds within 48 hours with rate options and
                  contract terms.
                </p>

                <div className="mt-12 space-y-4 border-t border-white/[0.06] pt-8 text-sm text-neutral-500">
                  <div className="flex items-center gap-3">
                    <Scale
                      size={16}
                      strokeWidth={1.25}
                      className="text-[#c9a961]"
                    />
                    <span>Reviewed by independent counsel</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ShieldCheck
                      size={16}
                      strokeWidth={1.25}
                      className="text-[#c9a961]"
                    />
                    <span>Secured against property title</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign
                      size={16}
                      strokeWidth={1.25}
                      className="text-[#c9a961]"
                    />
                    <span>2–6% annual returns</span>
                  </div>
                </div>
              </div>

              <div>
                <form onSubmit={handleSubmit} className="space-y-8">
                  <Field label="Full name" required>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full border-0 border-b border-white/15 bg-transparent pb-3 text-lg text-white outline-none transition placeholder:text-neutral-600 focus:border-[#c9a961]"
                    />
                  </Field>

                  <Field label="Email" required>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full border-0 border-b border-white/15 bg-transparent pb-3 text-lg text-white outline-none transition placeholder:text-neutral-600 focus:border-[#c9a961]"
                    />
                  </Field>

                  <Field label="Phone">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 876 555 0123"
                      className="w-full border-0 border-b border-white/15 bg-transparent pb-3 text-lg text-white outline-none transition placeholder:text-neutral-600 focus:border-[#c9a961]"
                    />
                  </Field>

                  <Field label="Investment amount" required>
                    <select
                      required
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                      className="w-full border-0 border-b border-white/15 bg-transparent pb-3 text-lg text-white outline-none transition focus:border-[#c9a961]"
                    >
                      <option value="" className="bg-[#0a0a0a]">
                        Select a tier
                      </option>
                      <option value="10K-25K" className="bg-[#0a0a0a]">
                        Tier I — USD 10K–25K
                      </option>
                      <option value="25K-50K" className="bg-[#0a0a0a]">
                        Tier II — USD 25K–50K
                      </option>
                      <option value="50K-100K" className="bg-[#0a0a0a]">
                        Tier III — USD 50K–100K
                      </option>
                      <option value="100K+" className="bg-[#0a0a0a]">
                        Tier IV — USD 100K+
                      </option>
                      <option value="other" className="bg-[#0a0a0a]">
                        Other amount
                      </option>
                    </select>
                  </Field>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group mt-4 inline-flex w-full items-center justify-between rounded-full bg-[#c9a961] px-8 py-5 text-sm font-medium uppercase tracking-[0.18em] text-neutral-950 transition hover:bg-[#e6d5a8] disabled:opacity-60"
                  >
                    {loading ? 'Sending…' : 'Submit inquiry'}
                    <ArrowRight
                      size={16}
                      className="transition group-hover:translate-x-1"
                    />
                  </button>

                  {status && (
                    <p
                      className={`text-sm ${
                        status.type === 'success'
                          ? 'text-[#c9a961]'
                          : 'text-red-400'
                      }`}
                    >
                      {status.message}
                    </p>
                  )}

                  <p className="text-xs leading-relaxed text-neutral-600">
                    By submitting you agree to be contacted by Dosnine and its
                    legal partners. Confidential handling assured.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            LEGAL / FOOTER
           ============================================================ */}
        <footer className="border-t border-white/[0.06] px-6 py-16 sm:px-10 lg:px-16">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <p
              className="text-2xl font-normal italic leading-tight text-neutral-500 sm:text-2xl"
              style={serif}
            >
              Contracted in writing. Reviewed by counsel.
            </p>
            <p className="text-xs uppercase tracking-[0.28em] text-neutral-600">
              © Dosnine
            </p>
          </div>
        </footer>
      </main>

      {/* ============================================================
          SUCCESS
         ============================================================ */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-white/10 bg-[#0a0a0a] p-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#c9a961]/40 text-[#c9a961]">
              <Check size={22} strokeWidth={1.5} />
            </span>
            <h3
              className="mt-6 text-3xl font-normal text-white sm:text-3xl"
              style={serif}
            >
              Inquiry received.
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-neutral-400">
              Our team will contact you within 48 hours.
            </p>
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#c9a961] px-6 py-4 text-xs font-medium uppercase tracking-[0.22em] text-neutral-950 transition hover:bg-[#e6d5a8]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(body) {
          background: #0a0a0a;
        }
      `}</style>
    </>
  );
}

/* ============================================================
 * Field helper
 * ============================================================ */
function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-3 block text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-500">
        {label}
        {required && <span className="ml-2 text-[#c9a961]">*</span>}
      </span>
      {children}
    </label>
  );
}