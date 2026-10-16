import Head from 'next/head';
import AdminBuyerPrequalifications from '@/components/AdminBuyerPrequalifications';

export default function AdminBuyerPrequalificationsPage() {
  return (
    <>
      <Head>
        <title>Buyer Prequalifications — Dosnine Admin</title>
      </Head>
      <main className="mx-auto min-h-screen max-w-7xl  px-4 py-8">
        <AdminBuyerPrequalifications />
      </main>
    </>
  );
}
