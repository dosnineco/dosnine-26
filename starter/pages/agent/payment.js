import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { useRoleProtection } from '../../lib/useRoleProtection';
import { isVerifiedAgent } from '../../lib/rbac';
import {
  Copy,
  Check,
  AlertCircle,
  Award,
  Users,
  Home,
  DollarSign,
  Upload,
  Clock,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSiteSettings } from '../../lib/siteSettings';



const plans = [
  {
    id: '7-day',
    name: '7-Day Access',
    price: 1499,
    duration: '7 days',
    headline: 'Get qualified leads for 7 days straight',
    included: [
      
    ],
    blocked: [
      'No rentals over J$150,000',
      'No buyer requests over J$12M',
      'No Sales leads'
      
    ],
    accent: 'bg-blue-50',
    badge: 'New'
  },
  {
    id: '30-day',
    name: '1 Month Access',
    price: 4999,
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
    name: '3 Month Access',
    price: 14999,
    duration: '3 - months',
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
  },
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
  }
];

const bankDetails = [
  {
    bank: 'Scotiabank Jamaica',
    accountName: 'Dosnine Limited',
    accountNumber: '000991881',
    branch: '50575',
    accountType: 'Business Savings',
  },
];

const formatCurrency = (amount) => `J$${amount.toLocaleString()}`;
const OWNER_SERVICE_PRICE_USD = 5;
const USD_TO_JMD = 155;
const OWNER_SERVICE_PRICE_JMD = OWNER_SERVICE_PRICE_USD * USD_TO_JMD;

export default function AgentPayment() {
  const { loading: authLoading, userData } = useRoleProtection({
    checkAccess: (data) => isVerifiedAgent(data) || data?.user_type === 'owner' || data?.role === 'owner',
    redirectTo: '/agent/signup',
  });
  const isOwnerUser = userData?.user_type === 'owner' || userData?.role === 'owner';

  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [queueCount, setQueueCount] = useState(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState('30-day');
  const [sessionToken, setSessionToken] = useState(null);
  const [ownerCurrency, setOwnerCurrency] = useState('USD');
  const [planPrices, setPlanPrices] = useState({});
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptState, setReceiptState] = useState(null);
  const [agentProfile, setAgentProfile] = useState(null);

  useEffect(() => {
    if (userData?.agent) setAgentProfile(userData.agent);
  }, [userData]);

  // Generate and track session token for upgrade flow
  useEffect(() => {
    if (user?.id) {
      const token = `upgrade_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionToken(token);
      
      sessionStorage.setItem('agent_upgrade_token', token);
      sessionStorage.setItem('agent_upgrade_timestamp', new Date().toISOString());
    }
  }, [user?.id]);

  // Update stored plan in session whenever it changes
  useEffect(() => {
    if (sessionToken && selectedPlanId) {
      sessionStorage.setItem('agent_upgrade_plan', selectedPlanId);
    }
  }, [selectedPlanId, sessionToken]);

  // Pre-select agent's current plan
  useEffect(() => {
    if (agentProfile?.payment_status) {
      const validPlans = ['free', '7-day', '30-day', '90-day'];
      if (validPlans.includes(agentProfile.payment_status)) {
        setSelectedPlanId(agentProfile.payment_status);
      }
    }
  }, [agentProfile?.payment_status]);

  useEffect(() => {
    const agent = agentProfile;
    if (agent?.payment_receipt_submitted_at) {
      setReceiptState({
        submittedAt: agent.payment_receipt_submitted_at,
        plan: agent.payment_receipt_plan,
        amount: agent.payment_receipt_amount,
        status: agent.payment_receipt_status,
      });
    }
  }, [agentProfile]);

  useEffect(() => {
    if (receiptState?.status !== 'pending') return undefined;

    const refreshReceiptStatus = async () => {
      try {
        const response = await fetch('/api/user/profile', { credentials: 'include' });
        if (!response.ok) return;
        const profile = await response.json();
        const agent = profile?.agent;
        if (agent?.payment_receipt_submitted_at) {
          setAgentProfile(agent);
          setReceiptState({
            submittedAt: agent.payment_receipt_submitted_at,
            plan: agent.payment_receipt_plan,
            amount: agent.payment_receipt_amount,
            status: agent.payment_receipt_status,
          });
        }
      } catch (error) {
        console.error('Failed to refresh agent payment receipt status:', error);
      }
    };

    const timer = setInterval(refreshReceiptStatus, 30000);
    return () => clearInterval(timer);
  }, [receiptState?.status]);

  // Allow override of plan prices via site settings
  useEffect(() => {
    let mounted = true;
    async function applySitePrices() {
      try {
        const s = await getSiteSettings();
        if (!mounted) return;
        if (s.plan_prices) setPlanPrices(s.plan_prices);
      } catch (e) {
        console.error('Failed to load plan prices:', e);
      }
    }
    applySitePrices();
    return () => { mounted = false; };
  }, []);

  const selectedPlanBase = plans.find((plan) => plan.id === selectedPlanId) || plans[2];
  const selectedPlan = {
    ...selectedPlanBase,
    price: planPrices[selectedPlanBase.id] ?? selectedPlanBase.price,
  };
  const userEmail = user?.primaryEmailAddress?.emailAddress || 'YOUR_EMAIL';
  const emailHandle = userEmail.includes('@') ? userEmail.split('@')[0] : userEmail;
  const paymentRequired = selectedPlan.price > 0;
  const handleReceiptSelection = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setReceiptFile(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Choose a JPG, PNG, or WebP receipt image.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Receipt image must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }
    setReceiptFile(file);
  };

  const uploadPaymentReceipt = async (event) => {
    event.preventDefault();
    if (!receiptFile) {
      toast.error('Choose a receipt image first.');
      return;
    }
    if (!['7-day', '30-day', '90-day'].includes(selectedPlan.id)) {
      toast.error('Choose a paid plan before uploading a receipt.');
      return;
    }

    setUploadingReceipt(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('receipt', receiptFile);
      formData.append('plan', selectedPlan.id);
      const response = await fetch('/api/agent/payment-receipt', {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to upload receipt.');
      }
      setReceiptState(payload.receipt);
      setReceiptFile(null);
      event.target.reset();
      toast.success('Receipt submitted. Your payment is awaiting verification.');
    } catch (error) {
      toast.error(error.message || 'Unable to upload receipt.');
    } finally {
      setUploadingReceipt(false);
    }
  };
  
  // WhatsApp message for bank transfer / free access
  const whatsappText = encodeURIComponent(
    paymentRequired
      ? `Hello Dosnine Team, I want to activate ${selectedPlan.name} (${selectedPlan.duration}). Email: ${userEmail}. Amount: ${formatCurrency(selectedPlan.price)}. Session: ${sessionToken}. I am sending my bank transfer proof now.`
      : `Hello Dosnine Team, please activate ${selectedPlan.name} for ${userEmail}. Session: ${sessionToken}.`
  );

  const ownerPaymentWhatsappText = encodeURIComponent(
    `Hi Dosnine, I want to join Tenant Services and pay by bank transfer in ${ownerCurrency}. Email: ${userEmail}. Amount: ${ownerCurrency === 'USD' ? `$${OWNER_SERVICE_PRICE_USD}` : `JMD ${OWNER_SERVICE_PRICE_JMD.toLocaleString()}`}. Please send the bank transfer instructions.`
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
        <title>Agent Access Plans — Dosnine Limited</title>
      </Head>

      <div className="min-h-screen bg-white py-8 px-4 sm:py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gray-500 text-white px-6 py-8 sm:px-8 sm:py-10 rounded-lg">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {isOwnerUser ? 'Dosnine Tenant Services' : 'Agent Access Plans'}
              </h1>
              <p className="mt-2 text-gray-300 text-sm sm:text-base">
                {isOwnerUser
                  ? 'Tenant placement support for Jamaican property owners.'
                  : 'Based on deal value. Choose your plan and get verified in 24 hours.'}
              </p>



              {/* Current Plan Status */}
              {agentProfile && (
                <div className="mt-4 pt-4 border-t border-gray-400">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-xs text-gray-300">Current Plan</p>
                      <p className="text-lg font-bold">
                        {agentProfile.payment_status === 'free' && 'Free Access'}
                        {agentProfile.payment_status === '7-day' && '7-Day Access'}
                        {agentProfile.payment_status === '30-day' && ' 30-Day Access'}
                        {agentProfile.payment_status === '90-day' && ' 90-Day Access'}
                      </p>
                    </div>
                    {agentProfile.access_expiry && (
                      <div className="text-right">
                        <p className="text-xs text-gray-300">
                          {new Date(agentProfile.access_expiry) > new Date() ? 'Renews' : 'Expired'}
                        </p>
                        <p className="text-sm font-semibold">
                          {new Date(agentProfile.access_expiry).toLocaleDateString('en-US', {
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

            {isOwnerUser ? (
              /* ==================== OWNER VIEW (unchanged) ==================== */
              <div className="px-8 py-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Stop leaving rental income on the table.</h2>
                  <p className="text-gray-700 mb-3">
                    Dosnine helps Jamaican property owners keep their rental units occupied by putting their available properties in front of people actively looking for somewhere to live.
                  </p>

                  <p className="text-gray-900 font-bold mb-3">Your goal: 100% occupancy. Our job: help you get there.</p>

                  <p className="text-gray-700 mb-3">
                    With your membership, Dosnine helps promote your available rental property, generate tenant interest and connect you with prospective renters.
                  </p>

                  <div className="mb-3">
                    <p className="text-gray-900 font-bold mb-2">What you get:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>Tenant-placement support</li>
                      <li>Property promotion through Dosnine</li>
                      <li>Access to prospective tenants</li>
                      <li>Help getting your rental in front of more people</li>
                      <li>Ongoing support while your membership is active</li>
                      <li>Suitable for apartments, houses, rooms and other rental properties</li>
                    </ul>
                  </div>

                  <p className="text-gray-700 font-medium mb-2">
                    Built for Jamaican landlords who want fewer vacant days and more rental income.
                  </p>

                  <div className="text-2xl font-bold text-gray-900 mt-4">$5/month.</div>

                  <p className="text-gray-700 mt-4">
                    <span className="font-bold">Important:</span> 100% occupancy is the target—not a guaranteed result. Tenant placement depends on property location, rental price, condition, availability, demand and the owner&apos;s approval of prospective tenants.
                  </p>
                </div>

                <div className="rounded-xl bg-gray-100 p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wide text-accent">Owner membership</p>
                      <h2 className="mt-1 text-xl font-bold text-gray-900">Ready to start?</h2>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-gray-700">
                        Get your rental property in front of prospective tenants faster with Dosnine Tenant Services.
                      </p>
                    </div>
                    <div className="flex-shrink-0 rounded-lg bg-white px-4 py-3 text-left sm:text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {ownerCurrency === 'USD' ? '$5' : `J$${OWNER_SERVICE_PRICE_JMD.toLocaleString()}`}
                      </p>
                      <p className="text-xs font-medium text-gray-500">per month</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-gray-700">Pay in</span>
                    <div className="flex rounded-lg bg-white p-1" role="group" aria-label="Choose payment currency">
                      {['USD', 'JMD'].map((currency) => (
                        <button
                          key={currency}
                          type="button"
                          onClick={() => setOwnerCurrency(currency)}
                          aria-pressed={ownerCurrency === currency}
                          className={`rounded-md px-4 py-2 text-xs font-bold transition ${
                            ownerCurrency === currency ? 'bg-accent text-white' : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {currency}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3">
                    <a
                      href={`https://wa.me/18763369045?text=${ownerPaymentWhatsappText}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-accent px-5 py-3 text-center text-sm font-bold text-white hover:bg-accent/90"
                    >
                      Request bank transfer instructions
                    </a>

                  <a
                    href={`https://wa.me/18763369045?text=${encodeURIComponent(`Hi Dosnine, I need help finding a tenant. Email: ${userEmail}. My property rent is [amount]. Please explain the Dosnine Tenant Services membership process and the $5/month plan.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-white px-5 py-3 text-center text-sm font-semibold text-gray-900 hover:bg-gray-50"
                  >
                    Have questions? Ask on WhatsApp
                  </a>
                  </div>
                  <p className="mt-3 text-center text-xs text-gray-500">
                    We will send bank transfer instructions on WhatsApp.
                  </p>
                </div>
              </div>
            ) : (
              /* ==================== AGENT VIEW ==================== */
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

              {/* Agent Benefits Section */}
              <div className="bg-gradient-to-r from-accent/10 to-blue-50 border border-accent/20 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <Award className="w-8 h-8 text-accent" />
                  <h2 className="text-xl font-bold text-gray-900">Your Agent Benefits</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/70 rounded-lg p-4 border border-white/50">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-6 h-6 text-accent" />
                      <h3 className="font-semibold text-gray-900">Connect with Clients</h3>
                    </div>
                    <p className="text-sm text-gray-600">Receive qualified leads and client requests directly in your dashboard.</p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-4 border border-white/50">
                    <div className="flex items-center gap-3 mb-2">
                      <Home className="w-6 h-6 text-accent" />
                      <h3 className="font-semibold text-gray-900">Post Unlimited Properties</h3>
                    </div>
                    <p className="text-sm text-gray-600">List as many properties as you want with premium placement and features.</p>
                  </div>
                </div>
              </div>

              {/* Plans */}
              <div className="space-y-8">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Pick your plan</h2>

                <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
                  {plans.map((plan) => {
                    const isSelected = plan.id === selectedPlanId;
                    const price = planPrices[plan.id] ?? plan.price;
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
                            <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(price)}</p>
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

              {receiptState?.status && (
                <div
                  className={`rounded-lg p-4 text-sm ${
                    receiptState.status === 'verified'
                      ? 'bg-emerald-50 text-emerald-900'
                      : receiptState.status === 'rejected'
                      ? 'bg-red-50 text-red-900'
                      : 'bg-amber-50 text-amber-900'
                  }`}
                >
                  <p className="flex items-center gap-2 font-semibold">
                    {receiptState.status === 'verified' ? <CheckCircle size={17} /> : <Clock size={17} />}
                    {receiptState.status === 'verified'
                      ? 'Payment verified. Your access plan has been updated.'
                      : receiptState.status === 'rejected'
                      ? 'Your receipt was rejected. Please upload a corrected receipt.'
                      : 'Receipt submitted — payment is awaiting verification.'}
                  </p>
                  <p className="mt-1">
                    {receiptState.plan && `${plans.find((plan) => plan.id === receiptState.plan)?.name || receiptState.plan} · `}
                    {receiptState.amount != null && formatCurrency(Number(receiptState.amount))}
                    {receiptState.submittedAt && ` · ${new Date(receiptState.submittedAt).toLocaleString()}`}
                  </p>
                </div>
              )}

              {/* Bank Transfer Instructions */}
              {paymentRequired && (
              <div className="bg-gray-100 border-l-4 border-accent rounded-lg p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-accent flex-shrink-0 mt-0.5" size={18} />
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">How to pay by bank transfer</h3>
                    <ol className="text-gray-700 text-sm space-y-2 list-decimal list-inside">
                      <li>
                        Transfer <strong>{formatCurrency(selectedPlan.price)}</strong> to one of the banks below
                      </li>
                      <li>
                        In notes, add: <strong>{selectedPlan.name}</strong> + <strong>{emailHandle}</strong>
                      </li>
                      <li>Screenshot the receipt</li>
                      <li>Upload your receipt below</li>
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

                {/* On-site bank transfer receipt submission */}
                <div className="mt-5 bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <h3 className="text-base font-bold text-gray-900 mb-2">
                    Upload your transfer receipt
                  </h3>
                  <p className="text-sm text-gray-700 mb-3">
                    Submit your receipt here. We will verify the transfer before activating your access.
                  </p>
                  <form onSubmit={uploadPaymentReceipt} className="space-y-3 text-left">
                    <label className="block text-sm font-medium text-gray-700">
                      Payment receipt
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleReceiptSelection}
                        className="mt-2 block w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm"
                        disabled={uploadingReceipt}
                      />
                    </label>
                    <p className="text-xs text-gray-500">JPG, PNG, or WebP · maximum 5 MB</p>
                    <button
                      type="submit"
                      disabled={!receiptFile || uploadingReceipt}
                      className="w-full inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-bold py-3 px-4 rounded-lg transition text-sm sm:text-base disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {uploadingReceipt ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}
                      {uploadingReceipt
                        ? 'Submitting receipt…'
                        : receiptState?.status === 'pending'
                        ? 'Replace and submit receipt'
                        : 'Submit transfer receipt'}
                    </button>
                  </form>
                  <p className="mt-3 text-xs text-gray-500">
                    Payment is verified within 24 hours. Your access starts after confirmation.
                  </p>
                </div>
              </div>
              )}

              {/* Free Plan - WhatsApp only */}
              {!paymentRequired && (
                <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 sm:p-6 text-center">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">
                    Ready to get started?
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Let us know to enable your free access.
                  </p>
                  <a
                    href={`https://wa.me/18763369045?text=${whatsappText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-bold py-3 px-4 rounded-lg transition text-sm sm:text-base"
                  >
                    Enable Free Access
                  </a>
                </div>
              )}
            </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}