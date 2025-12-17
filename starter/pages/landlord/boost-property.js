import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Zap, TrendingUp, Eye, Clock, AlertCircle } from 'lucide-react';
import { FiCopy, FiCheck, FiAlertCircle, FiUpload } from 'react-icons/fi';
import Link from 'next/link';
import { formatJMD } from '../../lib/formatMoney';
import axios from 'axios';

const MAX_ACTIVE_BOOSTS = 20;
const BOOST_PRICE_JMD = 1550; // Approximately $10 USD
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
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const bankDetails = [
    {
      bank: "Scotiabank Jamaica",
      accountName: "Dosnine Properties",
      accountNumber: "010860258",
      branch: "50575"
    },
    {
      bank: "National Commercial Bank (NCB)",
      accountName: "Dosnine Properties",
      accountNumber: "404386522",
      branch: "uwi"
    },
    {
      bank: "Jamaica National Bank (JN)",
      accountName: "Dosnine Properties",
      accountNumber: "2094746895",
      branch: "Any Branch"
    }
  ];

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

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success(`${field} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload JPG, PNG, or PDF file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setProofFile(file);
  };

  const handleSubmitProof = async () => {
    if (!proofFile) {
      toast.error('Please upload payment proof');
      return;
    }

    if (!selectedProperty) {
      toast.error('Please select a property');
      return;
    }

    setUploading(true);
    try {
      // Get user data
      const { data: dbUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user.id)
        .single();

      if (userError || !dbUser) {
        throw new Error('User not found');
      }

      // Upload file directly to Supabase Storage (client-side)
      const timestamp = Date.now();
      const fileExt = proofFile.name.split('.').pop();
      const filePath = `boost-payment-proofs/${selectedProperty.id}_${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('agent-documents')
        .upload(filePath, proofFile, {
          contentType: proofFile.type,
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload file: ' + uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('agent-documents')
        .getPublicUrl(filePath);

      // Create boost record with pending status
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + BOOST_DURATION_DAYS);

      const { error: boostError } = await supabase
        .from('property_boosts')
        .insert({
          property_id: selectedProperty.id,
          owner_id: dbUser.id,
          payment_id: `boost_${timestamp}`,
          amount: BOOST_PRICE_JMD,
          currency: 'JMD',
          boost_start_date: now.toISOString(),
          boost_end_date: endDate.toISOString(),
          status: 'active',
          payment_proof_url: urlData.publicUrl
        });

      if (boostError) {
        console.error('Boost creation error:', boostError);
        throw new Error('Failed to create boost');
      }

      // Mark property as featured
      await supabase
        .from('properties')
        .update({ is_featured: true })
        .eq('id', selectedProperty.id);

      toast.success('Payment proof submitted! Your property boost is now active.');
      router.push('/landlord/dashboard');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to submit proof. Please try again.');
    } finally {
      setUploading(false);
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
        <h1 className="text-4xl font-extrabold text-gray-800 flex items-center gap-3 mb-2">
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
          <Link href="/landlord/dashboard" className="btn-primary">
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
              <Link href="/landlord/new-property" className="btn-primary">
                Post a Property
              </Link>
            </div>
          )}

          {/* Payment Section */}
          {selectedProperty && (
            <div className="bg-white border-2 border-gray-200 rounded-lg p-8">
              <button
                onClick={() => setSelectedProperty(null)}
                className="btn-outline btn-sm"
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

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 mb-6">
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>✓ {BOOST_DURATION_DAYS} days of featured placement</li>
                  <li>✓ Rotating banner on every page</li>
                  <li>✓ 10-minute rotation cycle with up to {MAX_ACTIVE_BOOSTS} properties</li>
                  <li>✓ Detailed analytics and performance tracking</li>
                  <li>✓ Cancel anytime (pro-rated refund available)</li>
                </ul>
                <div className="flex justify-start items-center mt-4">
                  <span className="text-2xl font-bold text-gray-800 mr-2">Boost Price:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatJMD(BOOST_PRICE_JMD)}
                  </span>
                </div>
              </div>

              {/* Bank Transfer Instructions */}
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <FiAlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Payment Instructions</h3>
                    <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
                      <li>Transfer J${BOOST_PRICE_JMD.toLocaleString()} to any of the bank accounts below</li>
                      <li>In the transfer notes/description, include: <strong>Your Email</strong> and <strong>Property: {selectedProperty.slug}</strong></li>
                      <li>Take a screenshot or photo of the receipt</li>
                      <li>Upload the proof below</li>
                    </ol>
                  </div>
                </div>

                {bankDetails.map((bank, index) => {
                  const cardColors = {
                    "Scotiabank Jamaica": "bg-red-50 border-l-4 border-red-500",
                    "National Commercial Bank (NCB)": "bg-blue-50 border-l-4 border-blue-500",
                    "Jamaica National Bank (JN)": "bg-yellow-50 border-l-4 border-yellow-500"
                  };
                  const headerColors = {
                    "Scotiabank Jamaica": "text-red-700 border-red-200",
                    "National Commercial Bank (NCB)": "text-blue-700 border-blue-200",
                    "Jamaica National Bank (JN)": "text-yellow-700 border-yellow-200"
                  };
                  return (
                  <div key={index} className={`rounded-lg p-4 mb-3 last:mb-0 ${cardColors[bank.bank] || 'bg-white'}`}>
                    <h4 className={`font-semibold mb-3 border-b pb-2 ${headerColors[bank.bank] || 'text-gray-900'}`}>{bank.bank}</h4>
                    <div className="space-y-2">
                      {Object.entries(bank).filter(([key]) => key !== 'bank').map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{value}</span>
                            <button
                              onClick={() => copyToClipboard(value, `${bank.bank}-${key}`)}
                              className="text-blue-600 hover:text-blue-700 p-1"
                            >
                              {copied === `${bank.bank}-${key}` ? <FiCheck size={14} /> : <FiCopy size={14} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  );
                })}

                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                  <p className="text-xs text-yellow-800">
                    <strong>Important:</strong> Include your email ({user?.primaryEmailAddress?.emailAddress}) and property slug ({selectedProperty.slug}) in the payment notes so we can verify your payment quickly.
                  </p>
                </div>
              </div>

              {/* Upload Proof */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Upload Payment Proof (Receipt/Screenshot)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-accent transition">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="proof-upload"
                  />
                  <label htmlFor="proof-upload" className="cursor-pointer">
                    <div className="text-gray-600">
                      {proofFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <FiCheck className="text-green-600" size={24} />
                          <span className="font-medium text-green-600">{proofFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm">Click to upload or drag and drop</p>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 5MB</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitProof}
                disabled={!proofFile || uploading}
                className="w-full btn-primary btn-lg"
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Submitting...
                  </div>
                ) : (
                  'Submit Payment Proof'
                )}
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                ⏱️ Verification typically takes 12-24 hours during business days
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
