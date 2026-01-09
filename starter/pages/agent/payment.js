import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRoleProtection } from '../../lib/useRoleProtection';
import { isVerifiedAgent } from '../../lib/rbac';
import { Copy, Check, AlertCircle, ChevronDown, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const COST_PER_LEAD = 250;
const MIN_LEADS = 4;
const MAX_LEADS = 100;

export default function AgentPayment() {
  const { loading: authLoading, userData } = useRoleProtection({
    checkAccess: isVerifiedAgent,
    redirectTo: '/agent/signup',
  });

  const { user } = useUser();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [queueCount, setQueueCount] = useState(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [leadCount, setLeadCount] = useState(4);
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

  const totalAmount = leadCount * COST_PER_LEAD;

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
        <title>Agent Monthly Contribution — Dosnine Properties</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
       

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-accent text-white px-8 py-6">
              <h1 className="text-3xl font-bold">Agent Monthly Contribution</h1>
              <p className="mt-2 text-white/90">Monthly platform maintenance fee via bank transfer</p>
              <p className="mt-1 text-white/80 text-sm">Due at the beginning of each month to maintain platform operations</p>
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
                    <strong className="text-2xl text-green-600">{3*queueCount}</strong> active client {queueCount === 1 ? 'request' : 'requests'} waiting to be assigned
                  </p>
                  <p className="text-green-700 text-sm mt-2 font-medium">
                    Join our agents and start claiming high-value leads today.
                  </p>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="px-8 py-6">
              {/* Platform Maintenance Notice */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Monthly Contribution Fee</h3>
                    <p className="text-blue-800 text-sm mb-2">
                      Your monthly contribution helps us maintain and improve the platform, including server costs, feature development, and customer support.
                    </p>
                    <p className="text-blue-900 text-sm font-bold">
                      🗓️ Due Date: 1st of each month
                    </p>
                    <p className="text-red-700 text-sm font-semibold mt-2">
                      ⚠️ No contribution = No request assignments for that month
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">What Your Contribution Includes:</h2>
                <ul className="space-y-3">
                  {[
                    'Access to all client requests (buy, rent, sell, lease)',
                    'Direct client contact information',
                    'help generate leads',
                    'Unlimited property postings',
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

              {/* Contribution Slider */}
              <div className="mb-8">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold">Choose Your Monthly Leads</h2>
                  <p className="text-gray-600 text-sm mt-2">One lead = J${COST_PER_LEAD.toLocaleString()} JMD. Slide to pick how many leads you want this month.</p>
                </div>

                <div className="bg-gradient-to-r from-accent/10 via-white to-accent/10 border border-accent/20 rounded-xl p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-700">Leads this month</p>
                      <p className="text-4xl font-bold text-accent">{leadCount}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-sm text-gray-700">Monthly contribution</p>
                      <p className="text-3xl font-bold text-accent">J${totalAmount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{leadCount} × J${COST_PER_LEAD.toLocaleString()} per lead</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="relative pt-2">
                      <input
                        type="range"
                        min={MIN_LEADS}
                        max={MAX_LEADS}
                        step={1}
                        value={leadCount}
                        onChange={(e) => setLeadCount(Number(e.target.value))}
                        className="w-full h-2 bg-gradient-to-r from-gray-200 to-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:active:scale-110 [&::-webkit-slider-thumb]:transition [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:active:scale-110 [&::-moz-range-thumb]:transition [&::-moz-range-track]:bg-transparent [&::-moz-range-track]:border-none"
                      />
                      <div className="absolute top-0 h-2 bg-gradient-to-r from-accent via-accent/70 to-accent/50 rounded-lg pointer-events-none" 
                           style={{ width: `${((leadCount - MIN_LEADS) / (MAX_LEADS - MIN_LEADS)) * 100}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-3 px-1">
                      <span className="font-medium">{MIN_LEADS} lead</span>
                      <span className="font-medium text-accent font-bold">{leadCount} leads</span>
                      <span className="font-medium">{MAX_LEADS} leads</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[5, 10, 15, 20, 30, 40].map((option) => (
                      <button
                        key={option}
                        onClick={() => setLeadCount(option)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                          leadCount === option
                            ? 'bg-accent text-white border-accent'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-accent'
                        }`}
                      >
                        {option} leads
                      </button>
                    ))}
                  </div>

                  <p className="mt-3 text-xs text-gray-600">You can adjust this anytime before sending your contribution.</p>
                </div>
              </div>

              {/* Bank Transfer Instructions */}
              <div className="bg-white border-l-4 border-blue-500 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Monthly Contribution Instructions</h3>
                    <ol className="text-blue-800 text-sm space-y-2 list-decimal list-inside">
                      <li><strong>Transfer J${totalAmount.toLocaleString()}</strong> to any of the bank accounts below</li>
                      <li>In transfer notes, include: <strong>Your Email</strong> + <strong>"{leadCount} leads (J${totalAmount.toLocaleString()})"</strong></li>
                      <li>Screenshot or photo of receipt</li>
                      <li>Send proof via WhatsApp (contribution button below)</li>
                    </ol>
                    <p className="text-blue-900 text-xs mt-3 font-semibold">
                      💡 This contribution is due monthly on the 1st to keep your account active
                    </p>
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
                  <div key={index} className={`rounded-lg p-3 md:p-4 mb-2 md:mb-3 last:mb-0 ${cardColors[bank.bank] || 'bg-white'}`}>
                    <h4 className={`font-semibold mb-2 md:mb-3 border-b pb-1 md:pb-2 text-sm md:text-base ${headerColors[bank.bank] || 'text-gray-900'}`}>{bank.bank}</h4>
                    <div className="space-y-1 md:space-y-2">
                      {Object.entries(bank).filter(([key]) => key !== 'bank').map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center gap-2">
                          <span className="text-gray-700 text-xs md:text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                          <div className="flex items-center gap-1 md:gap-2">
                            <span className="font-semibold text-gray-900 text-xs md:text-sm">{value}</span>
                            <button
                              onClick={() => copyToClipboard(value, `${bank.bank}-${key}`)}
                              className="text-gray-700 hover:text-gray-900 p-2 md:p-2.5 font-medium"
                            >
                              {copied === `${bank.bank}-${key}` ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="flex flex-col gap-1 pt-1 md:pt-2">
                        <span className="text-gray-800 text-xs md:text-sm font-bold">Notes to Include:</span>
                        <div className="flex items-start gap-1 md:gap-2">
                          <span className="font-semibold text-gray-900 text-xs break-words">{leadCount} for (J${totalAmount.toLocaleString()}) - {user?.primaryEmailAddress?.emailAddress?.split('@')[0]}</span>
                          <button
                            onClick={() => copyToClipboard(`${leadCount} for (J${totalAmount.toLocaleString()}) - ${user?.primaryEmailAddress?.emailAddress?.split('@')[0]}`, `${bank.bank}-notes`)}
                            className="text-gray-700 hover:text-gray-900 p-2 md:p-2.5 font-medium flex-shrink-0"
                          >
                            {copied === `${bank.bank}-notes` ? <Check size={18} /> : <Copy size={18} />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-1 md:pt-2 border-t border-gray-400">
                        <span className="text-gray-800 text-xs md:text-sm font-bold">Amount to Pay:</span>
                        <div className="flex items-center gap-1 md:gap-2">
                          <span className="font-bold text-gray-900 text-xs md:text-sm">J${totalAmount.toLocaleString()}</span>
                          <button
                            onClick={() => copyToClipboard(totalAmount.toString(), `${bank.bank}-amount`)}
                            className="text-gray-700 hover:text-gray-900 p-2 md:p-2.5 font-medium"
                          >
                            {copied === `${bank.bank}-amount` ? <Check size={18} /> : <Copy size={18} />}
                          </button>
                        </div>
                      </div>
                     
                    </div>
                  </div>
                  );
                })}

                {/* <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                  <p className="text-xs text-yellow-800">
                    <strong>Important:</strong> Include your email ({user?.primaryEmailAddress?.emailAddress}) in the payment notes so we can verify your payment quickly.
                  </p>
                </div> */}
              </div>

              {/* WhatsApp Submission */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4 text-center">
                  After making the transfer, click the contribution button below to send your proof on WhatsApp
                </p>
                <a
                  href={`https://wa.me/18763369045?text=Hello%20Dosnine%20Team,%20I%20have%20submitted%20my%20monthly%20agent%20contribution.%20Here%20is%20my%20payment%20proof.%0A%0AEmail:%20${encodeURIComponent(user?.primaryEmailAddress?.emailAddress || 'YOUR_EMAIL')}%0ALeads:%20${leadCount}%0AAmount:%20J$${totalAmount.toLocaleString()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full btn-primary btn-lg flex items-center justify-center gap-2"
                >
                
                  Send Monthly Contribution Proof
                </a>
              </div>

              <p className="text-center text-sm font-semibold text-green-700 mt-4 bg-green-50 px-4 py-3 rounded-lg">
                Verification within 24 hours • Fee due 1st of each month
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
                  question: "What is the monthly contribution for?",
                  answer: "Your monthly contribution covers platform maintenance, server costs, feature development, customer support, and ensures the platform runs smoothly. It's due on the 1st of each month."
                },
                {
                  question: "What happens if I don't contribute?",
                  answer: "Without an active monthly contribution, you won't be assigned any client requests for that month. Your account remains active, but request assignments are paused until contribution is received."
                },
                {
                  question: "How do I pick the right amount?",
                  answer: "Use the slider to set how many leads you want for the month. Each lead is J$500, so your contribution scales with your target volume. You can adjust it anytime before sending your payment."
                },
                {
                  question: "When is the contribution due?",
                  answer: "The monthly contribution is due on the 1st of each month. You'll receive a reminder a few days before. Late contributions may result in temporary suspension of request assignments."
                },
                {
                  question: "How long does verification take?",
                  answer: "Verification takes 24 hours or less from sending your contribution proof via WhatsApp. We'll email you once verified and your access is activated for the month."
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
