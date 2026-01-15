import Head from 'next/head';
import PropertyRequestsMarketplace from '../components/PropertyRequestsMarketplace';

export default function PropertyRequestsPage() {
  return (
    <>
      <Head>
        <title>Property Requests - Find a Home Without Browsing | Dosnine</title>
        <meta name="description" content="Find a home without browsing hundreds of listings. Submit your property requirements and verified agents will contact you with options." />
        <meta property="og:title" content="Property Requests - Dosnine" />
        <meta property="og:description" content="Find a home without browsing hundreds of listings." />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:type" content="website" />
      </Head>
      <PropertyRequestsMarketplace />
    </>
  );
}
