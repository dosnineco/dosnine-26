import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Zap, TrendingUp, Eye, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { formatJMD } from '../../lib/formatMoney';

const MAX_ACTIVE_BOOSTS = 20;
const BOOST_PRICE_JMD = 2500;
const BOOST_DURATION_DAYS = 10;

export default function BoostProperty() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeBoostsCount, setActiveBoostsCount] = useState(0);
  const [nextAvailableDate, setNextAvailableDate] = useState(null);
  const [existingBoosts, setExistingBoosts] = useState([]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push('/');
      return;
    }
    fetchData();
  }, [isLoaded, user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get user's UUID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user.id)
        .single();

      if (userError) throw userError;

      // Fetch user's properties
      const { data: propsData, error: propsError } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', userData.id)
        .eq('status', 'available')
        .order('created_at', { ascending: false });

      if (propsError) throw propsError;
      setProperties(propsData || []);

      // Check active boosts globally (for queue limit)
      const { data: activeBoosts, error: boostsError } = await supabase
        .from('property_boosts')
        .select('*')
        .eq('status', 'active')
        .gte('boost_end_date', new Date().toISOString());

      if (boostsError) throw boostsError;
      
      setActiveBoostsCount(activeBoosts?.length || 0);

      // Check user's existing active boosts
      const { data: userBoosts, error: userBoostsError } = await supabase
        .from('property_boosts')
        .select('*, properties(title, slug)')
        .eq('owner_id', userData.id)
        .eq('status', 'active')
        .gte('boost_end_date', new Date().toISOString());

      if (userBoostsError) throw userBoostsError;
      setExistingBoosts(userBoosts || []);

      // Calculate next available date if queue is full
      if (activeBoosts && activeBoosts.length >= MAX_ACTIVE_BOOSTS) {
        const sortedBoosts = activeBoosts.sort((a, b) => 
          new Date(a.boost_end_date) - new Date(b.boost_end_date)
        );
        const earliestEndDate = new Date(sortedBoosts[0].boost_end_date);
        setNextAvailableDate(earliestEndDate);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId) => {
    if (!selectedProperty) return;

    try {
      // Get user's UUID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user.id)
        .single();

      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + BOOST_DURATION_DAYS);

      // Create boost record
      const { data: boost, error: boostError } = await supabase
        .from('property_boosts')
        .insert({
          property_id: selectedProperty.id,
          owner_id: userData.id,
          payment_id: paymentId,
          amount: BOOST_PRICE_JMD,
          currency: 'JMD',
          boost_start_date: now.toISOString(),
          boost_end_date: endDate.toISOString(),
          status: 'active'
        })
        .select()
        .single();

      if (boostError) throw boostError;

      // Mark property as featured
      await supabase
        .from('properties')
        .update({ is_featured: true })
        .eq('id', selectedProperty.id);

      toast.success('Property boost activated successfully!');
      router.push('/properties/my-listings');
    } catch (err) {
      console.error('Error activating boost:', err);
      toast.error('Failed to activate boost. Please contact support.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  const canBoost = activeBoostsCount < MAX_ACTIVE_BOOSTS;
  const slotsRemaining = MAX_ACTIVE_BOOSTS - activeBoostsCount;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        {/* <Link href="/properties/my-listings" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to Dashboard
        </Link> */}
        <h1 className="text-4xl font-extrabold text-gray-800 flex items-center gap-3 mb-2">
          {/* <Zap className="text-yellow-500 h-10 w-10" /> */}
          Boost Your Property
        </h1>
        <p className="text-gray-600 text-md">
          Get featured placement and 10x more visibility for 10 days
        </p>
      </div>

      {/* Availability Status */}
      <div className={`p-2 rounded-lg w- mb-8 ${canBoost ? 'bg-green-50 border-2 border-green-200' : 'bg-yellow-50 border-2 border-yellow-300'}`}>
        <div className="flex items-start gap-4">
          <AlertCircle className={`h-6 w-6 ${canBoost ? 'text-green-600' : 'text-yellow-600'} mt-1`} />
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2">Availability Status</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-semibold">Current status:</span> {canBoost ? (
                <span className="text-green-600 font-bold">{slotsRemaining} slots Open </span>
              ) : (
                <span className="text-red-600 font-bold">All spots filled</span>
              )}</p>
              {!canBoost && nextAvailableDate && (
                <p className="mt-2 text-yellow-800">
                  <span className="font-semibold">Next available:</span> {new Date(nextAvailableDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

     

      {/* Existing Active Boosts */}
      {existingBoosts.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-bold text-lg mb-4">Your Active Boosts</h3>
          <div className="space-y-3">
            {existingBoosts.map((boost) => (
              <div key={boost.id} className="bg-white p-4 rounded border border-blue-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{boost.properties?.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Ends: {new Date(boost.boost_end_date).toLocaleDateString()}
                    </p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-gray-600">
                        <Eye className="inline h-4 w-4 mr-1" />
                        {boost.impressions} views
                      </span>
                      <span className="text-gray-600">
                        {boost.clicks} clicks
                      </span>
                    </div>
                  </div>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!canBoost && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-800 mb-2">All Boost Spots Filled</h3>
          <p className="text-gray-700 mb-4">
            We limit boosts to {MAX_ACTIVE_BOOSTS} properties at a time to ensure fair visibility for all advertisers.
          </p>
          {nextAvailableDate && (
            <p className="text-lg font-semibold text-yellow-800">
              Next available spot: {new Date(nextAvailableDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          <Link href="/properties/my-listings" className="inline-block mt-6 px-6 py-3 rounded-lg btn-accent">
            Back to Dashboard
          </Link>
        </div>
      )}

      {canBoost && (
        <>
          {/* Property Selection */}
          {!selectedProperty && properties.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Select Property to Boost</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {properties.map((property) => {
                  const hasActiveBoost = existingBoosts.some(b => b.property_id === property.id);
                  return (
                    <div
                      key={property.id}
                      onClick={() => !hasActiveBoost && setSelectedProperty(property)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                        hasActiveBoost
                          ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60'
                          : 'bg-white border-gray-200 hover:border-blue-500'
                      }`}
                    >
                      <h3 className="font-bold text-lg">{property.title}</h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {property.parish} • {property.bedrooms} bed • {formatJMD(property.price)}/month
                      </p>
                      {hasActiveBoost && (
                        <span className="inline-block mt-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                          Already Boosted
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {properties.length === 0 && (
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600 mb-4">You don't have any available properties to boost.</p>
              <Link href="/properties/new" className="inline-block px-6 py-3 rounded-lg btn-accent">
                Post a Property
              </Link>
            </div>
          )}

          {/* Payment Section */}
          {selectedProperty && (
            <div className="bg-white border-2 border-gray-200 rounded-lg p-8">
              <button
                onClick={() => setSelectedProperty(null)}
                className="text-accent hover:underline mb-4"
              >
                ← Change Property
              </button>
              
              <div className="mb-6">
                <h3 className="font-bold text-xl mb-2">Selected Property</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg">{selectedProperty.title}</h4>
                  <p className="text-gray-600 text-sm mt-1">
                    {selectedProperty.parish} • {selectedProperty.bedrooms} bed • {formatJMD(selectedProperty.price)}/month
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50  rounded-lg p-6 mb-6">
               
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>✓ {BOOST_DURATION_DAYS} days of featured placement</li>
                  <li>✓ Rotating banner on every page</li>
                  <li>✓ 10-minute rotation cycle with up to {MAX_ACTIVE_BOOSTS} properties</li>
                  <li>✓ Detailed analytics and performance tracking</li>
                  <li>✓ Cancel anytime (pro-rated refund available)</li>
                </ul>
                 <div className="flex justify-start items-center mb-4">
                  <span className="text-2xl font-bold text-gray-800 mr-2">Boost Price:</span>
                  <span className="text-2xl  font-bold text-green-600 ">
                    {formatJMD(BOOST_PRICE_JMD)}
                  </span>
                </div>
              </div>

              <PayPalScriptProvider options={{ "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID }}>
                <PayPalButtons
                  style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
                  createOrder={(data, actions) => {
                    return actions.order.create({
                      purchase_units: [
                        {
                          description: `Property Boost: ${selectedProperty.title}`,
                          amount: {
                            value: (BOOST_PRICE_JMD / 155).toFixed(2), // Convert JMD to USD (approximate rate: 155 JMD = 1 USD)
                          },
                        },
                      ],
                    });
                  }}
                  onApprove={(data, actions) => {
                    return actions.order.capture().then(() => {
                      handlePaymentSuccess(data.orderID);
                    });
                  }}
                  onError={(err) => {
                    console.error('PayPal Checkout Error:', err);
                    toast.error('Payment failed. Please try again.');
                  }}
                />
              </PayPalScriptProvider>
            </div>
          )}
        </>
      )}

      
    </div>
  );
}
