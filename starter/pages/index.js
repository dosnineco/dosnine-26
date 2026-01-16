import Head from 'next/head';
import PropertyRequestsMarketplace from '../components/PropertyRequestsMarketplace';
// import BecomeAgentBanner from '../components/BecomeAgentBanner';
import VisitorEmailPopup from '../components/VisitorEmailPopup';

export default function PropertyRequestsPage() {
  return (
    <>
      <Head>
        <title>Live Property Requests from Buyers & Renters | Dosnine Jamaica</title>
        <meta name="description" content="Real buyers and renters looking for properties in Jamaica right now. Claim a request to get their contact details. Connect with verified property seekers instantly." />
        <meta property="og:title" content="Live Property Requests from Buyers & Renters - Dosnine" />
        <meta property="og:description" content="These are real people looking for properties. Claim a request to get their contact details. Live property marketplace in Jamaica." />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:type" content="website" />
        <meta name="keywords" content="property requests Jamaica, buyers looking for property, renters looking for property, property marketplace Jamaica, real estate leads Jamaica" />
        <link rel="canonical" href="https://dosnine.com/" />
      </Head>
      {/* <BecomeAgentBanner /> */}
          <VisitorEmailPopup/>
      
      <PropertyRequestsMarketplace />
    </>
  );
}
