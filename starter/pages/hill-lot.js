import Head from 'next/head';
import { useState } from 'react';

export default function HillLotLandingPage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState('stay');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setStatus({ type: 'error', message: 'Please enter your email address.' });
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
        body: JSON.stringify({ email, phone, interest }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to join the waiting list.');
      }

      setStatus({ type: 'success', message: payload.message || 'You are now on the waiting list.' });
      setEmail('');
      setPhone('');
      setInterest('stay');
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Hill Lot Airbnb Pre-Registration | Dosnine</title>
        <meta
          name="description"
          content="Join the waiting list for the Hill Lot Airbnb launch. Get early access, exclusive offers, and first updates for this new boutique stay experience."
        />
        <meta property="og:title" content="Hill Lot Airbnb Pre-Registration | Dosnine" />
        <meta
          property="og:description"
          content="Join the waiting list for the Hill Lot Airbnb launch. Get early access, exclusive offers, and first updates."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://dosnine.com/hill-lot" />
      </Head>

      <main className="bg-gray-50 text-gray-900">
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,191,0,0.18),_transparent_45%)] pb-20 pt-16 md:pb-28">
          <div className="container mx-auto px-4">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="space-y-6 max-w-2xl">
                <span className="inline-flex rounded-full bg-black text-white px-4 py-1 text-xs uppercase tracking-[0.28em] font-semibold">
                  Hill Lot Airbnb
                </span>
                <div className="space-y-4">
                  <p className="text-sm uppercase tracking-[0.35em] text-gray-500">Rooms & suites</p>
                  <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
                    Welcome to<br /> Rooftop & spa
                  </h1>
                  <p className="text-sm uppercase tracking-[0.35em] text-gray-500">Opening 2028</p>
                  <p className="mt-4 text-lg leading-8 text-gray-700">
                    An experiential stay where timeless design meets modern luxury, elevated service, and curated local culture. Be the first to experience the Hill Lot Airbnb launch with early access invites, exclusive rates, and launch updates.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <a href="#waiting-list" className="btn-accent btn-lg w-full text-center sm:w-auto">
                    Join the Waiting List
                  </a>
                  <a href="#features" className="btn-outline w-full text-center sm:w-auto">
                    Explore the Experience
                  </a>
                </div>
              </div>

              <div className="relative">
                <div className="rounded-[2rem] overflow-hidden bg-gray-200 shadow-2xl shadow-gray-300/20">
                  <img
                    src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
                    alt="Luxury rooftop lounge"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-gray-50 via-transparent" />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="container mx-auto px-4 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.35em] text-accent font-semibold">Join the waiting list</p>
              <h2 className="text-4xl font-bold text-gray-900">Sign up for early access, exclusive offers, and launch updates.</h2>
              <p className="max-w-xl text-gray-600 leading-7">
                Hill Lot Airbnb is opening soon. Register now to receive first access to booking windows, launch packages, and curated stay experiences designed for modern travelers.
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
                  <p className="text-sm uppercase tracking-[0.35em] text-gray-500">Curated stays</p>
                  <p className="mt-3 text-base text-gray-700">Boutique rooms, privacy, and local rooftop moments.</p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
                  <p className="text-sm uppercase tracking-[0.35em] text-gray-500">Exclusive offers</p>
                  <p className="mt-3 text-base text-gray-700">Launch pricing and VIP booking notifications.</p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
                  <p className="text-sm uppercase tracking-[0.35em] text-gray-500">Local wellness</p>
                  <p className="mt-3 text-base text-gray-700">Rooftop spa, curated dining, and elevated service.</p>
                </div>
              </div>
            </div>

            <div id="waiting-list" className="rounded-[2rem] border border-gray-200 bg-gray-50 p-8 shadow-sm">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Waiting list form</p>
                <h3 className="text-3xl font-semibold text-gray-900">Reserve your place on the launch list</h3>
                <p className="text-gray-600 leading-7">
                  Enter your details below and we will send you the first announcement when booking opens for Hill Lot Airbnb.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="input mt-2"
                    placeholder="you@email.com"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">Phone (optional)</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="input mt-2"
                    placeholder="+1 876 555 0123"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">Your interest</span>
                  <select
                    value={interest}
                    onChange={(event) => setInterest(event.target.value)}
                    className="input mt-2"
                  >
                    <option value="stay">Stay & launch updates</option>
                    <option value="invest">Investment opportunity</option>
                    <option value="both">Stay + investment</option>
                  </select>
                </label>

                <button type="submit" className="btn-accent btn-lg w-full" disabled={loading}>
                  {loading ? 'Joining...' : 'Join the Waiting List'}
                </button>

                {status ? (
                  <p className={`text-sm ${status.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                    {status.message}
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </section>

        <section id="features" className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl text-center mb-12">
              <p className="text-sm uppercase tracking-[0.35em] text-accent font-semibold">What to expect</p>
              <h2 className="mt-3 text-4xl font-bold text-gray-900">Experience more than just a stay</h2>
              <p className="mt-4 text-gray-600 leading-7">
                Refined luxury meets vibrant culture, local craft, and unforgettable hospitality — all set within an elevated boutique retreat.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {[
                {
                  title: 'Refined Luxury',
                  description: 'Elegant interiors, handcrafted details, and world-class comfort come together for a stay that feels effortlessly indulgent.',
                  label: 'Luxury',
                },
                {
                  title: 'Vibrant Culture',
                  description: 'Immerse yourself in the living heritage of the hill lot stay where local craft, design, and culture shape every detail.',
                  label: 'Culture',
                },
                {
                  title: 'Excellent Location',
                  description: 'Minutes from the island’s best attractions with nature, dining, and adventure wrapped around your doorstep.',
                  label: 'Location',
                },
                {
                  title: 'Impressive Experience',
                  description: 'From sunset rooftop dinners to thoughtful service, every moment is curated to delight and leave a lasting impression.',
                  label: 'Experience',
                },
              ].map((item) => (
                <div key={item.title} className="group rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-accent">
                    {item.label}
                  </span>
                  <h3 className="mt-5 text-2xl font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-4 text-gray-600 leading-7">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-gray-900 via-gray-800 to-black py-20 text-white">
          <div className="container mx-auto px-4 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.35em] text-blue-200">Invest & become a co-owner</p>
              <h2 className="text-4xl font-bold">Own a share of the property and operating business</h2>
              <p className="max-w-xl text-gray-200 leading-7">
                Earn passive income through annual profit payouts and long-term returns while helping launch a premium hill lot boutique stay experience.
              </p>

              <a
                href="https://dosnine.com"
                className="btn-outline inline-flex rounded-full border-white text-white hover:bg-white hover:text-gray-900"
              >
                Learn More
              </a>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-8 backdrop-blur-xl">
              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.35em] text-blue-200">Community first</p>
                <h3 className="text-3xl font-semibold">Join the launch community</h3>
                <p className="text-gray-200 leading-7">
                  Stay in the loop about ownership opportunities, earnings potential, and how the Hill Lot Airbnb will shape future island hospitality.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mb-12 text-center">
              <p className="text-sm uppercase tracking-[0.35em] text-gray-500 font-semibold">Stories from the hill lot</p>
              <h2 className="mt-3 text-4xl font-bold text-gray-900">Design, hospitality, and local inspiration</h2>
              <p className="mt-4 text-gray-600 leading-7">
                Explore our curated stories and early insights into the Hill Lot Airbnb journey.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {[
                {
                  title: 'The Art of Island Hospitality',
                  description: 'A story about thoughtful service, local craft, and how every guest experience is designed to feel personal.',
                  author: 'Ariel Grant',
                },
                {
                  title: 'Dining with a View',
                  description: 'Discover the culinary vision behind our rooftop menus and how the island’s flavors shape every plate.',
                  author: 'Nia Clarke',
                },
                {
                  title: 'A New Era of Boutique Stays',
                  description: 'How the Hill Lot Airbnb is redefining modern leisure with calm design and unforgettable moments.',
                  author: 'Miles Bennett',
                },
              ].map((item) => (
                <article key={item.title} className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition">
                  <p className="mb-3 text-xs uppercase tracking-[0.35em] text-gray-500">Marrakesh Guide</p>
                  <h3 className="text-2xl font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-4 text-gray-600 leading-7">{item.description}</p>
                  <p className="mt-6 text-sm font-semibold text-gray-900">{item.author}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
