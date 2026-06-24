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
        <title>Short-Term Rental Investment | JMD 20M Project | Dosnine</title>
        <meta
          name="description"
          content="Invest in a luxury short-term rental development in Sligoville. JMD 20M project managed by Dosnine. 6.69% annual returns based on profits. Investment tiers from JMD 1M-5M. Completion 2029."
        />
        <meta property="og:title" content="The Hill Lot: Short-Term Rental Investment | Dosnine" />
        <meta
          property="og:description"
          content="Premium short-term rental investment opportunity. 6.69% annual profit-based returns. Dosnine-managed acquisition and renovations. 2029 completion."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://dosnine.com/hill-lot" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tai+Heritage+Pro:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>


      <main className="bg-[#0a0e27] text-white">
        
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-[#F55353]/20 via-transparent to-[#0a0e27]" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#F55353]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#d14a4a]/10 rounded-full blur-3xl" />
          </div>
          
          <div className="relative container mx-auto px-4">
            <div className="max-w-4xl">
              <p className="inline-flex rounded-full border border-[#F55353]/50 bg-[#F55353]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-[#F55353] mb-6">
                Exclusive Short-Term Rental Investment
              </p>
              <h1 className="text-6xl sm:text-7xl font-bold tracking-[-0.03em] mb-6" style={{ fontFamily: 'Tai Heritage Pro, serif' }}>
                The Hill Lot:
                <br />
                <span className="bg-gradient-to-r from-[#F55353] to-[#ff8080] bg-clip-text text-transparent">
                  Premium Rental Investment
                </span>
              </h1>
              <p className="text-xl text-[#c8d8f0] leading-8 max-w-2xl mb-8">
                Join a select group of strategic investors in a premier Sligoville short-term rental development. Annual 6.69% profit-based returns. Managed acquisition and full renovations by Dosnine. Excavations complete. Completion in 2029.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#investment-inquiry"
                  className="inline-flex justify-center rounded-full bg-gradient-to-r from-[#F55353] to-[#d14a4a] px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-[#F55353]/30 transition hover:shadow-[#F55353]/50"
                >
                  Begin Investment Inquiry
                </a>
                <a
                  href="#investment-details"
                  className="inline-flex justify-center rounded-full border border-[#F55353]/50 bg-transparent px-8 py-4 text-sm font-semibold text-[#F55353] transition hover:bg-[#F55353]/10"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Key Metrics */}
        <section className="py-16 sm:py-20 border-y border-[#F55353]/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <p className="text-4xl sm:text-5xl font-bold text-[#F55353] mb-2">JMD 20M</p>
                <p className="text-sm uppercase tracking-[0.2em] text-[#999]">Total Investment</p>
              </div>
              <div className="text-center">
                <p className="text-4xl sm:text-5xl font-bold text-[#F55353] mb-2">1M-5M</p>
                <p className="text-sm uppercase tracking-[0.2em] text-[#999]">Investment Tiers</p>
              </div>
              <div className="text-center">
                <p className="text-4xl sm:text-5xl font-bold text-[#F55353] mb-2">2029</p>
                <p className="text-sm uppercase tracking-[0.2em] text-[#999]">Completion Date</p>
              </div>
              <div className="text-center">
                <p className="text-4xl sm:text-5xl font-bold text-[#F55353] mb-2">6.69%</p>
                <p className="text-sm uppercase tracking-[0.2em] text-[#999]">Annual Returns</p>
              </div>
            </div>
          </div>
        </section>

        {/* Video Section */}
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <AutoPlayYouTube pageId="hill-lot-investment" />
          </div>
        </section>

        {/* Investment Structure */}
        <section id="investment-details" className="py-16 sm:py-20 bg-[#0a0e27]\">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold mb-6" style={{ fontFamily: 'Tai Heritage Pro, serif' }}>
                How It Works
              </h2>
              <p className="text-lg text-[#F55353]">
                Short-term rental investment with predictable annual returns of 6.69% of profits. Contract ends at ROI threshold.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="rounded-2xl border border-[#F55353]/30 bg-[#111] p-8 hover:border-[#F55353]/60 transition">
                <div className="text-4xl mb-4">🏘️</div>
                <h3 className="text-xl font-bold mb-3">Short-Term Rentals</h3>
                <p className="text-[#ccc]">
                  Luxury hilltop property managed for premium short-term vacation rentals. Dosnine handles all operations and maintenance.
                </p>
              </div>

              <div className="rounded-2xl border border-[#F55353]/30 bg-[#111] p-8 hover:border-[#F55353]/60 transition">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-xl font-bold mb-3">6.69% Annual Profits</h3>
                <p className="text-[#ccc]">
                  Receive 6.69% of annual property profits paid directly to you. Payments calculated and distributed annually based on verified rental revenues.
                </p>
              </div>

              <div className="rounded-2xl border border-[#F55353]/30 bg-[#111] p-8 hover:border-[#F55353]/60 transition">
                <div className="text-4xl mb-4">✓</div>
                <h3 className="text-xl font-bold mb-3">Contract Completion</h3>
                <p className="text-[#ccc]">
                  Your investment contract terminates once you reach 6.69% return on your initial investment. Full liquidity upon completion.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Investment Tiers */}
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4" style={{ fontFamily: 'Tai Heritage Pro, serif' }}>
                Investment Tiers
              </h2>
              <p className="text-lg text-[#ccc]">
                Choose your investment level and earn 6.69% annual profit returns
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  tier: 'Founder',
                  amount: 'JMD 5M',
                  months: 'Contract ends in ~90-120 months',
                  benefits: ['6.69% annual returns', 'Short-term rental income', 'Priority access', 'Annual audited reports', 'Direct investor updates'],
                },
                {
                  tier: 'Premium',
                  amount: 'JMD 3M',
                  months: 'Contract ends in ~90-120 months',
                  benefits: ['6.69% annual returns', 'Short-term rental income', 'Quarterly updates', 'Legal oversight', 'Performance tracking'],
                  featured: true,
                },
                {
                  tier: 'Investor',
                  amount: 'JMD 1M',
                  months: 'Contract ends in ~90-120 months',
                  benefits: ['6.69% annual returns', 'Short-term rental income', 'Annual statements', 'Legal contracts', 'Investment dashboard'],
                },
              ].map((item) => (
                <div
                  key={item.tier}
                  className={`rounded-2xl border p-8 transition ${
                    item.featured
                      ? 'border-[#F55353] bg-gradient-to-br from-[#F55353]/20 to-[#111] shadow-xl shadow-[#F55353]/20 scale-105'
                      : 'border-[#F55353]/30 bg-[#111] hover:border-[#F55353]/60'
                  }`}
                >
                  {item.featured && (
                    <p className="inline-block rounded-full bg-gradient-to-r from-[#F55353] to-[#d14a4a] px-3 py-1 text-xs font-bold text-white mb-4">
                      MOST POPULAR
                    </p>
                  )}
                  <p className="text-sm uppercase tracking-[0.2em] text-[#999] mb-2">{item.tier}</p>
                  <p className="text-4xl font-bold mb-1 text-white">{item.amount}</p>
                  <p className="text-[#F55353] mb-6 font-semibold text-sm">{item.months}</p>
                  <ul className="space-y-3">
                    {item.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-3 text-[#ccc]">
                        <span className="text-[#F55353] mt-1">✓</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#investment-inquiry"
                    className={`mt-8 block w-full rounded-full py-3 font-semibold text-center transition ${
                      item.featured
                        ? 'bg-gradient-to-r from-[#F55353] to-[#d14a4a] text-white hover:shadow-lg hover:shadow-[#F55353]/30'
                        : 'border border-[#F55353]/50 text-[#F55353] hover:bg-[#F55353]/10'
                    }`}
                  >
                    Start Inquiry
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What Investors Receive */}
        <section className="py-16 sm:py-20 bg-[#0a0e27]">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <h2 className="text-4xl sm:text-5xl font-bold mb-12" style={{ fontFamily: 'Tai Heritage Pro, serif' }}>
                What You Receive
              </h2>

              <div className="space-y-8">
                <div className="border-l-4 border-[#F55353] pl-8">
                  <h3 className="text-2xl font-bold mb-3 text-white">6.69% Annual Profit Returns</h3>
                  <p className="text-[#a8d4ff] leading-7">
                    Every year, receive 6.69% of the property's net rental profits. Payments calculated from actual short-term rental operations and distributed annually with full financial documentation.
                  </p>
                </div>

                <div className="border-l-4 border-[#F55353] pl-8">
                  <h3 className="text-2xl font-bold mb-3 text-white">Contract Completion at ROI Threshold</h3>
                  <p className="text-[#a8d4ff] leading-7">
                    Once your cumulative returns reach 6.69% of your initial investment (approximately 90-120 months depending on profitability), your contract automatically completes. You receive full liquidity and exit.
                  </p>
                </div>

                <div className="border-l-4 border-[#F55353] pl-8">
                  <h3 className="text-2xl font-bold mb-3 text-white">Transparent Financial Reporting</h3>
                  <p className="text-[#a8d4ff] leading-7">
                    Annual audited statements show property revenues, operating expenses, and your exact profit allocation. Full transparency on how returns are calculated. All reports verified by independent accountants.
                  </p>
                </div>

                <div className="border-l-4 border-[#F55353] pl-8">
                  <h3 className="text-2xl font-bold mb-3 text-white">Legal Contracts & Protection</h3>
                  <p className="text-[#a8d4ff] leading-7">
                    All investment agreements drafted and reviewed by independent legal counsel. Clear contract terms, regulatory compliance verification, and professional dispute resolution processes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Project Status */}
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold mb-12 text-center" style={{ fontFamily: 'Tai Heritage Pro, serif' }}>
              Investment Payout Timeline
            </h2>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-6">
                {[
                  { year: '2025', status: 'Excavations Complete - Operations Begin', color: 'from-[#F55353] to-[#d14a4a]' },
                  { year: '2025-2029', status: 'Annual 6.69% Profit Returns Distributed', color: 'from-[#F55353] to-[#d14a4a]' },
                  { year: '2029', status: 'Project Completion - Property Fully Operational', color: 'from-[#F55353] to-[#d14a4a]' },
                  { year: 'Contract Ends', status: 'Once You Reach 6.69% ROI (90-120 months)', color: 'from-[#d14a4a] to-[#c23a3a]' },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-6 items-start">
                    <div className={`bg-gradient-to-r ${item.color} rounded-full w-16 h-16 flex items-center justify-center flex-shrink-0`}>
                      <span className="font-bold text-lg">{'✓'}</span>
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-[#999] font-semibold">{item.year}</p>
                      <p className="text-2xl font-bold mt-2 text-white">{item.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Investment Inquiry Form */}
        <section id="investment-inquiry" className="py-16 sm:py-20 bg-[#0a0e27]">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4 text-white" style={{ fontFamily: 'Tai Heritage Pro, serif' }}>
                  Begin Your Investment Journey
                </h2>
                <p className="text-[#F55353]">
                  Submit your information and our legal team will contact you within 48 hours with full investment details and contract options.
                </p>
              </div>

              <div className="rounded-2xl border border-[#F55353]/30 bg-[#111] p-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <label className="block">
                    <span className="text-sm font-semibold uppercase tracking-[0.1em] text-[#F55353]">Full Name *</span>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-[#F55353]/30 bg-[#111] px-4 py-3 text-white placeholder-[#666] focus:outline-none focus:border-[#F55353] focus:ring-2 focus:ring-[#F55353]/20"
                      placeholder="Your full name"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold uppercase tracking-[0.1em] text-[#F55353]">Email Address *</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-[#F55353]/30 bg-[#111] px-4 py-3 text-white placeholder-[#666] focus:outline-none focus:border-[#F55353] focus:ring-2 focus:ring-[#F55353]/20"
                      placeholder="your@email.com"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold uppercase tracking-[0.1em] text-[#F55353]">Phone Number</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-[#F55353]/30 bg-[#111] px-4 py-3 text-white placeholder-[#666] focus:outline-none focus:border-[#F55353] focus:ring-2 focus:ring-[#F55353]/20"
                      placeholder="+1 876 555 0123"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold uppercase tracking-[0.1em] text-[#F55353]">Investment Interest *</span>
                    <select
                      required
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-[#F55353]/30 bg-[#111] px-4 py-3 text-white focus:outline-none focus:border-[#F55353] focus:ring-2 focus:ring-[#F55353]/20"
                    >
                      <option value="">Select an investment tier</option>
                      <option value="1M">Investor - JMD 1M</option>
                      <option value="3M">Premium - JMD 3M</option>
                      <option value="5M">Founder - JMD 5M</option>
                      <option value="other">Other Amount</option>
                    </select>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full bg-gradient-to-r from-[#F55353] to-[#d14a4a] px-6 py-4 text-sm font-semibold text-white shadow-xl shadow-[#F55353]/30 transition hover:shadow-[#F55353]/50 disabled:opacity-70"
                  >
                    {loading ? 'Submitting...' : 'Submit Investment Inquiry'}
                  </button>

                  {status && (
                    <p className={`text-sm ${status.type === 'success' ? 'text-[#F55353]' : 'text-[#ff6b6b]'}`}>
                      {status.message}
                    </p>
                  )}

                  <p className="text-xs text-[#666] text-center mt-4">
                    By submitting, you agree to be contacted by Dosnine and our legal partners regarding this investment opportunity. All information will be handled with complete confidentiality.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Legal Notice */}
        <section className="py-16 border-t border-[#F55353]/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl rounded-2xl border border-[#F55353]/30 bg-[#111] p-8">
              <h3 className="text-xl font-bold mb-4 text-white">⚖️ Legal & Professional Oversight</h3>
              <p className="text-[#ccc] mb-4">
                All investment agreements are prepared, reviewed, and processed by independent legal counsel. Each investor receives:
              </p>
              <ul className="space-y-3 text-[#ccc]">
                <li>✓ Professionally drafted investment contract with ROI termination clause</li>
                <li>✓ Independent legal review and counsel</li>
                <li>✓ Complete financial transparency and audited statements</li>
                <li>✓ Annual profit calculations and 6.69% return documentation</li>
                <li>✓ Regulatory compliance verification</li>
                <li>✓ Automatic contract completion upon ROI threshold</li>
              </ul>
              <p className="text-sm text-[#666] mt-6 italic">
                This is a professional short-term rental investment opportunity. All contracts require legal processing. We recommend consulting with your personal legal and financial advisors before investing.
              </p>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        :global(body) {
          background: #0a0e27;
        }
      `}</style>
    </>
  );
}
