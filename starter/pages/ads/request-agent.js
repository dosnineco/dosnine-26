import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { CheckCircle, XCircle } from 'lucide-react';

const JAMAICAN_PARISHES = [
  'Kingston','St. Andrew','St. Catherine','Clarendon','Manchester',
  'St. Elizabeth','Westmoreland','Hanover','St. James','Trelawny',
  'St. Ann','St. Mary','Portland','St. Thomas'
];

export default function RequestAgent() {
  const { user } = useUser();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    location: '',
    budget: ''
  });

  const [monthlyIncome, setMonthlyIncome] = useState(300000);
  const [nhtContribution, setNhtContribution] = useState(0);
  const [hasPartner, setHasPartner] = useState(false);
  const [partnerIncome, setPartnerIncome] = useState(0);

  /** Calculations (NOT SHOWN UNTIL CHECK) */
  const totalIncome = monthlyIncome + (hasPartner ? partnerIncome : 0);
  const maxMortgagePayment = Math.round(totalIncome * 0.45);
  const estimatedMortgage = Math.round(Number(formData.budget || 0) * 0.0075);
  const passed = estimatedMortgage <= maxMortgagePayment;

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        client_name: user.fullName || '',
        client_email: user.primaryEmailAddress?.emailAddress || ''
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCheck = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post('/api/service-requests/create', {
        clerkId: user?.id || null,
        clientName: formData.client_name,
        clientEmail: formData.client_email,
        clientPhone: formData.client_phone,
        requestType: 'buy',
        propertyType: 'house',
        location: formData.location,
        budgetMin: Number(formData.budget),
        budgetMax: Number(formData.budget),
        fromAds: true,
        consent: true, // 🔥 AUTO SET TRUE

        additionalData: {
          monthlyIncome,
          partnerIncome: hasPartner ? partnerIncome : 0,
          totalIncome,
          nhtContribution,
          estimatedMortgage,
          maxAllowedMortgage: maxMortgagePayment,
          passedReadiness: passed,
          country: 'Jamaica'
        }
      });

      setShowResult(true);

    } catch (err) {
      toast.error('Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Buyer Readiness Check | Jamaica</title>
      </Head>

      <Toaster />

      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-xl w-full bg-white rounded-xl shadow-xl p-8">

          <h1 className="text-2xl font-bold text-center">
            Jamaica Buyer Readiness Check
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Find out what you can truly afford in under 60 seconds
          </p>

          <form onSubmit={handleCheck}>

            <input className="input" placeholder="Full Name" name="client_name" value={formData.client_name} onChange={handleChange} required />
            <input className="input" placeholder="Email" name="client_email" value={formData.client_email} onChange={handleChange} required />
            <input className="input" placeholder="Phone" name="client_phone" value={formData.client_phone} onChange={handleChange} required />

            <select className="input" name="location" value={formData.location} onChange={handleChange} required>
              <option value="">Select Parish</option>
              {JAMAICAN_PARISHES.map(p => <option key={p}>{p}</option>)}
            </select>

            <input
              type="number"
              className="input"
              placeholder="Target Home Price (JMD)"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              required
            />

            <label className="label mt-4">Your Monthly Income (JMD)</label>
            <input type="range" min="150000" max="3000000" step="50000"
              value={monthlyIncome}
              onChange={e => setMonthlyIncome(Number(e.target.value))}
            />
            <p className="text-sm text-gray-600">
              {monthlyIncome.toLocaleString()}
            </p>

            <label className="label mt-4">NHT Balance (Optional)</label>
            <input
              type="number"
              className="input"
              value={nhtContribution}
              onChange={e => setNhtContribution(Number(e.target.value))}
            />

            <div className="mt-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" onChange={e => setHasPartner(e.target.checked)} />
                Partner contributing?
              </label>
            </div>

            {hasPartner && (
              <input
                type="number"
                className="input mt-2"
                placeholder="Partner Monthly Income"
                onChange={e => setPartnerIncome(Number(e.target.value))}
              />
            )}
          <label className="flex gap-2 mt-6 text-sm"> I agree to be contacted by a verified agent, once i check my Readiness </label>
            <button
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-lg mt-6 font-bold"
            >
              {loading ? 'Checking…' : 'Check Buyer Readiness'}
            </button>

          </form>
        </div>
      </div>

      {/* RESULT POPUP */}
      {showResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl max-w-sm w-full text-center">
            {passed ? (
              <CheckCircle className="mx-auto w-12 h-12 text-green-600" />
            ) : (
              <XCircle className="mx-auto w-12 h-12 text-yellow-500" />
            )}

            <h3 className="text-xl font-bold mt-4">
              Buyer Affordability Result
            </h3>

            <div className="mt-4 bg-gray-50 rounded-lg p-4 text-left">
              <p className="font-semibold">
                Max Affordable Mortgage
              </p>
              <p className="text-lg font-bold text-green-600">
                JMD {maxMortgagePayment.toLocaleString()}
              </p>

              <p className="font-semibold mt-3">
                Estimated Monthly Payment
              </p>
              <p className="text-lg font-bold text-black">
                JMD {estimatedMortgage.toLocaleString()}
              </p>
            </div>

            <button
              onClick={() => router.push('/')}
              className="mt-6 w-full bg-black text-white py-3 rounded-lg"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </>
  );
}
