import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { useRoleProtection } from '../../lib/useRoleProtection';
import { isVerifiedAgent } from '../../lib/rbac';
import { Copy, Check, AlertCircle, ChevronDown, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const plans = [
  {
    id: 'free',
    name: 'Free Access',
    price: 0,
    duration: 'Free',
    headline: 'Test the platform on small rentals',
    included: [

    ],
    blocked: [
      'No buyer leads',
      'No rental leads over J$80,000',
      'No purchase requests',
    ],
    accent: 'bg-gray-50',
    badge: 'Starter'
  },
  {
    id: '7-day',
    name: '7-Day Access',
    price: 3500,
    duration: '7 days',
    headline: 'Low-risk entry to more leads',
    included: [
      
    ],
    blocked: [
      'No rentals over J$100,000',
      'No buyer requests over J$10M',
      'No Sales leads'
      
    ],
    accent: 'bg-blue-50',
    badge: 'New'
  },
  {
    id: '30-day',
    name: '30-Day Access',
    price: 10000,
    duration: '30 days',
    headline: 'Full access to all resquest and features',
    included: [
 
    ],
    blocked: [
      'All Access',
      'All budgets and requests included',
      'All sales',

    ],
    accent: 'bg-emerald-50',
    badge: 'Most Popular'
  },
  {
    id: '90-day',
    name: '90-Day Access',
    price: 25000,
    duration: '90 days',
    headline: 'Same power, lower cost per day',
    included: [
   
    ],
    blocked: [
      'Everything in 30-Day Access',
      'Discount pricing for 90 days',
      'Early access to new requests'

    ],
    accent: 'bg-orange-50',
    badge: 'Best Value'
  }
];

const bankDetails = [
  {
    bank: 'Scotiabank Jamaica',
    accountName: 'Tahjay Thompson',
    accountNumber: '010860258',
    branch: '50575'
  },
];

const formatCurrency = (amount) => `J$${amount.toLocaleString()}`;

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
  const [selectedPlanId, setSelectedPlanId] = useState('30-day');
  const [openFAQ, setOpenFAQ] = useState(null);

  // Pre-select agent's current plan
  useEffect(() => {
    if (userData?.agent?.payment_status) {
      const validPlans = ['free', '7-day', '30-day', '90-day'];
      if (validPlans.includes(userData.agent.payment_status)) {
        setSelectedPlanId(userData.agent.payment_status);
      }
    }
  }, [userData]);

 

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) || plans[2];
  const userEmail = user?.primaryEmailAddress?.emailAddress || 'YOUR_EMAIL';
  const emailHandle = userEmail.includes('@') ? userEmail.split('@')[0] : userEmail;
  const paymentRequired = selectedPlan.price > 0;
  const whatsappText = encodeURIComponent(
    paymentRequired
      ? `Hello Dosnine Team, I want to activate ${selectedPlan.name} (${selectedPlan.duration}). Email: ${userEmail}. Amount: ${formatCurrency(selectedPlan.price)}. I am sending my bank transfer proof now.`
      : `Hello Dosnine Team, please activate ${selectedPlan.name} for ${userEmail}.`
  );

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
        <title>Agent Access Plans — Dosnine Properties</title>
      </Head>

      <div className="min-h-screen bg-white py-8 px-4 sm:py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg  overflow-hidden">
            {/* Header */}
            <div className="bg-gray-500 text-white px-6 py-8 sm:px-8 sm:py-10 rounded-lg">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Agent Access Plans</h1>
              <p className="mt-2 text-gray-300 text-sm sm:text-base">Based on deal value. Choose your plan and get verified in 24 hours.</p>
              
              {/* Current Plan Status */}
              {userData?.agent && (
                <div className="mt-4 pt-4 border-t border-gray-400">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-xs text-gray-300">Current Plan</p>
                      <p className="text-lg font-bold">
                        {userData.agent.payment_status === 'free' && 'Free Access'}
                        {userData.agent.payment_status === '7-day' && '7-Day Access'}
                        {userData.agent.payment_status === '30-day' && ' 30-Day Access'}
                        {userData.agent.payment_status === '90-day' && ' 90-Day Access'}
                      </p>
                    </div>
                    {userData.agent.access_expiry && (
                      <div className="text-right">
                        <p className="text-xs text-gray-300">
                          {new Date(userData.agent.access_expiry) > new Date() ? 'Renews' : 'Expired'}
                        </p>
                        <p className="text-sm font-semibold">
                          {new Date(userData.agent.access_expiry).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

         

            {/* Content */}
            <div className="px-8 py-6 space-y-8">
              <div className="bg-gray-100 border-l-4 border-accent p-4 rounded">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-accent flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Access by deal value</h3>
                    <p className="text-gray-700 text-sm">
                      Your plan determines rental and buyer budgets. Change anytime before paying.
                    </p>
                  </div>
                </div>
              </div>

              {/* Plans */}
              <div className="space-y-8">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Pick your plan</h2>

                <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
                  {plans.map((plan) => {
                    const isSelected = plan.id === selectedPlanId;
                    return (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`text-left rounded-lg border-2 transition p-4 sm:p-5 ${
                          isSelected ? 'border-accent bg-accent/5' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base sm:text-lg font-bold text-gray-900">{plan.name}</h3>
                              {plan.badge && (
                                <span className="text-xs font-bold uppercase tracking-wide text-accent">
                                  {plan.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">{plan.headline}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(plan.price)}</p>
                            <p className="text-xs text-gray-500">{plan.duration}</p>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1">
                          {plan.included.map((item) => (
                            <div key={item} className="flex items-start text-xs sm:text-sm text-gray-700">
                              <span className="text-accent mr-2 font-bold">✓</span>
                              <span>{item}</span>
                            </div>
                          ))}
                          {plan.blocked.length > 0 && (
                            <div className="pt-2 border-t border-gray-200 space-y-1">
                              {plan.blocked.map((item) => (
                                <div key={item} className="flex items-start text-xs sm:text-sm text-gray-500">
                                  <span className="mr-2">—</span>
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <div className="mt-3 text-xs font-bold text-accent">✓ Selected</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

          

              {/* Bank Transfer Instructions - Only for paid plans */}
              {paymentRequired && (
              <div className="bg-gray-100 border-l-4 border-accent rounded-lg p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-accent flex-shrink-0 mt-0.5" size={18} />
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">How to pay</h3>
                    <ol className="text-gray-700 text-sm space-y-2 list-decimal list-inside">
                      <li>
                        Transfer <strong>{formatCurrency(selectedPlan.price)}</strong> to one of the banks below
                      </li>
                      <li>
                        In notes, add: <strong>{selectedPlan.name}</strong> + <strong>{emailHandle}</strong>
                      </li>
                      <li>Screenshot the receipt</li>
                      <li>Upload or send proof (button below)</li>
                    </ol>
                    <p className="text-gray-600 text-xs mt-3 font-semibold">
                      Verified within 24 hours. Access starts after confirmation.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                {bankDetails.map((bank, index) => {
                  return (
                    <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-bold text-gray-900 text-sm mb-3">
                        {bank.bank}
                      </h4>
                      <div className="space-y-2 text-sm">
                        {Object.entries(bank)
                          .filter(([key]) => key !== 'bank')
                          .map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center gap-2">
                              <span className="text-gray-600 font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-gray-900">{value}</span>
                                <button
                                  onClick={() => copyToClipboard(value, `${bank.bank}-${key}`)}
                                  className="text-gray-400 hover:text-gray-900 transition p-1"
                                  title="Copy"
                                >
                                  {copied === `${bank.bank}-${key}` ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                              </div>
                            </div>
                          ))}
                        <div className="flex flex-col gap-2 pt-2 border-t border-gray-200">
                          <span className="text-gray-600 font-bold text-xs uppercase tracking-wide">Transfer notes:</span>
                          <div className="flex items-start gap-2">
                            <span className="font-mono text-gray-900 text-sm break-words flex-1">{selectedPlan.name} - {emailHandle}</span>
                            <button
                              onClick={() => copyToClipboard(`${selectedPlan.name} - ${emailHandle}`, `${bank.bank}-notes`)}
                              className="text-gray-400 hover:text-gray-900 transition p-1 flex-shrink-0"
                              title="Copy"
                            >
                              {copied === `${bank.bank}-notes` ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                          <span className="text-gray-600 font-bold text-xs uppercase tracking-wide">Amount:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-lg">{formatCurrency(selectedPlan.price)}</span>
                            <button
                              onClick={() => copyToClipboard(selectedPlan.price.toString(), `${bank.bank}-amount`)}
                              className="text-gray-400 hover:text-gray-900 transition p-1"
                              title="Copy"
                            >
                              {copied === `${bank.bank}-amount` ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
              )}

              {/* WhatsApp Submission */}
              <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 sm:p-6 text-center">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">
                  {paymentRequired ? 'Ready to proceed?' : 'Ready to get started?'}
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  {paymentRequired
                    ? 'Submit your proof to activate your access window. Verified within 24 hours.'
                    : 'Let us know to enable your free access.'
                  }
                </p>
                <a
                  href={`https://wa.me/18763369045?text=${whatsappText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-bold py-3 px-4 rounded-lg transition text-sm sm:text-base"
                >
                  {paymentRequired ? 'Upload Proof on WhatsApp' : 'Enable Free Access'}
                </a>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-8 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-lg">Frequently Asked Questions</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {[
                {
                  question: 'How is access determined?',
                  answer: 'Access is tied to deal value (rental or buyer budgets), not lead count. Pick the plan that matches the budgets you want to work.'
                },
                {
                  question: 'What happens if I do not pay?',
                  answer: 'Your account stays open but you cannot claim requests beyond the Free Access limits until payment is confirmed.'
                },
                {
                  question: 'When does the access window start?',
                  answer: 'Within 24 hours of sending payment proof on WhatsApp. The countdown starts at confirmation, not at transfer time.'
                },
                {
                  question: 'Can I switch plans later?',
                  answer: 'Yes. Select a new plan and submit a new transfer before your current window ends to avoid downtime.'
                },
                {
                  question: 'How do I list properties?',
                  answer: 'All plans include unlimited listings during the active access window.'
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
