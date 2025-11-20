import Head from "next/head";
import Link from "next/link";
import Faq from "../components/Faqs/Faq";
import ImagePopup from "../components/Misc/ImagePopup";
import {
  Users,
  ShieldCheck,
  Zap,
  TrendingUp,
  ChartArea,
  Wallet,
  Tags,
  Ungroup,
  Smartphone,
  Plus,
  Star,
  Play,
  Facebook,
  Linkedin,
  Twitter,
} from "lucide-react";

export default function ExpenseTrackerLanding() {
  return (
    <>
      <Head>
        <title>Expense Goose | Smart Expense Tracking Software</title>
        <meta
          name="description"
          content="Expense Goose is the smart way to track expenses, manage petty cash, and take control of your business finances. Try our free demo or unlock premium forever for a one-time fee."
        />
        <meta
          name="keywords"
          content="expense tracking, petty cash app, small business budget tool, free expense tracker, finance automation"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://expensegoose.com/" />
        <meta property="og:title" content="Expense Goose | The Smart Way to Track Expenses" />
        <meta property="og:description" content="Control your cash, track expenses, and simplify business finance with Expense Goose." />
        <meta property="og:url" content="https://expensegoose.com/" />
        <meta property="og:image" content="https://expensegoose.com/images/og-card.jpg" />
        <meta name="theme-color" content="#16a34a" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Expense Goose",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "All",
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "reviewCount": "12000",
              },
              "offers": {
                "@type": "Offer",
                "price": "15",
                "priceCurrency": "USD",
              },
              "url": "https://expensegoose.com/",
            }),
          }}
        />
      </Head>

      <main className="bg-white min-h-screen">
        {/* HERO */}
        <section className="max-w-6xl mx-auto px-6 py-20 text-center relative overflow-hidden">
          <div className=" pointer-events-none" />
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Simplify <span className="text-green-600">Expense Tracking</span> for
            Your Business
          </h1>
          <p className="text-lg sm:text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
The fun, smart way to manage expenses
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/dashboard"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-4 rounded-lg text-lg shadow-lg transition-transform hover:-translate-y-1"
            >
              Get Started Free
            </Link>

         
           
            {/* <Link
              href="/demo"
              className="border border-green-600 text-green-700 hover:bg-green-50 font-semibold px-8 py-4 rounded-lg text-lg transition-transform hover:-translate-y-1"
            >
              Watch Demo
            </Link> */}
          </div>

          <div className="flex flex-wrap justify-center gap-6 mt-10">
            <div className="flex items-center gap-2 text-gray-600 text-base">
              <Users className="w-5 h-5 text-green-500" />
              <span>1,200+ Monthly Users</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-base">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <span>Bank-Level Security</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-base">
              <Star className="w-5 h-5 text-green-500" />
              <span>4.9/5 User Rating</span>
            </div>
          </div>
        </section>

        {/* DEMO SECTION */}
        <section id="demo" className="py-24 bg-gray-50 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-gray-900">
                Track. Analyze. Grow.
              </h2>
              <p className="text-gray-600 text-lg">
                Monitor your business performance, analyze spending patterns,
                and make informed financial decisions — all from one clean
                dashboard.
              </p>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-center gap-3">
                  <ChartArea className="text-green-600 w-6 h-6" /> Visual
                  analytics & spending trends
                </li>
                <li className="flex items-center gap-3">
                  <Wallet className="text-green-600 w-6 h-6" /> Budget
                  monitoring with live alerts
                </li>
                <li className="flex items-center gap-3">
                  <Tags className="text-green-600 w-6 h-6" /> Auto-categorized
                  transactions
                </li>
              </ul>
            </div>

            <div className="relative bg-white shadow-xl border border-gray-200 rounded-xl p-6">
                <ImagePopup
              src="demo2.png"
              alt="Expense Goose Expense Tracking Screenshot"
              width={1080}
              height={720}
            />
              <div className="absolute -top-3 -right-3 bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                New
              </div>
            </div>
          </div>
        </section>

        {/* QUICK EXPENSE ENTRY */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 space-y-6">
              <h2 className="text-4xl font-bold text-gray-900">
                Add Expenses Instantly
              </h2>
              <p className="text-gray-600 text-lg">
                Log expenses in seconds with our one-click entry system.
                Simplify tracking and focus on running your business.
              </p>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-center gap-3">
                  <Zap className="text-green-600 w-6 h-6" /> One-tap logging from
                  any device
                </li>
                <li className="flex items-center gap-3">
                  <Ungroup className="text-green-600 w-6 h-6" /> Custom
                  categories and templates
                </li>
                <li className="flex items-center gap-3">
                  <Smartphone className="text-green-600 w-6 h-6" /> Works
                  seamlessly on mobile
                </li>
              </ul>
              <Link
                href="/signup"
                className="inline-block mt-6 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-green-700"
              >
                Try Quick Entry
              </Link>
            </div>

            <div className="order-1 lg:order-2">
              <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Example Quick Entry
                </h3>
                <div className="space-y-3">
                  {[
                    { name: "Fuel Refill", category: "Transport", cost: "$65" },
                    { name: "Groceries", category: "Food", cost: "$120" },
                    { name: "Office Rent", category: "Operations", cost: "$900" },
                  ].map((exp, i) => (
                    <div
                      key={i}
                      className="flex justify-between bg-white p-3 rounded-lg border border-gray-100"
                    >
                      <span>{exp.name}</span>
                      <span className="text-green-600 font-semibold">
                        {exp.cost}
                      </span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-5 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg flex items-center justify-center transition">
                  <Plus className="w-4 h-4 mr-2" /> Add New Expense
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="py-24 bg-gray-50 border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Trusted by Businesses Worldwide
            </h2>
            <p className="text-gray-600 text-lg mb-16">
              Join thousands of entrepreneurs and small business owners who
              manage millions through Expense Goose.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
              {[
                ["15k+", "Active Users"],
                ["$22M+", "Expenses Tracked"],
                ["98%", "User Satisfaction"],
                ["12K+", "Five-Star Reviews"],
              ].map(([stat, label], i) => (
                <div key={i}>
                  <div className="text-4xl font-extrabold text-green-600">
                    {stat}
                  </div>
                  <p className="text-gray-700">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-green-600 text-center mt-4 text-white">
          <h2 className="text-4xl font-extrabold mb-4">
            Get Lifetime Access for Just $4.99/Yr
          </h2>
          <p className="text-lg max-w-2xl mx-auto mb-6">
            Pay once. Use forever. Unlock advanced features, reports, and
            financial tools for your business.
          </p>
          <Link
            href="/pricing"
            className="bg-white text-green-700 hover:bg-gray-100 font-semibold text-lg px-8 py-4 rounded-lg shadow transition"
          >
            Unlock Lifetime Access
          </Link>
        </section>

        {/* FAQ */}
        <Faq />
      </main>
    </>
  );
}
