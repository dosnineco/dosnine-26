import Head from 'next/head';
import { useState } from 'react';

export default function HillLotLandingPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState('investor');
  const [tier, setTier] = useState('income-only');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!fullName.trim() || !email.trim()) {
      setStatus({ type: 'error', message: 'Please enter your full name and email.' });
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
          interest,
          tier,
          message,
        }),
      });

      const text = await response.text();
      let payload = null;
      try {
        payload = JSON.parse(text);
      } catch (err) {
        console.error('Server returned HTML instead of JSON:', text);
        setStatus({
          type: 'error',
          message: 'Unexpected server response. Please try again or contact hello@dosnine.com.',
        });
        return;
      }

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to register your interest.');
      }

      setStatus({ type: 'success', message: payload.message || 'Thank you! Your interest has been registered.' });
      setFullName('');
      setEmail('');
      setPhone('');
      setInterest('investor');
      setTier('income-only');
      setMessage('');
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>The Sligoville Villa Interest Registration</title>
        <meta
          name="description"
          content="Register your interest in The Sligoville Villa luxury hillside ownership and priority bookings with Dosnine Limited."
        />
        <meta property="og:title" content="The Sligoville Villa Interest Registration" />
        <meta
          property="og:description"
          content="Secure priority access to The Sligoville Villa investment and booking opportunities through Dosnine Limited."
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

      <main className="bg-[#eff5f2] text-[#10201a]">
        <section className="relative overflow-hidden bg-white py-16 sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(66,132,117,0.14),transparent_30%)]" />
          <div className="relative container mx-auto px-4">
            <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="space-y-6 max-w-3xl">
                <p className="inline-flex rounded-full border border-[#428475] bg-[#eaf3ef] px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-[#2f5d4a]">
                  The Sligoville Villa
                </p>
                <h1 className="text-5xl font-semibold tracking-[-0.03em] sm:text-6xl" style={{ fontFamily: 'Tai Heritage Pro, serif' }}>
                  Luxury hillside ownership and priority bookings for modern investors.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-[#42574d]">
                  A curated hospitality offering presented through Dosnine Limited, combining premium villa living with passive investment opportunity in Sligoville, St. Catherine, Jamaica.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 sm:max-w-md">
                  <div className="rounded-[2rem] border border-[#d8e6dd] bg-[#f8fbf8] p-6">
                    <p className="text-sm uppercase tracking-[0.32em] text-[#5f7f72]">Minimum Commitment</p>
                    <p className="mt-3 text-3xl font-semibold text-[#10201a]">USD 22,000</p>
                  </div>
                  <div className="rounded-[2rem] border border-[#d8e6dd] bg-[#f8fbf8] p-6">
                    <p className="text-sm uppercase tracking-[0.32em] text-[#5f7f72]">Target Yield</p>
                    <p className="mt-3 text-3xl font-semibold text-[#10201a]">15%–20%</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <a
                    href="#interest-form"
                    className="inline-flex w-full justify-center rounded-full bg-[#428475] px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-[#42847540] transition hover:bg-[#346a5a] sm:w-auto"
                  >
                    Register Your Interest
                  </a>
                  <a
                    href="https://nurayacollection.myflodesk.com/f0amx7epzs"
                    className="inline-flex w-full justify-center rounded-full border border-[#428475] bg-white px-6 py-4 text-sm font-semibold text-[#428475] transition hover:bg-[#4284750d] sm:w-auto"
                  >
                    Investor Deck
                  </a>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[2rem] border border-[#d8e6dd] bg-[#f6faf6] shadow-2xl shadow-[#00000014]">
                <img
                  src="https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1400&q=80"
                  alt="The Sligoville Villa hillside property"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#10201a]/85 via-transparent p-6 text-white">
                  <p className="text-xs uppercase tracking-[0.32em] text-[#d2efe4]">Sligoville, St. Catherine, Jamaica</p>
                  <p className="mt-2 text-xl font-semibold">Launch access priority</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="grid gap-8 lg:grid-cols-3">
              {[
                {
                  title: 'Premium Luxury Villa Living',
                  details: 'Experience exclusive hillside living with panoramic mountain views, private pool, rooftop entertainment space, luxury interiors, and premium outdoor amenities.',
                },
                {
                  title: 'Passive Investment Structure',
                  details: 'Invest through Dosnine Limited with professional property management, hospitality operations, and investor reporting.',
                },
                {
                  title: 'Priority Booking Access',
                  details: 'Book villa stays before public launch with exclusive investor and launch-member packages.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-[2rem] border border-[#d8e6dd] bg-white p-8 shadow-sm">
                  <h3 className="text-xl font-semibold text-[#10201a]">{item.title}</h3>
                  <p className="mt-4 text-[#42574d] leading-7">{item.details}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="interest-form" className="bg-[#f8faf6] py-16 sm:py-20">
          <div className="container mx-auto px-4 grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="space-y-6 max-w-2xl">
              <p className="text-sm uppercase tracking-[0.32em] text-[#428475] font-semibold">Priority registration</p>
              <h2 className="text-4xl font-semibold text-[#10201a]">Investors and bookers can secure early access today</h2>
              <p className="text-[#42574d] leading-8">
                Share your interest and we will contact you with an investor briefing, booking details, and the next steps for The Sligoville Villa.
              </p>
            </div>

            <div className="rounded-[2rem] border border-[#d8e6dd] bg-white p-8 shadow-xl">
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-[#10201a]">Full Name</span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="naya-input mt-3"
                    placeholder="Your full name"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-[#10201a]">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="naya-input mt-3"
                    placeholder="you@email.com"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-[#10201a]">Phone</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="naya-input mt-3"
                    placeholder="+1 876 555 0123"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-[#10201a]">I am interested in</span>
                  <select
                    value={interest}
                    onChange={(event) => setInterest(event.target.value)}
                    className="naya-input mt-3"
                  >
                    <option value="investor">Investor only</option>
                    <option value="booker">Booking Only</option>
                    <option value="both">Investor & Booking</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-[#10201a]">Preferred tier</span>
                  <select
                    value={tier}
                    onChange={(event) => setTier(event.target.value)}
                    className="naya-input mt-3"
                  >
                    <option value="income-only">Income Only Tier</option>
                    <option value="hybrid-tier">Hybrid Tier</option>
                    <option value="premium-access">Premium Access Tier</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-[#10201a]">Message</span>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="naya-input mt-3 min-h-[140px] resize-none"
                    placeholder="Share what you are looking for"
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-full bg-[#428475] px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-[#42847540] transition hover:bg-[#346a5a] disabled:opacity-70"
                >
                  {loading ? 'Submitting...' : 'Send My Interest'}
                </button>

                {status ? (
                  <p className={`text-sm ${status.type === 'success' ? 'text-[#1f5d44]' : 'text-[#9d2d17]'}`}>
                    {status.message}
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </section>

        <section className="bg-[#f4f7f1] py-16 sm:py-20">
          <div className="container mx-auto px-4 grid gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.32em] text-[#428475] font-semibold">Development timeline</p>
              <h2 className="text-4xl font-semibold text-[#10201a]">Current status and completion target</h2>
              <p className="text-[#42574d] leading-8">
                Land acquisition and project planning phase.
              </p>
              <div className="rounded-[2rem] border border-[#d8e6dd] bg-white p-8">
                <p className="text-sm uppercase tracking-[0.32em] text-[#5f7f72]">Target completion date</p>
                <p className="mt-4 text-3xl font-semibold text-[#10201a]">Q3 2030</p>
                <p className="mt-4 text-[#42574d] leading-7">
                  Construction and phased development updates will be shared with registered investors and priority members.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="container mx-auto px-4 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.32em] text-[#428475] font-semibold">Investment profile</p>
              <p className="text-4xl font-semibold text-[#10201a]">Designed for investors seeking exposure to luxury hospitality real estate.</p>
              <p className="text-[#42574d] leading-8">
                The Sligoville Villa is structured to combine passive cash flow, premium accommodation access, and professionally managed hospitality operations through Dosnine Limited.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[2rem] border border-[#d8e6dd] bg-[#f7faf8] p-6">
                  <p className="text-sm uppercase tracking-[0.32em] text-[#5f7f72]">Hospitality asset</p>
                  <p className="mt-4 text-base text-[#42574d] leading-7">A fully managed luxury villa property designed for short-term vacation rentals, retreats, and premium guest experiences.</p>
                </div>
                <div className="rounded-[2rem] border border-[#d8e6dd] bg-[#f7faf8] p-6">
                  <p className="text-sm uppercase tracking-[0.32em] text-[#5f7f72]">Market access</p>
                  <p className="mt-4 text-base text-[#42574d] leading-7">Investor capital combines with Jamaica's growing tourism market and premium vacation rental demand.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#d8e6dd] bg-[#eff7f0] p-10 shadow-sm">
              <p className="text-sm uppercase tracking-[0.32em] text-[#428475] font-semibold">Registered company</p>
              <h3 className="mt-4 text-3xl font-semibold text-[#10201a]">Dosnine Limited</h3>
              <p className="mt-4 text-[#42574d] leading-7">
                Naya Zanzibar is presented through a registered partnership with Dosnine Limited and The Nuraya Collection, giving investors a local operating partner and credible market presence.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a href="https://invest.nurayacollection.com/" className="inline-flex w-full justify-center rounded-full border border-[#428475] bg-white px-5 py-3 text-sm font-semibold text-[#428475] transition hover:bg-[#4284750d] sm:w-auto">
                  Investor Information
                </a>
                <a href="mailto:hello@dosnine.com" className="inline-flex w-full justify-center rounded-full bg-[#428475] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#346a5a] sm:w-auto">
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f0f6f1] py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="rounded-[2rem] border border-[#d8e6dd] bg-white p-10 shadow-sm text-center">
              <p className="text-sm uppercase tracking-[0.32em] text-[#428475] font-semibold">Legal note</p>
              <p className="mt-4 text-[#42574d] leading-8 max-w-3xl mx-auto">
                The Sligoville Villa is a hospitality development interest registration managed through Dosnine Limited. This website is provided for informational purposes only and does not constitute investment advice, a public offer of securities, or a guarantee of investment returns.
              </p>
              <p className="mt-4 text-[#42574d] leading-8 max-w-3xl mx-auto">
                All projected yields, timelines, and development plans are subject to change based on market conditions, approvals, financing, and construction progress.
              </p>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        :global(body) {
          background: #eff5f2;
        }
        .naya-input {
          width: 100%;
          min-height: 3rem;
          border-radius: 1rem;
          border: 1px solid #c9dbd3;
          padding: 1rem 1rem;
          font-size: 1rem;
          color: #10201a;
          background: #ffffff;
        }
        .naya-input:focus {
          outline: none;
          border-color: #428475;
          box-shadow: 0 0 0 4px rgba(66, 132, 117, 0.12);
        }
      `}</style>
    </>
  );
}
