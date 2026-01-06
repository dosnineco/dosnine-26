import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ParishRequestAnalytics from '../components/ParishRequestAnalytics';
import { MapPin, TrendingUp, Home, Users, DollarSign } from 'lucide-react';
import { useRoleProtection } from '../lib/useRoleProtection';
import { isVerifiedAgent } from '../lib/rbac';

export default function MarketAnalyticsPage() {
  const router = useRouter();
  
  // Protect route - only verified agents can access
  const { loading: authLoading, userData } = useRoleProtection({
    checkAccess: isVerifiedAgent,
    redirectTo: '/agent/signup',
    message: 'Agent verification required to access market analytics'
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Market Analytics', href: '/market' }
  ];

  return (
    <>
      <Head>
        <title>Jamaica Real Estate Market Analytics | Live Demand by Parish | Dosnine</title>
        <meta 
          name="description" 
          content="Real-time Jamaica real estate market analytics showing demand trends by parish. Track visitor interest, service requests, and budget ranges across all 14 parishes. Data-driven insights for property investors and real estate professionals."
        />
        <meta name="keywords" content="Jamaica real estate market, property market trends, Jamaica parishes, real estate analytics, housing demand, investment insights" />
        <meta name="og:title" content="Jamaica Real Estate Market Analytics" />
        <meta name="og:description" content="Real-time market data for Jamaica real estate across all 14 parishes" />
        <meta name="og:type" content="website" />
        <meta name="og:image" content={`${process.env.NEXT_PUBLIC_SITE_URL}/og-market.png`} />
        
        {/* Structured Data - BreadcrumbList */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": process.env.NEXT_PUBLIC_SITE_URL
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Market Analytics",
                "item": `${process.env.NEXT_PUBLIC_SITE_URL}/market`
              }
            ]
          })}
        </script>

        {/* Structured Data - Organization */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Jamaica Real Estate Market Analytics",
            "description": "Real-time market analytics for Jamaica real estate",
            "url": `${process.env.NEXT_PUBLIC_SITE_URL}/market`,
            "publisher": {
              "@type": "Organization",
              "name": "Dosnine Properties",
              "logo": {
                "@type": "ImageObject",
                "url": `${process.env.NEXT_PUBLIC_SITE_URL}/logo.png`
              }
            }
          })}
        </script>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Main Content */}
        <div className="container mx-auto px-4 py-12">
          
          {/* Analytics Component */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-12">
            <ParishRequestAnalytics />
          </div>

          {/* Market Insights Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">What This Data Means</h3>
              <ul className="space-y-4 text-gray-800">
                <li className="flex gap-3">
                  <span className="text-accent font-bold">→</span>
                  <span><strong>Visitor Interest</strong> shows the percentage of market search activity by parish</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-accent font-bold">→</span>
                  <span><strong>Service Requests</strong> indicates qualified buyer/renter inquiries</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-accent font-bold">→</span>
                  <span><strong>Budget Distribution</strong> reveals what buyers can afford in each area</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-accent font-bold">→</span>
                  <span><strong>Trending Areas</strong> identifies emerging hotspots with recent activity</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-accent font-bold">→</span>
                  <span><strong>Price Ranges</strong> show average buyer expectations by location</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">How to Use This Data</h3>
              <ul className="space-y-4 text-gray-800">
                <li className="flex gap-3">
                  <Home className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span><strong>Property Owners:</strong> Price competitively based on market demand</span>
                </li>
                <li className="flex gap-3">
                  <TrendingUp className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span><strong>Investors:</strong> Identify undervalued areas with growing demand</span>
                </li>
                <li className="flex gap-3">
                  <Users className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span><strong>Real Estate Pros:</strong> Guide clients to high-opportunity markets</span>
                </li>
                <li className="flex gap-3">
                  <DollarSign className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span><strong>Developers:</strong> Plan projects where demand is strongest</span>
                </li>
              </ul>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">How is this data collected?</h4>
                <p className="text-gray-800">
                  Data comes from actual visitor searches, service requests, and property inquiries on Dosnine. 
                  We track parish preferences, budget ranges, and market activity patterns to provide real-time insights.
                </p>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">How often is data updated?</h4>
                <p className="text-gray-800">
                  Market analytics are updated in real-time as new visitors and requests come in. The data reflects 
                  the latest market activity across Jamaica.
                </p>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Who should use this data?</h4>
                <p className="text-gray-800">
                  Property owners, real estate investors, agents, developers, and anyone making decisions about Jamaica's 
                  real estate market can benefit from these insights.
                </p>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Why is market analytics important?</h4>
                <p className="text-gray-800">
                  Understanding real demand patterns helps you price properties competitively, identify emerging opportunities, 
                  and make investment decisions backed by actual market behavior rather than speculation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
