import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRoleProtection } from '../../lib/useRoleProtection';
import { isVerifiedAgent, needsAgentPayment } from '../../lib/rbac';
import { Copy, Check, AlertCircle, ChevronDown, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const PRICING_TIERS = [
  { amount: 1710, requests: 3, label: 'Starter', description: 'Testing the platform' },
  { amount: 8250, requests: 15, label: 'Standard', description: 'Active agents' },
  { amount: 12000, requests: 24, label: 'Premium', description: 'Top performers', isStar: true }
];

export default function AgentPayment() {
  const { loading: authLoading, userData } = useRoleProtection({
    checkAccess: (data) => isVerifiedAgent(data) && needsAgentPayment(data),
    redirectTo: '/agent/dashboard',
  });

  const { user } = useUser();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [queueCount, setQueueCount] = useState(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState(1); // Default to Standard
  const [openFAQ, setOpenFAQ] = useState(null);

  // Fetch the number of unassigned requests in the queue
  useEffect(() => {
    const fetchQueueCount = async () => {
      try {
        const { count, error } = await supabase
          .from('service_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open');
        
        if (error) throw error;
        setQueueCount(count);
      } catch (error) {
        console.error('Error fetching queue count:', error);
        setQueueCount(null);
      } finally {
        setQueueLoading(false);
      }
    };

    fetchQueueCount();
  }, []);

  const selectedPrice = PRICING_TIERS[selectedTier];

  const bankDetails = [
    {
      bank: "Scotiabank Jamaica",
      accountName: "Tahjay Thompson",
      accountNumber: "010860258",
      branch: "50575"
    },
    {
      bank: "National Commercial Bank (NCB)",
      accountName: "Tahjay Thompson",
      accountNumber: "404386522",
      branch: "uwi"
    },
    {
      bank: "Jamaica National Bank (JN)",
      accountName: "Tahjay Thompson",
      accountNumber: "2094746895",
      branch: "Any Branch"
    }
  ];

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success(`${field} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Unlock Agent Access — Dosnine Properties</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
       

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-accent text-white px-8 py-6">
              <h1 className="text-3xl font-bold">Unlock Agent Features</h1>
              <p className="mt-2 text-white/90">One-time payment via bank transfer</p>
            </div>

            {/* Queue Status Alert with Live Pulse */}
            {!queueLoading && queueCount !== null && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-4 border-green-400 px-8 py-6 flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-green-400 rounded-full animate-pulse" style={{animationDuration: '1.5s'}}></div>
                  <div className="absolute inset-0 bg-green-300 rounded-full animate-pulse" style={{animationDuration: '2s', animationDelay: '0.3s'}}></div>
                  <div className="relative bg-green-500 rounded-full p-3">
                    <Activity className="w-8 h-8 text-white animate-pulse" style={{animationDuration: '2s'}} />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-green-900 font-bold text-lg">
                    <strong className="text-2xl text-green-600">{queueCount}</strong> active client {queueCount === 1 ? 'request' : 'requests'} waiting to be assigned
                  </p>
                  <p className="text-green-700 text-sm mt-2 font-medium">
                    Join our agents and start claiming high-value leads today.
                  </p>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="px-8 py-6">
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">What You'll Get:</h2>
                <ul className="space-y-3">
                  {[
                    'Access to all client requests (buy, rent, sell, lease)',
                    'Direct client contact information',
                    'Unlimited property postings',
                    'Priority listing placement',
                    'Real-time request notifications',
                    'Client dashboard and messaging'
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <svg className="w-6 h-6 text-accent mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pricing Tiers */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-6 text-center">Choose Your Plan</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PRICING_TIERS.map((tier, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedTier(idx)}
                      className={`p-6 rounded-lg border-2 transition ${
                        selectedTier === idx
                          ? 'border-accent bg-accent/5'
                          : 'border-gray-200 hover:border-accent/50'
                      }`}
                    >
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{tier.label}</h3>
                          {tier.isStar && <span className="text-xl">⭐</span>}
                        </div>
                        <p className="text-3xl font-bold text-accent mt-2">J${tier.amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-600 mt-1">{tier.requests} requests</p>
                        <p className="text-xs text-gray-500 mt-2 font-medium">{tier.description}</p>
                      </div>
                      {selectedTier === idx && (
                        <div className="mt-3 flex items-center text-accent">
                          <Check size={20} className="flex-shrink-0" />
                          <span className="ml-2 font-medium">Selected</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Plan Summary */}
              <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg p-6 mb-8 border-2 border-accent/30">
                <div className="text-center">
                  <p className="text-gray-600 text-sm uppercase tracking-widest font-semibold">You Selected</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <p className="text-4xl font-bold text-accent">{selectedPrice.label}</p>
                    {selectedPrice.isStar && <span className="text-2xl">⭐</span>}
                  </div>
                  <p className="text-5xl font-bold text-accent mt-3">J${selectedPrice.amount.toLocaleString()}</p>
                  <div className="mt-4 flex items-center justify-center gap-4 text-sm">
                    <span className="bg-accent/20 text-accent font-semibold px-3 py-1 rounded-full">{selectedPrice.requests} requests</span>
                    <span className="text-gray-600">{selectedPrice.description}</span>
                  </div>
                </div>
              </div>

              {/* Bank Transfer Instructions */}
              <div className="bg-gray-100 border-l-4 border-blue-500 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Payment Instructions</h3>
                    <ol className="text-blue-800 text-sm space-y-2 list-decimal list-inside">
                      <li><strong>Transfer J${selectedPrice.amount.toLocaleString()}</strong> to any of the bank accounts below</li>
                      <li>In transfer notes, include: <strong>Your Email</strong> + <strong>"{selectedPrice.label} Plan ({selectedPrice.requests} requests)"</strong></li>
                      <li>Screenshot or photo of receipt</li>
                      <li>Send proof via WhatsApp (button below)</li>
                    </ol>
                  </div>
                </div>

                {bankDetails.map((bank, index) => {
                  const cardColors = {
                    "Scotiabank Jamaica": "bg-red-200 border-l-4 border-red-500",
                    "National Commercial Bank (NCB)": "bg-blue-200 border-l-4 border-blue-500",
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
                              {copied === `${bank.bank}-${key}` ? <Check size={14} /> : <Copy size={14} />}
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
                    <strong>Important:</strong> Include your email ({user?.primaryEmailAddress?.emailAddress}) in the payment notes so we can verify your payment quickly.
                  </p>
                </div>
              </div>

              {/* WhatsApp Submission */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4 text-center">
                  After making the transfer, click the button below to message us your payment proof on WhatsApp
                </p>
                <a
                  href={`https://wa.me/18763369045?text=Hello%20Dosnine%20Team,%20I%20have%20submitted%20my%20agent%20payment.%20Here%20is%20my%20payment%20proof.%0A%0AEmail:%20${encodeURIComponent(user?.primaryEmailAddress?.emailAddress || 'YOUR_EMAIL')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full btn-primary btn-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.946 1.443c-3.056 2.068-5.01 5.033-5.01 8.15 0 1.325.264 2.605.788 3.823l-2.322 8.466 8.69-2.295c1.238.739 2.676 1.128 4.147 1.128h.004c4.676 0 8.488-3.812 8.488-8.488 0-2.26-.881-4.388-2.48-5.987-1.6-1.599-3.727-2.48-5.987-2.48"/>
                  </svg>
                  Message Payment Proof on WhatsApp
                </a>
              </div>

              <p className="text-center text-sm font-semibold text-green-700 mt-4 bg-green-50 px-4 py-3 rounded-lg">
                ✓ Verification 24hrs or less from sending proof
              </p>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-lg">Frequently Asked Questions</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {[
                {
                  question: "What's the difference between plans?",
                  answer: "Starter gives you 3 requests for J$1,710 - perfect for testing. Standard gives you 15 requests for J$8,250 for active agents. Premium gives you 24 requests for J$12,000 for top performers. Choose based on how many leads you want to handle."
                },
                {
                  question: "What types of requests are included?",
                  answer: "All plans include all request types: buy, rent, sell, lease, and valuations. Your request limit applies across all types combined."
                },
                {
                  question: "What happens when I reach my limit?",
                  answer: "You can upgrade to a higher tier or wait until next month. You'll be notified when approaching your limit so you can plan accordingly."
                },
                {
                  question: "How long does verification take?",
                  answer: "Verification takes 24 hours or less from sending your payment proof via WhatsApp. We'll email you once verified and your access is activated."
                },
                {
                  question: "Can I get a refund?",
                  answer: "Yes, within 7 days if you haven't accessed any client requests. Simply contact our support team with your proof of purchase."
                }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setOpenFAQ(openFAQ === idx ? null : idx)}
                  className="w-full text-left p-6 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="font-medium text-gray-900">{item.question}</h4>
                    <ChevronDown
                      size={20}
                      className={`flex-shrink-0 text-accent transition-transform duration-300 ${
                        openFAQ === idx ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  {openFAQ === idx && (
                    <p className="text-gray-600 text-sm mt-4">{item.answer}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
