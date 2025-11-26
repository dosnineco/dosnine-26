import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import { formatMoney } from '../../lib/formatMoney';

export default function Dashboard() {
  const { user } = useUser();
  const [stats, setStats] = useState({ properties: 0, applications: 0, activeListings: 0 });
  const [recentProperties, setRecentProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchDashboardData();
  }, [user]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      // Get user from database
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user.id)
        .single();

      if (!userData) return;

      // Fetch stats
      const { data: props } = await supabase
        .from('properties')
        .select('id, status')
        .eq('owner_id', userData.id);

      const { data: apps, count: appCount } = await supabase
        .from('applications')
        .select('id', { count: 'exact' })
        .in('property_id', (props || []).map((p) => p.id));

      setStats({
        properties: props?.length || 0,
        applications: appCount || 0,
        activeListings: props?.filter((p) => p.status === 'available').length || 0,
      });

      // Fetch recent properties
      const { data: recentProps } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', userData.id)
        .order('created_at', { ascending: false })
        ;

      setRecentProperties(recentProps || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Dashboard — Rentals Jamaica</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Welcome, {user?.firstName || 'Landlord'}!</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg  p-6">
            <div className="text-gray-600 text-sm font-semibold">Total Properties</div>
            <div className="text-4xl font-bold text-blue-600 mt-2">{stats.properties}</div>
          </div>
          <div className="bg-white rounded-lg  p-6">
            <div className="text-gray-600 text-sm font-semibold">Active Listings</div>
            <div className="text-4xl font-bold text-green-600 mt-2">{stats.activeListings}</div>
          </div>
         
        </div>

  

        {/* Recent Properties */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Recent Properties</h2>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : recentProperties.length === 0 ? (
            <p className="text-gray-500">You haven't posted any properties yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Title</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Price</th>
                    <th className="text-left py-3 px-4">Posted</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProperties.map((prop) => (
                    <tr key={prop.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{prop.title}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          prop.status === 'available' ? 'bg-green-100 text-green-700' :
                          prop.status === 'coming_soon' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {prop.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{formatMoney(prop.price)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(prop.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <Link href={`/property/${prop.slug}`} className="text-blue-600 hover:underline block">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}