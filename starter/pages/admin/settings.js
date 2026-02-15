import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import Head from 'next/head';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';

export default function AdminSettingsPage() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const [requestPrice, setRequestPrice] = useState(500);


  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  const [paymentSettings, setPaymentSettings] = useState({
    agent_claim_price: 2500,
    featured_listing_price: 5000,
    priority_boost_price: 3500,
    currency: 'JMD'
  });

  /* ===============================
     ADMIN ACCESS CHECK
  =============================== */
  useEffect(() => {
    const checkAdmin = async () => {
      if (!isSignedIn || !user) {
        router.push('/');
        return;
      }

      try {
        const email = user.emailAddresses?.[0]?.emailAddress;

        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('email', email)
          .single();

        if (error || !data || data.role !== 'admin') {
          toast.error('You do not have admin access');
          router.push('/');
          return;
        }

        setIsAdmin(true);
        setLoading(false);
      } catch (err) {
        console.error(err);
        toast.error('Failed to verify admin');
        router.push('/');
      }
    };

    checkAdmin();
  }, [isSignedIn, user]);

  /* ===============================
     FETCH SETTINGS
  =============================== */
  useEffect(() => {
    if (isAdmin) fetchSettings();
  }, [isAdmin]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'payment_config')
        .single();

        if (data?.value) {
            setPaymentSettings(data.value.plan_prices || {});
            setRequestPrice(data.value.request_price || 500);
            }


      if (error && error.code !== 'PGRST116') throw error;

    //   if (data?.value) {
    //     setPaymentSettings(data.value);
    //   }
    } catch (err) {
      console.error('Fetch settings error:', err);
      toast.error('Failed to load settings');
    }
  };

  /* ===============================
     UPDATE SETTINGS
  =============================== */
  const updateSettings = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: 'payment_config',
          value: {
            request_price: requestPrice,
            plan_prices: paymentSettings
            },
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Payment settings updated');
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-10 w-10 border-b-2 border-orange-600 rounded-full"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <>
      <Head>
        <title>Admin Settings - DoSnine</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <AdminLayout />

        <div className="max-w-5xl mx-auto px-6 py-10">

          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">

            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Payment Configuration
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Agent Claim Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Claim Price
                </label>
                <input
                  type="number"
                  value={paymentSettings.agent_claim_price}
                  onChange={(e) =>
                    setPaymentSettings({
                      ...paymentSettings,
                      agent_claim_price: Number(e.target.value)
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Individual Request Price (JMD)
  </label>
  <input
    type="number"
    value={requestPrice}
    onChange={(e)=>setRequestPrice(Number(e.target.value))}
    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
  />
</div>


              {/* Featured Listing Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Featured Listing Price
                </label>
                <input
                  type="number"
                  value={paymentSettings.featured_listing_price}
                  onChange={(e) =>
                    setPaymentSettings({
                      ...paymentSettings,
                      featured_listing_price: Number(e.target.value)
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Priority Boost */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Boost Price
                </label>
                <input
                  type="number"
                  value={paymentSettings.priority_boost_price}
                  onChange={(e) =>
                    setPaymentSettings({
                      ...paymentSettings,
                      priority_boost_price: Number(e.target.value)
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <input
                  type="text"
                  value={paymentSettings.currency}
                  onChange={(e) =>
                    setPaymentSettings({
                      ...paymentSettings,
                      currency: e.target.value
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

            </div>

            <div className="mt-8">
              <button
                onClick={updateSettings}
                disabled={saving}
                className="px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

          </div>

        </div>
      </div>
    </>
  );
}
