import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { MapPin, DollarSign, Home, Calendar, Star, Lock, Zap } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const SERVICE_PRICE_USD = 49.99;
const USD_TO_JMD = 155;
const formatJmd = (usd) => `~JMD ${Math.round(usd * USD_TO_JMD).toLocaleString()}`;

export default function PremiumServiceRequest() {
  const { user } = useUser();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [step, setStep] = useState(1); // 1: Select Agent, 2: Submit Request
  const [isPremium, setIsPremium] = useState(false);

  const [formData, setFormData] = useState({
    agentId: null,
    propertyType: 'residential',
    location: '',
    budgetMin: '',
    budgetMax: '',
    bedrooms: '',
    bathrooms: '',
    timeline: 'flexible',
    requirements: '',
  });

  useEffect(() => {
    fetchVerifiedAgents();
    checkPremiumStatus();
  }, []);

  const fetchVerifiedAgents = async () => {
    try {
      const response = await axios.get('/api/agents/verified');
      setAgents(response.data.agents || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const checkPremiumStatus = async () => {
    try {
      const response = await axios.get('/api/user/premium-status', {
        headers: { 'x-user-id': user?.id },
      });
      setIsPremium(response.data.isPremium);
    } catch (error) {
      console.error('Error checking premium status:', error);
    }
  };

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--accent-color)] to-[var(--accent-color-hover)] p-4 flex items-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-2xl p-8 text-center">
          <Lock className="w-16 h-16 text-[var(--accent-color)] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Find Me a Place (Done‑For‑You)</h1>
          <p className="text-gray-600 mb-6">
            We'll match you with a specific verified agent and deliver 3 options within 72 hours.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-700 mb-3">
              <strong>What you get:</strong>
            </p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✓ Select from verified agents</li>
              <li>✓ Priority request handling</li>
              <li>✓ Direct agent communication</li>
              <li>✓ 30-day request validity</li>
            </ul>
          </div>
          <div className="mb-6">
            <p className="text-3xl font-bold text-[var(--accent-color)] mb-1">${SERVICE_PRICE_USD.toFixed(2)}</p>
            <p className="text-sm text-gray-600">One-time fee • includes 30 days of follow-up</p>
            <p className="text-xs text-gray-500 mt-1">{formatJmd(SERVICE_PRICE_USD)} (est.)</p>
          </div>
          <div className="mt-4">
            <PayPalScriptProvider options={{ "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID }}>
              <PayPalButtons
                style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
                createOrder={(data, actions) => {
                  return actions.order.create({
                    purchase_units: [
                      {
                        description: `Find Me a Place (Done-For-You)`,
                        amount: { value: SERVICE_PRICE_USD.toFixed(2) },
                      },
                    ],
                  });
                }}
                onApprove={async (data, actions) => {
                  try {
                    await actions.order.capture();
                    if (user?.id) {
                      const res = await axios.post('/api/user/upgrade-premium', { userId: user.id });
                      if (res.data.success) {
                        toast.success('Premium activated!');
                        setIsPremium(true);
                      } else {
                        toast.error(res.data.error || 'Failed to activate premium');
                      }
                    } else {
                      toast.error('Please sign in to continue');
                    }
                  } catch (err) {
                    console.error('PayPal capture error', err);
                    toast.error('Payment failed. Please try again.');
                  }
                }}
                onError={(err) => {
                  console.error('PayPal Checkout Error:', err);
                  toast.error('Payment failed. Please try again.');
                }}
              />
            </PayPalScriptProvider>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-color)] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading verified agents...</p>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
              <Star className="w-8 h-8 text-[var(--accent-color)] mr-2" />
              Request a Verified Agent
            </h1>
            <p className="text-gray-600 mt-2">
              Select a verified agent to help you find your ideal property
            </p>
          </div>

          {/* Agent Grid */}
          {agents.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">No verified agents available at the moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map(agent => (
                <div
                  key={agent.id}
                  onClick={() => {
                    setSelectedAgent(agent);
                    setFormData(prev => ({ ...prev, agentId: agent.id }));
                    setStep(2);
                  }}
                  className={`bg-white rounded-lg shadow-lg p-6 cursor-pointer transition transform hover:shadow-xl hover:scale-105 ${
                    selectedAgent?.id === agent.id ? 'ring-2 ring-[var(--accent-color)]' : ''
                  }`}
                >
                  {/* Agent Name */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-800">{agent.full_name}</h3>
                    <p className="text-sm text-[var(--accent-color)] font-semibold">
                      {agent.agent_specialization || 'General Agent'}
                    </p>
                  </div>

                  {/* Info */}
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p className="flex items-center">
                      <Home className="w-4 h-4 mr-2 text-[var(--accent-color)]" />
                      {agent.agent_years_experience || 0}+ years experience
                    </p>
                    <p className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-[var(--accent-color)]" />
                      {agent.agent_business_name || 'Nationwide'}
                    </p>
                  </div>

                  {/* CTA */}
                  <button
                    className="w-full bg-[var(--accent-color)] hover:bg-[var(--accent-color-hover)] text-white px-4 py-2 rounded font-semibold transition"
                  >
                    Select This Agent
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 2: Submit request to selected agent
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => setStep(1)}
            className="text-[var(--accent-color)] hover:text-[var(--accent-color-hover)] font-semibold mb-4"
          >
            ← Back to Agents
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Request Details</h1>
          <p className="text-gray-600 mt-2">
            Agent: <strong>{selectedAgent?.full_name}</strong>
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const response = await axios.post(
                  '/api/service-requests/premium',
                  {
                    agentId: formData.agentId,
                    propertyType: formData.propertyType,
                    location: formData.location,
                    budgetMin: parseFloat(formData.budgetMin),
                    budgetMax: parseFloat(formData.budgetMax),
                    bedrooms: parseInt(formData.bedrooms) || null,
                    bathrooms: parseInt(formData.bathrooms) || null,
                    timeline: formData.timeline,
                    requirements: formData.requirements,
                  },
                  {
                    headers: { 'x-user-id': user?.id },
                  }
                );

                if (response.data.success) {
                  toast.success('Request sent to agent!');
                  setStep(1);
                  setFormData({
                    agentId: null,
                    propertyType: 'residential',
                    location: '',
                    budgetMin: '',
                    budgetMax: '',
                    bedrooms: '',
                    bathrooms: '',
                    timeline: 'flexible',
                    requirements: '',
                  });
                  setSelectedAgent(null);
                }
              } catch (error) {
                toast.error(error.response?.data?.error || 'Failed to send request');
              }
            }}
            className="space-y-6"
          >
            {/* Property Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Property Type
              </label>
              <select
                value={formData.propertyType}
                onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="land">Land</option>
                <option value="mixed">Mixed Use</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Preferred Location / Parish
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter location or area"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none"
                required
              />
            </div>

            {/* Budget */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Min Budget
                </label>
                <input
                  type="number"
                  value={formData.budgetMin}
                  onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max Budget
                </label>
                <input
                  type="number"
                  value={formData.budgetMax}
                  onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none"
                  required
                />
              </div>
            </div>

            {/* Bedrooms & Bathrooms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bedrooms
                </label>
                <input
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  placeholder="Any"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bathrooms
                </label>
                <input
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  placeholder="Any"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none"
                />
              </div>
            </div>

            {/* Timeline */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Timeline
              </label>
              <select
                value={formData.timeline}
                onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none"
              >
                <option value="urgent">Urgent (ASAP)</option>
                <option value="1-3-months">1-3 Months</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>

            {/* Special Requirements */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Special Requirements
              </label>
              <textarea
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="Any special requirements or preferences..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 border border-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-[var(--accent-color)] hover:bg-[var(--accent-color-hover)] text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                Send Request to Agent
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
