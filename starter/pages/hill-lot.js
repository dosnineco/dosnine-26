import Head from 'next/head';
import { useState } from 'react';

export default function HillLotLandingPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stayType, setStayType] = useState('couples');
  
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
          stayType,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to submit your booking request.');
      }

      setStatus({ type: 'success', message: payload.message || 'Your request has been sent. We will reach out soon.' });
      setFullName('');
      setEmail('');
      setPhone('');
      setStayType('pre-registration (end 2030)');
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>The Hill Lot Airbnb | Sligoville Mountains Retreat</title>
        <meta
          name="description"
          content="Book The Hill Lot Airbnb in Sligoville, 37 minutes from Kingston. Couples and small families enjoy clean mountain air, sweeping views, and peaceful night skies for JMD 11,300 per night."
        />
        <meta property="og:title" content="The Hill Lot Airbnb | Sligoville Mountains Retreat" />
        <meta
          property="og:description"
          content="A hilltop Airbnb getaway in Sligoville with mountain views, cool breezes, and quiet nights. Book now for couples and small families."
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
            <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="space-y-6 max-w-3xl">
                <p className="inline-flex rounded-full border border-[#4b7e6c] bg-[#e8f3ed] px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-[#2f5d4a]">
                  The Hill Lot Airbnb
                </p>
                <h1 className="text-5xl font-semibold tracking-[-0.03em] sm:text-6xl" style={{ fontFamily: 'Tai Heritage Pro, serif' }}>
                  A quiet hilltop Airbnb retreat in Sligoville, 37 minutes from Kingston.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-[#42574d]">
                  Experience mountain air, sweeping views, and peaceful nights in a cozy hilltop home made for couples and small families. Stay at The Hill Lot Airbnb for JMD 11,300 per night and reconnect with nature.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 sm:max-w-md">
                  <div className="rounded-[2rem] border border-[#d8e6dd] bg-[#f8fbf8] p-6">
                    <p className="text-sm uppercase tracking-[0.32em] text-[#5f7f72]">Nightly rate</p>
                    <p className="mt-3 text-3xl font-semibold text-[#10201a]">JMD 11,300</p>
                  </div>
                  <div className="rounded-[2rem] border border-[#d8e6dd] bg-[#f8fbf8] p-6">
                    <p className="text-sm uppercase tracking-[0.32em] text-[#5f7f72]">Distance from Kingston</p>
                    <p className="mt-3 text-3xl font-semibold text-[#10201a]">37 minutes</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <a
                    href="#booking-form"
                    className="inline-flex w-full justify-center rounded-full bg-[#428475] px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-[#42847540] transition hover:bg-[#346a5a] sm:w-auto"
                  >
                    Request a stay
                  </a>
                  <a
                    href="https://wa.me/18763369045?text=I%20want%20to%20learn%20more%20about%20The%20Hill%20Lot%20Airbnb%20stay%20and%20bookings."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full justify-center rounded-full border border-[#428475] bg-white px-6 py-4 text-sm font-semibold text-[#428475] transition hover:bg-[#4284750d] sm:w-auto"
                  >
                    Chat on WhatsApp
                  </a>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[2rem] border border-[#d8e6dd] bg-[#f6faf6] shadow-2xl shadow-[#00000014]">
                <img
                  src="/thehilllot.png"
                  alt="The Hill Lot Airbnb hillside property in Sligoville"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#10201a]/85 via-transparent p-6 text-white">
                  <p className="text-xs uppercase tracking-[0.32em] text-[#d2efe4]">Sligoville mountains, Jamaica</p>
                  <p className="mt-2 text-xl font-semibold">Quiet hilltop views and clean mountain air</p>
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
                  title: 'Mountain views',
                  details: 'Wake up to wide views over the Sligoville hills, cool breezes, and a calm natural setting designed for rest and quiet',
                },
                {
                  title: 'Couples and small families',
                  details: 'Comfortable rooms and shared spaces that are perfect for couples or a small family seeking a short getaway near Kingston.',
                },
                {
                  title: 'Starry night skies',
                  details: 'Enjoy clear night skies and gentle breezes away from city lights for a memorable evening outdoors.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-[2rem] border border-[#d8e6dd] bg-white p-8 shadow-sm">
                  <h3 className="text-xl font-semibold text-[#10201a]">{item.title}</h3>
                  <p className="mt-4 whitespace-pre-line text-[#42574d] leading-7">{item.details}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="booking-form" className="bg-[#f8faf6] py-16 sm:py-20">
          <div className="container mx-auto px-4 grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="space-y-6 max-w-2xl">
              <p className="text-sm uppercase tracking-[0.32em] text-[#428475] font-semibold">Booking request</p>
              <h2 className="text-4xl font-semibold text-[#10201a]">Request your Hill Lot Airbnb stay today</h2>
              <p className="text-[#42574d] leading-8">
                Send us your details and preferred dates, and we will respond with availability, check-in guidance, and confirmation for your Sligoville mountain escape.
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
                  <span className="text-sm font-semibold text-[#10201a]">Stay type</span>
                  <select
                    value={stayType}
                    onChange={(event) => setStayType(event.target.value)}
                    className="naya-input mt-3"
                  >
                    <option value="couples">Couples retreat</option>
                    <option value="small-family">Small family getaway</option>
                    <option value="friends">Friends escape</option>
                  </select>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-full bg-[#428475] px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-[#42847540] transition hover:bg-[#346a5a] disabled:opacity-70"
                >
                  {loading ? 'Sending request...' : 'Send booking request'}
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

        <section className="bg-white py-16 sm:py-20">
          <div className="container mx-auto px-4 grid gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.32em] text-[#428475] font-semibold">Why stay here</p>
              <h2 className="text-4xl font-semibold text-[#10201a]">A natural hilltop stay built around fresh air and mountain calm.</h2>
              <p className="text-[#42574d] leading-8">
                The Hill Lot Airbnb offers easy access to Kingston while keeping you nestled in the Sligoville mountains. Relax with mountain views, clean air, and beautiful night skies.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[2rem] border border-[#d8e6dd] bg-[#f7faf8] p-6">
                  <p className="text-sm uppercase tracking-[0.32em] text-[#5f7f72]">Quiet location</p>
                  <p className="mt-4 text-base text-[#42574d] leading-7">A peaceful hilltop setting ideal for unplugging and recharging in nature.</p>
                </div>
                <div className="rounded-[2rem] border border-[#d8e6dd] bg-[#f7faf8] p-6">
                  <p className="text-sm uppercase tracking-[0.32em] text-[#5f7f72]">Fresh mountain air</p>
                  <p className="mt-4 text-base text-[#42574d] leading-7">Cool breezes, crisp evenings, and clean air make every stay feel restorative.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#d8e6dd] bg-[#eff7f0] p-10 shadow-sm">
              <p className="text-sm uppercase tracking-[0.32em] text-[#428475] font-semibold">Space for small groups</p>
              <h3 className="mt-4 text-3xl font-semibold text-[#10201a]">Designed for couples and small families</h3>
              <p className="mt-4 text-[#42574d] leading-7">
                Comfortable shared spaces, private sleeping areas, and room to enjoy the outdoors make this the perfect mountain escape for small groups.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#f0f6f1] py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="rounded-[2rem] border border-[#d8e6dd] bg-white p-10 shadow-sm lg:flex lg:items-center lg:justify-between gap-8">
              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.32em] text-[#428475] font-semibold">Investor inquiry</p>
                <h2 className="text-3xl font-semibold text-[#10201a]">Interested in a hilltop investment?</h2>
                <p className="text-[#42574d] leading-7">
                  For investor conversations about The Hill Lot, please contact us on WhatsApp. Minimum inquiry is JMD 500,000.
                </p>
              </div>
              <a
                href="https://wa.me/18763369045?text=I%20am%20interested%20in%20investing%20in%20The%20Hill%20Lot%20Airbnb%20(min%20JMD%20500%2C000)."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full justify-center rounded-full bg-[#428475] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#346a5a] sm:w-auto"
              >
                WhatsApp investor inquiry
              </a>
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
