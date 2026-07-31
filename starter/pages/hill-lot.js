import Head from 'next/head';
import { useState } from 'react';
import AutoPlayYouTube from '../components/AutoPlayYouTube';

export default function HillLotInvestmentPage() {
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          investmentAmount,
          message: investmentAmount ? `Investment interest: ${investmentAmount}` : '',
        }),
      });

      let payload = null;
      let responseText = await response.text();

      try {
        payload = responseText ? JSON.parse(responseText) : null;
      } catch (error) {
        payload = null;
      }

      if (!response.ok || !payload?.success) {
        const message = payload?.error || response.statusText || responseText || 'Unable to submit your inquiry.';
        throw new Error(message);
      }

      setStatus({ type: 'success', message: 'Your investment inquiry has been received. Our legal team will contact you within 48 hours.' });
      setShowSuccessModal(true);
      setFullName('');
      setEmail('');
      setPhone('');
      setInvestmentAmount('');
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Short-Term Rental Investment | USD 200K Project | Dosnine</title>
        <meta
          name="description"
          content="Invest in a short-term rental development in Sligoville. USD 200K project managed by Dosnine. 3% annual payback. Investment tiers from USD 50K-250K. Completion 2029."
        />
        <meta property="og:title" content="The Hill Lot: Secured Property Investment | Dosnine" />
        <meta
          property="og:description"
          content="Secured property investment focused on short-term rentals. 3% annual payback. Dosnine-managed acquisition and renovations. 2029 completion."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://dosnine.com/hill-lot" />
      </Head>

      <main className="min-h-screen bg-[#f5f8fd] text-slate-900">
        <section className="bg-[#0b2343] py-24 text-white sm:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl">
              <p className="mb-6 text-xs font-semibold uppercase tracking-[0.32em] text-[#8ec5ff]">
                Secured Property Investment
              </p>
              <h1 className="mb-6 text-5xl font-bold tracking-[-0.03em] sm:text-7xl" style={{ fontFamily: 'Tai Heritage Pro, serif' }}>
                The Hill Lot:
                <br />
                <span className="text-[#9fd8ff]">Short-Term Rental Focus</span>
              </h1>
              <p className="mb-8 max-w-2xl text-xl leading-8 text-slate-300">
                This investment is focused on short-term rentals and is presented as a secured property investment with a 3% annual payback.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <a
                  href="#investment-inquiry"
                  className="inline-flex justify-center rounded-[4px] bg-[#2563eb] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
                >
                  Begin Investment Inquiry
                </a>
                <a
                  href="#investment-details"
                  className="inline-flex justify-center rounded-[4px] border border-[#4f7ecf] bg-transparent px-8 py-4 text-sm font-semibold text-[#bfdbfe] transition hover:bg-[#13294d]"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#dfe8f7] bg-[#f7faff] py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              <div className="text-center">
                <p className="mb-2 text-4xl font-bold text-[#2563eb] sm:text-5xl">USD 200K</p>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Total Investment</p>
              </div>
              <div className="text-center">
                <p className="mb-2 text-4xl font-bold text-[#2563eb] sm:text-5xl">50K-250K</p>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Investment Tiers</p>
              </div>
              <div className="text-center">
                <p className="mb-2 text-4xl font-bold text-[#2563eb] sm:text-5xl">2029</p>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Completion Date</p>
              </div>
              <div className="text-center">
                <p className="mb-2 text-4xl font-bold text-[#2563eb] sm:text-5xl">3%</p>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Annual Payback</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <AutoPlayYouTube pageId="hill-lot-investment" />
          </div>
        </section>

        <section id="investment-details" className="bg-white py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <h2 className="mb-6 text-4xl font-bold sm:text-5xl" style={{ fontFamily: 'Tai Heritage Pro, serif' }}>
                How It Works
              </h2>
              <p className="text-lg text-[#2563eb]">
                A secured short-term rental investment with annual returns of 3% to 4% paid after the property begins operating.
              </p>
            </div>

            <div className="mb-12 grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
                <div className="mb-4 text-4xl">🏘️</div>
                <h3 className="mb-3 text-xl font-bold">Short-Term Rentals</h3>
                <p className="text-slate-600">
                  The property is positioned for premium short-term rental activity in a high-demand location.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
                <div className="mb-4 text-4xl">💰</div>
                <h3 className="mb-3 text-xl font-bold">3% to 4% Annual Returns</h3>
                <p className="text-slate-600">
                  Investors receive annual returns of 3% to 4% based on the agreed structure and documented project performance.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
                <div className="mb-4 text-4xl">✓</div>
                <h3 className="mb-3 text-xl font-bold">Secured Structure</h3>
                <p className="text-slate-600">
                  This is presented as a secured property investment with a clear and documented investor structure.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-4xl font-bold sm:text-5xl" style={{ fontFamily: 'Tai Heritage Pro, serif' }}>
                Investment Tiers
              </h2>
              <p className="text-lg text-slate-600">
                Choose your investment level and receive annual returns paid after the property starts operating.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  tier: 'Tier 4',
                  amount: 'USD 30K',
                  months: 'Contract terms reviewed with legal counsel',
                  benefits: ['4% annual interest', 'Secured by property title', 'Priority access', 'Annual reporting', 'Direct investor updates'],
                },
                {
                  tier: 'Tier 3',
                  amount: 'USD 20K',
                  months: 'Contract terms reviewed with legal counsel',
                  benefits: ['3.25% annual interest', 'Secured by property title', 'Quarterly updates', 'Legal oversight', 'Performance tracking'],
                  featured: true,
                },
                {
                  tier: 'Tier 2',
                  amount: 'USD 10K',
                  months: 'Contract terms reviewed with legal counsel',
                  benefits: ['3% annual interest', 'Secured by property title', 'Annual statements', 'Legal contracts', 'Investment dashboard'],
                },
              ].map((item) => (
                <div
                  key={item.tier}
                  className={`rounded-[8px] border p-8 transition ${
                    item.featured
                      ? 'border-[#2563eb] bg-[#f2f7ff]'
                      : 'border-[#dfe8f7] bg-white hover:border-[#2563eb]'
                  }`}
                >
                  {item.featured && (
                    <p className="mb-4 inline-block bg-[#2563eb] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
                      Most Popular
                    </p>
                  )}
                  <p className="mb-2 text-sm uppercase tracking-[0.2em] text-slate-500">{item.tier}</p>
                  <p className="mb-1 text-4xl font-bold text-slate-900">{item.amount}</p>
                  <p className="mb-6 text-sm font-semibold text-[#2563eb]">{item.months}</p>
                  <ul className="space-y-3">
                    {item.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-3 text-slate-600">
                        <span className="mt-1 text-[#2563eb]">✓</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#investment-inquiry"
                    className={`mt-8 block w-full py-3 text-center font-semibold transition ${
                      item.featured
                        ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]'
                        : 'border border-[#2563eb] text-[#2563eb] hover:bg-[#eff6ff]'
                    }`}
                  >
                    Start Inquiry
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <h2 className="mb-12 text-4xl font-bold sm:text-5xl" style={{ fontFamily: 'Tai Heritage Pro, serif' }}>
                What You Receive
              </h2>

              <div className="space-y-8">
                <div className="border-l-4 border-[#2563eb] pl-8">
                  <h3 className="mb-3 text-2xl font-bold text-slate-900">Annual Interest Returns</h3>
                  <p className="leading-7 text-slate-600">
                    Investors receive annual interest of 4% for USD 30K, 3.25% for USD 20K, and 3% for USD 10K, according to the agreed project structure and documentation.
                  </p>
                </div>

                <div className="border-l-4 border-[#2563eb] pl-8">
                  <h3 className="mb-3 text-2xl font-bold text-slate-900">Secured by Property Title</h3>
                  <p className="leading-7 text-slate-600">
                    This opportunity is presented as a secured property investment backed by the property title and a clear structure for each investor.
                  </p>
                </div>

                <div className="border-l-4 border-[#2563eb] pl-8">
                  <h3 className="mb-3 text-2xl font-bold text-slate-900">Transparent Reporting</h3>
                  <p className="leading-7 text-slate-600">
                    Investors receive regular updates and documented reporting on the project and payback process.
                  </p>
                </div>

                <div className="border-l-4 border-[#2563eb] pl-8">
                  <h3 className="mb-3 text-2xl font-bold text-slate-900">Legal Review</h3>
                  <p className="leading-7 text-slate-600">
                    All terms are reviewed with legal counsel so investors can evaluate the structure before proceeding.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-4xl font-bold" style={{ fontFamily: 'Tai Heritage Pro, serif' }}>
              Investment Payout Timeline
            </h2>

            <div className="mx-auto max-w-4xl">
              <div className="space-y-6">
                {[
                  { year: '2025', status: 'Excavations Complete - Operations Begin' },
                  { year: '2025-2029', status: 'Annual Interest Payments Distributed' },
                  { year: '2029', status: 'Project Completion - Property Fully Operational' },
                  { year: 'Contract Ends', status: 'Once the agreed terms are reached' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-6">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[4px] bg-[#2563eb] text-lg font-bold text-white">
                      <span>{'✓'}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{item.year}</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{item.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="investment-inquiry" className="bg-[#0b2343] py-16 text-white sm:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl">
              <div className="mb-12 text-center">
                <h2 className="mb-4 text-4xl font-bold" style={{ fontFamily: 'Tai Heritage Pro, serif' }}>
                  Begin Your Investment Journey
                </h2>
                <p className="text-[#bfdbfe]">
                  Submit your information and our legal team will contact you within 48 hours with full investment details and contract options.
                </p>
              </div>

              <div className="rounded-[8px] border border-[#254c77] bg-[#0f2d4d] p-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <label className="block">
                    <span className="text-sm font-semibold uppercase tracking-[0.1em] text-[#7dd3fc]">Full Name *</span>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#2563eb]"
                      placeholder="Your full name"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold uppercase tracking-[0.1em] text-[#7dd3fc]">Email Address *</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#2563eb]"
                      placeholder="your@email.com"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold uppercase tracking-[0.1em] text-[#7dd3fc]">Phone Number</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#2563eb]"
                      placeholder="+1 876 555 0123"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold uppercase tracking-[0.1em] text-[#7dd3fc]">Investment Interest *</span>
                    <select
                      required
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white focus:outline-none focus:border-[#2563eb]"
                    >
                      <option value="">Select an investment tier</option>
                      <option value="10K">Tier 2 - USD 10K</option>
                      <option value="20K">Tier 3 - USD 20K</option>
                      <option value="30K">Tier 4 - USD 30K</option>
                      <option value="other">Other Amount</option>
                    </select>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#2563eb] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-70"
                  >
                    {loading ? 'Submitting...' : 'Submit Investment Inquiry'}
                  </button>

                  {status && (
                    <p className={`text-sm ${status.type === 'success' ? 'text-[#7dd3fc]' : 'text-[#fda4af]'}`}>
                      {status.message}
                    </p>
                  )}

                  <p className="mt-4 text-center text-xs text-slate-400">
                    By submitting, you agree to be contacted by Dosnine and our legal partners regarding this investment opportunity. All information will be handled with complete confidentiality.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-[#dfe8f7] bg-white py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl rounded-[8px] border border-[#dfe8f7] bg-[#f8fbff] p-8">
              <h3 className="mb-4 text-xl font-bold text-slate-900">⚖️ Legal & Professional Oversight</h3>
              <p className="mb-4 text-slate-600">
                All investment agreements are prepared, reviewed, and processed by independent legal counsel. Each investor receives:
              </p>
              <ul className="space-y-3 text-slate-600">
                <li>✓ Professionally drafted investment contract with clear terms</li>
                <li>✓ Independent legal review and counsel</li>
                <li>✓ Complete financial transparency and reporting</li>
                <li>✓ Annual payback calculations and documentation</li>
                <li>✓ Regulatory compliance review</li>
                <li>✓ Clear investor security disclosures</li>
              </ul>
              <p className="mt-6 text-sm italic text-slate-500">
                This is a professional short-term rental investment opportunity. All contracts require legal processing. We recommend consulting with your personal legal and financial advisors before investing.
              </p>
            </div>
          </div>
        </section>
      </main>

      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-md rounded-[8px] border border-slate-200 bg-white p-8 text-center shadow-2xl">
            <div className="mb-4 text-4xl text-[#2563eb]">✓</div>
            <h3 className="text-2xl font-bold text-slate-900">Investment inquiry received</h3>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Your investment inquiry has been received. Our legal team will contact you within 48 hours.
            </p>
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="mt-6 w-full bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(body) {
          background: #f5f8fd;
        }
      `}</style>
    </>
  );
}
