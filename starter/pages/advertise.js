import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Globe2,
  ImagePlus,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

const plans = [
  {
    id: '7-day',
    name: 'Growth',
    duration: '7 Days',
    price: 11999,
    badge: 'Most Popular',
    highlight: 'Generate steady enquiries.',
    bestFor: 'Growing local businesses',
    visibility: 'Broad property audience reach',
    accent: 'from-accent/20 to-violet-500/10',
    features: ['Business profile', 'Image gallery', 'Phone number', 'WhatsApp contact', 'Website link', 'Category placement'],
    popular: true,
  },
  {
    id: '14-day',
    name: 'Professional',
    duration: '14 Days',
    price: 17999,
    badge: 'Professional',
    highlight: 'Ideal for growing businesses.',
    bestFor: 'Brands ready to scale',
    visibility: 'Priority visibility in key categories',
    accent: 'from-cyan-500/15 to-blue-500/10',
    features: ['Business profile', 'Image gallery', 'Phone number', 'WhatsApp contact', 'Website link', 'Category placement', 'Description', 'Featured badge'],
  },
  {
    id: '30-day',
    name: 'Elite',
    duration: '30 Days',
    price: 52499,
    badge: 'Elite',
    highlight: 'Maximum visibility with newsletter inclusion.',
    bestFor: 'High-value service brands',
    visibility: 'Premium placement + newsletter inclusion',
    accent: 'from-emerald-500/15 to-teal-500/10',
    features: ['Business profile', 'Image gallery', 'Phone number', 'WhatsApp contact', 'Website link', 'Category placement', 'Description', 'Featured badge', 'Priority placement', 'Email newsletter'],
  },
];

const bankDetails = [
  {
    bank: 'Scotiabank Jamaica',
    accountName: 'Tahjay Thompson',
    accountNumber: '010860258',
    branch: '50575',
  },
];

const categories = [
  { value: 'contractor', label: 'Contractor' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'realtor', label: 'Realtor' },
  { value: 'attorney', label: 'Attorney' },
  { value: 'surveyor', label: 'Surveyor' },
  { value: 'architect', label: 'Architect' },
  { value: 'mortgage', label: 'Mortgage Broker' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'home_inspection', label: 'Home Inspector' },
  { value: 'mover', label: 'Mover' },
  { value: 'furniture_store', label: 'Furniture Store' },
  { value: 'hardware_store', label: 'Hardware Store' },
  { value: 'solar', label: 'Solar Company' },
  { value: 'ac', label: 'Air Conditioning Company' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'property_manager', label: 'Property Manager' },
  { value: 'developer', label: 'Developer' },
  { value: 'other', label: 'Other' },
];

const trustBadges = [
  { icon: ShieldCheck, title: 'Trusted Jamaican Property Platform' },
  { icon: BadgeCheck, title: 'Secure Online Payments' },
  { icon: MessageCircle, title: 'WhatsApp Support' },
  { icon: Clock3, title: 'Fast Approval' },
  { icon: Sparkles, title: 'Ads Reviewed Before Publishing' },
];

const metrics = [
  { value: '32k', label: 'Monthly property visits' },
  { value: '7.6k', label: 'Email subscribers' },
  { value: '14', label: 'Parishes reached' },
];

const reasons = [
  {
    icon: TrendingUp,
    title: 'Bring in new customers',
    description: 'Put your business in front of property buyers, renters, and service seekers who are actively looking for help.',
  },
  {
    icon: MessageCircle,
    title: 'Turn interest into enquiries',
    description: 'Receive direct WhatsApp, phone, and email enquiries from people who are ready to act.',
  },
  {
    icon: Building2,
    title: 'Build trust faster',
    description: 'A polished listing helps first-time visitors feel confident choosing your business.',
  },
  {
    icon: Zap,
    title: 'Launch with confidence',
    description: 'Start reaching local customers quickly with a listing that is reviewed and published fast.',
  },
];

const upgrades = [
  { key: 'homepage_feature', label: 'Homepage Feature', price: 3500, description: 'Featured placement on the main homepage.' },
  { key: 'top_category', label: 'Top Category Placement', price: 4500, description: 'Appear above competitors in your category.' },
  { key: 'facebook_promo', label: 'Facebook Promotion', price: 2500, description: 'Amplify your reach on Facebook.' },
  { key: 'instagram_promo', label: 'Instagram Promotion', price: 2500, description: 'Boost visibility on Instagram stories and posts.' },
  { key: 'newsletter_blast', label: 'Newsletter Blast', price: 4000, description: 'Included in the next property newsletter.' },
  { key: 'urgent_badge', label: 'Urgent Badge', price: 1800, description: 'Signal immediate availability to buyers.' },
  { key: 'featured_business_badge', label: 'Featured Business Badge', price: 2200, description: 'Showcase your business as a verified advertiser.' },
  { key: 'htv_logo_pack', label: 'HTV Logo Pack', price: 2750, description: 'Physical HTV-ready-to-press logos for shirts and other branded gear.' },
];

const faqs = [
  {
    question: 'How long before my ad goes live?',
    answer: 'Most ads are reviewed and published within one business day after payment confirmation.',
  },
  {
    question: 'Can I edit my ad?',
    answer: 'Yes. You can request edits before your campaign starts and we can help update your listing as needed.',
  },
  {
    question: 'Can I upload multiple images?',
    answer: 'Yes. You can upload up to three images so customers can see your work, services and business clearly.',
  },
  {
    question: 'Can I renew?',
    answer: 'Absolutely. We can help you renew or extend your campaign when your current ad period is ending.',
  },
  {
    question: 'Can I change plans later?',
    answer: 'Yes. If your goals change, we can help upgrade or switch to a plan that better fits your campaign.',
  },
  {
    question: 'Do I receive enquiries directly?',
    answer: 'Yes. Leads are sent straight to your phone, WhatsApp and email so you can respond quickly.',
  },
];

const formatMoney = (value) => `J$${Number(value || 0).toLocaleString()}`;

const compressImageToWebP = (file, maxWidth = 1600, quality = 0.82) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = image.width > maxWidth ? maxWidth / image.width : 1;
      canvas.width = Math.round(image.width * ratio);
      canvas.height = Math.round(image.height * ratio);

      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Unable to process image.'));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error('Image compression failed.'));
            return;
          }

          const compressedFile = new File(
            [blob],
            `${(file.name || 'ad-image').replace(/\.[^.]+$/, '')}.webp`,
            { type: 'image/webp' }
          );
          resolve(compressedFile);
        },
        'image/webp',
        quality
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Invalid image file.'));
    };

    image.src = objectUrl;
  });

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent sm:text-sm">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">{subtitle}</p> : null}
    </div>
  );
}

function TrustPill({ icon: Icon, title }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-none border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm sm:px-4">
      <Icon className="h-4 w-4 shrink-0 text-accent" />
      <span>{title}</span>
    </div>
  );
}

export default function AdvertisePage() {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [selectedUpgrades, setSelectedUpgrades] = useState({});
  const [form, setForm] = useState({
    company_name: '',
    business_logo: '',
    title: '',
    category: 'contractor',
    description: '',
    phone: '',
    whatsapp: '',
    email: user?.primaryEmailAddress?.emailAddress || '',
    website: '',
    contact_name: '',
    location: '',
    plan_id: '7-day',
    is_featured: false,
  });

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === form.plan_id) || plans[0],
    [form.plan_id]
  );

  const upgradeTotal = useMemo(
    () => Object.entries(selectedUpgrades).reduce((total, [key, active]) => {
      if (!active) return total;
      const upgrade = upgrades.find((option) => option.key === key);
      return total + (upgrade?.price || 0);
    }, 0),
    [selectedUpgrades]
  );

  const totalAmount = selectedPlan.price + upgradeTotal;
  const emailForNote = (form.email || 'YOUR_EMAIL').trim();
  const whatsappText = encodeURIComponent(
    `Hello Dosnine Team, I submitted an ad request (${selectedPlan.name}) for ${submissionId}. Amount sent: ${formatMoney(totalAmount)}. Submission: ${submissionId || 'pending'}. I am sending payment proof now.`
  );

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress && !form.email) {
      setForm((prev) => ({ ...prev, email: user.primaryEmailAddress.emailAddress }));
    }
  }, [user, form.email]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const copyToClipboard = async (value, key) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(key);
      toast.success('Copied');
      setTimeout(() => setCopied(''), 1800);
    } catch {
      toast.error('Unable to copy.');
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (imageFiles.length === 0) {
      const message = 'Please upload at least 1 ad image before continuing.';
      setSubmitError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);

    try {
      const uploadedImageUrls = [];

      for (const file of imageFiles) {
        const compressedImage = await compressImageToWebP(file);
        const uploadResponse = await fetch('/api/sponsors/upload-images', {
          method: 'POST',
          headers: {
            'Content-Type': compressedImage.type || 'image/webp',
          },
          body: compressedImage,
        });

        const uploadPayload = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadPayload?.success) {
          throw new Error(uploadPayload?.error || 'Image upload failed.');
        }

        if (!uploadPayload?.image_url) {
          throw new Error('Image upload failed.');
        }

        uploadedImageUrls.push(uploadPayload.image_url);
      }

      const submissionPayload = {
        ...form,
        email: form.email || user?.primaryEmailAddress?.emailAddress || 'no-email@dosnine.local',
        image_url: uploadedImageUrls[0] || null,
        image_urls: uploadedImageUrls,
        is_featured: Boolean(selectedUpgrades.featured_business_badge || selectedPlan.id === '14-day' || selectedPlan.id === '30-day'),
        upgrades: Object.keys(selectedUpgrades).filter((key) => selectedUpgrades[key]),
      };

      const response = await fetch('/api/sponsors/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || `Unable to submit ad request. Server returned ${response.status}.`);
      }

      setSubmissionId(payload.id || '');
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('Ad request submitted. Complete payment to activate.');
    } catch (error) {
      const message = error?.message || 'Unable to submit ad request.';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Advertise on Dosnine Properties — Premium Property Advertising</title>
        <meta
          name="description"
          content="Advertise your business to active property buyers, renters, investors and homeowners across Jamaica. Premium plans, fast approval and direct inquiries."
        />
      </Head>

      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(90,122,205,0.11),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#f5f7fb_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          {step === 2 ? (
            <div className="rounded-none border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] sm:p-8">
              <div className="rounded-none bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-100">Secure Payment</p>
                <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Complete payment to activate your ad</h1>
                <p className="mt-3 max-w-2xl text-sm text-emerald-50 sm:text-base">
                  Your ad request has been received. Send payment proof on WhatsApp and we will confirm your campaign quickly.
                </p>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-4">
                  <div className="rounded-none border border-slate-200 bg-slate-50 p-5">
                    <h2 className="text-xl font-semibold text-slate-900">Your selected plan</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-none border border-slate-200 bg-white p-4">
                        <p className="text-sm text-slate-500">Plan</p>
                        <p className="mt-1 font-semibold text-slate-900">{selectedPlan.name}</p>
                      </div>
                      <div className="rounded-none border border-slate-200 bg-white p-4">
                        <p className="text-sm text-slate-500">Amount</p>
                        <p className="mt-1 font-semibold text-slate-900">{formatMoney(totalAmount)}</p>
                      </div>
                      <div className="rounded-none border border-slate-200 bg-white p-4">
                        <p className="text-sm text-slate-500">Duration</p>
                        <p className="mt-1 font-semibold text-slate-900">{selectedPlan.duration}</p>
                      </div>
                      <div className="rounded-none border border-slate-200 bg-white p-4">
                        <p className="text-sm text-slate-500">Submission ID</p>
                        <p className="mt-1 break-all font-semibold text-slate-900">{submissionId || 'Pending'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-none border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-lg font-semibold text-slate-900">How it works</h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-5">
                      {['Submit Ad', 'Secure Payment', 'Review', 'Published', 'Receive Leads'].map((stepName, index) => (
                        <div key={stepName} className="rounded-none border border-slate-200 bg-white p-3 text-center">
                          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-none bg-accent text-sm font-semibold text-white">{index + 1}</div>
                          <p className="mt-2 text-sm font-medium text-slate-700">{stepName}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-none border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-lg font-semibold text-slate-900">Bank transfer details</h3>
                    <div className="mt-4 space-y-3">
                      {bankDetails.map((bank) => (
                        <div key={bank.bank} className="rounded-none border border-slate-200 bg-white p-4">
                          <p className="font-semibold text-slate-900">{bank.bank}</p>
                          {Object.entries(bank).filter(([key]) => key !== 'bank').map(([key, value]) => (
                            <div key={key} className="mt-2 flex items-center justify-between gap-3">
                              <span className="text-sm text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(value, `${bank.bank}-${key}`)}
                                className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900"
                              >
                                <span>{value}</span>
                                {copied === `${bank.bank}-${key}` ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-none border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-600">Transfer note</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(emailForNote || submissionId, 'transfer-note')}
                          className="flex items-center gap-1 text-sm font-semibold text-slate-900"
                        >
                          <span className="break-all">{emailForNote || submissionId}</span>
                          {copied === 'transfer-note' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-600">Amount</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(totalAmount, 'amount')}
                          className="flex items-center gap-1 text-sm font-semibold text-slate-900"
                        >
                          <span>{formatMoney(totalAmount)}</span>
                          {copied === 'amount' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-none border border-slate-200 bg-slate-50 p-5">
                  <div className="rounded-none border border-slate-200 bg-white p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Payment confirmation</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">Send proof and we will activate your ad</h3>
                    <p className="mt-3 text-sm text-slate-600">
                      Once we verify your payment, your business is reviewed and published on the platform.
                    </p>
                    <a
                      href={`https://wa.me/18763369045?text=${whatsappText}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center justify-center gap-2 rounded-none bg-accent px-5 py-3 font-semibold text-white transition hover:bg-accent/90"
                    >
                      <MessageCircle className="h-5 w-5" />
                      Send proof on WhatsApp
                    </a>
                    <div className="mt-4">
                      <Link href="/" className="text-sm font-semibold text-accent underline">
                        Return to home
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <header className="rounded-none border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] sm:p-8 lg:p-14">
                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Advertise on Dosnine Properties</p>
                    <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                      Reach serious buyers and renters in Jamaica
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                      Premium placement for service businesses that want qualified leads, faster visibility, and a stronger local reputation.
                    </p>
                    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                      <a
                        href="#advertise-form"
                        className="inline-flex items-center justify-center gap-2 rounded-none bg-accent px-6 py-3.5 font-semibold text-white transition hover:bg-accent/90"
                      >
                        Start advertising today
                        <ArrowRight className="h-5 w-5" />
                      </a>
                      <a
                        href="#plans"
                        className="inline-flex items-center justify-center rounded-none border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        View ad plans
                      </a>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2 sm:gap-3">
                      {trustBadges.map((badge) => {
                        const Icon = badge.icon;
                        return <TrustPill key={badge.title} icon={Icon} title={badge.title} />;
                      })}
                    </div>
                  </div>

                  <div className="rounded-none border border-slate-200 bg-slate-50 p-5 shadow-inner sm:p-6">
                    <div className="rounded-none border border-slate-200 bg-white p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-500">Premium placement</p>
                          <p className="mt-1 text-2xl font-semibold text-slate-900">Trusted by growing service brands</p>
                        </div>
                        <div className="rounded-none bg-accent/10 p-3 text-accent">
                          <Sparkles className="h-6 w-6" />
                        </div>
                      </div>
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {metrics.map((metric, index) => (
                          <div
                            key={metric.label}
                            className="rounded-none border border-slate-200 bg-slate-50 p-4"
                          >
                            <p className="text-2xl font-semibold text-slate-900">{metric.value}</p>
                            <p className="mt-1 text-sm text-slate-600">{metric.label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 rounded-none border border-accent/20 bg-accent/5 p-4 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">Why it works</p>
                        <p className="mt-2">Your ad is seen by property-minded customers who are already looking for the services you offer.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              <section className="rounded-none border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] sm:p-8 lg:p-10">
                <SectionHeading
                  eyebrow="Why advertise"
                  title="A premium channel for serious service businesses"
                  subtitle="Every section is built to answer one question clearly: why should your business invest here?"
                />
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {reasons.map((reason) => {
                    const Icon = reason.icon;
                    return (
                      <div
                        key={reason.title}
                        className="rounded-none border border-slate-200 bg-slate-50 p-5 sm:p-6"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-none bg-accent/10 text-accent">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-900 sm:text-xl">{reason.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{reason.description}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section id="plans" className="rounded-none border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] sm:p-8 lg:p-10">
                <SectionHeading
                  eyebrow="Advertising plans"
                  title="Choose the plan that matches your growth stage"
                  subtitle="Pick a package that fits your budget, timeline, and visibility goals."
                />
                <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {plans.map((plan) => {
                    const selected = form.plan_id === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, plan_id: plan.id }))}
                        className={`relative flex h-full flex-col rounded-none border p-6 text-left transition hover:-translate-y-1 hover:shadow-lg sm:p-7 ${
                          selected
                            ? 'border-accent bg-accent text-white shadow-[0_20px_45px_-20px_rgba(90,122,205,0.55)]'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
                        }`}
                      >
                        {plan.popular ? (
                          <div className="absolute right-4 top-4 rounded-none bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                            Most Popular
                          </div>
                        ) : null}
                        <div className={`rounded-none bg-gradient-to-br ${plan.accent} p-3`}>
                          <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${selected ? 'text-white/80' : 'text-accent'}`}>{plan.badge}</p>
                          <h3 className={`mt-2 text-xl font-semibold sm:text-2xl ${selected ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                        </div>
                        <p className={`mt-4 text-sm leading-7 ${selected ? 'text-white/85' : 'text-slate-600'}`}>{plan.highlight}</p>
                        <div className="mt-5 flex items-end justify-between gap-3">
                          <div>
                            <p className={`text-sm ${selected ? 'text-white/80' : 'text-slate-500'}`}>Duration</p>
                            <p className={`text-base font-semibold ${selected ? 'text-white' : 'text-slate-900'}`}>{plan.duration}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm ${selected ? 'text-white/80' : 'text-slate-500'}`}>Price</p>
                            <p className={`text-xl font-semibold ${selected ? 'text-white' : 'text-slate-900'}`}>{formatMoney(plan.price)}</p>
                          </div>
                        </div>
                        <div className="mt-5 rounded-none border border-white/20 bg-white/10 p-4">
                          <p className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-700'}`}>Best for</p>
                          <p className={`mt-1 text-sm ${selected ? 'text-white/85' : 'text-slate-600'}`}>{plan.bestFor}</p>
                        </div>
                        <div className="mt-5 flex-1 space-y-3">
                          {plan.features.map((feature) => (
                            <div key={feature} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? 'text-white' : 'text-accent'}`} />
                              <span className={selected ? 'text-white/85' : 'text-slate-700'}>{feature}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-6 flex items-center justify-between gap-3 text-sm">
                          <span className={selected ? 'text-white/80' : 'text-slate-500'}>{plan.visibility}</span>
                          <span className={`font-semibold ${selected ? 'text-white' : 'text-accent'}`}>Choose plan</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-none border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] sm:p-10">
                <SectionHeading
                  eyebrow="Optional upgrades"
                  title="Make your campaign stand out even more"
                  subtitle="Add premium visibility features before you checkout."
                />
                <div className="mt-8 grid gap-4 lg:grid-cols-2">
                  {upgrades.map((upgrade) => {
                    const active = Boolean(selectedUpgrades[upgrade.key]);
                    return (
                      <label
                        key={upgrade.key}
                        className={`flex cursor-pointer items-start gap-3 rounded-none border p-5 transition ${
                          active ? 'border-accent bg-accent/5 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => setSelectedUpgrades((prev) => ({ ...prev, [upgrade.key]: !prev[upgrade.key] }))}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-900">{upgrade.label}</p>
                            <p className="text-sm font-semibold text-accent">+{formatMoney(upgrade.price)}</p>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{upgrade.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </section>

              <section id="advertise-form" className="rounded-none border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] sm:p-10">
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    <SectionHeading
                      eyebrow="Create your ad"
                      title="Tell us about your business and we will handle the rest"
                      subtitle="A polished listing increases trust and helps you attract better-qualified leads."
                    />
                    <form onSubmit={onSubmit} className="mt-8 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">Business Name</label>
                          <input
                            type="text"
                            value={form.company_name}
                            onChange={(event) => setForm((prev) => ({ ...prev, company_name: event.target.value }))}
                            className="w-full rounded-none border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-accent"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">Business Logo</label>
                          <input
                            type="text"
                            value={form.business_logo}
                            onChange={(event) => setForm((prev) => ({ ...prev, business_logo: event.target.value }))}
                            className="w-full rounded-none border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-accent"
                            placeholder="https://yourwebsite.com/logo.png"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">Ad Title</label>
                          <input
                            type="text"
                            value={form.title}
                            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                            className="w-full rounded-none border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-accent"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">Category</label>
                          <select
                            value={form.category}
                            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                            className="w-full rounded-none border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-accent"
                          >
                            {categories.map((category) => (
                              <option key={category.value} value={category.value}>
                                {category.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">Phone</label>
                          <div className="relative">
                            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              type="tel"
                              value={form.phone}
                              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                              className="w-full rounded-none border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 outline-none focus:border-accent"
                              placeholder="876-123-4567"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">WhatsApp</label>
                          <div className="relative">
                            <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              type="tel"
                              value={form.whatsapp}
                              onChange={(event) => setForm((prev) => ({ ...prev, whatsapp: event.target.value }))}
                              className="w-full rounded-none border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 outline-none focus:border-accent"
                              placeholder="876-123-4567"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              type="email"
                              value={form.email}
                              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                              className="w-full rounded-none border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 outline-none focus:border-accent"
                              placeholder="you@example.com"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">Website</label>
                          <div className="relative">
                            <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              type="url"
                              value={form.website}
                              onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
                              className="w-full rounded-none border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 outline-none focus:border-accent"
                              placeholder="https://yourwebsite.com"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">Contact Name</label>
                          <input
                            type="text"
                            value={form.contact_name}
                            onChange={(event) => setForm((prev) => ({ ...prev, contact_name: event.target.value }))}
                            className="w-full rounded-none border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-accent"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">Location</label>
                          <div className="relative">
                            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={form.location}
                              onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                              className="w-full rounded-none border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 outline-none focus:border-accent"
                              placeholder="Kingston, St. Andrew"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Upload Images</label>
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-none border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-accent hover:bg-accent/5">
                          <UploadCloud className="h-8 w-8 text-accent" />
                          <span className="mt-3 text-sm font-semibold text-slate-900">Upload up to 3 images</span>
                          <span className="mt-1 text-sm text-slate-500">PNG, JPG or WebP up to 8MB each</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            multiple
                            required
                            onChange={(event) => {
                              const selectedFiles = Array.from(event.target.files || []).slice(0, 3);
                              if (selectedFiles.length === 0) return;

                              const oversized = selectedFiles.find((file) => file.size > 8 * 1024 * 1024);
                              if (oversized) {
                                toast.error('Each image must be 8MB or less.');
                                return;
                              }

                              imagePreviews.forEach((url) => URL.revokeObjectURL(url));
                              setImageFiles(selectedFiles);
                              setImagePreviews(selectedFiles.map((file) => URL.createObjectURL(file)));

                              if ((event.target.files || []).length > 3) {
                                toast('Only the first 3 images were selected.');
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                        {imagePreviews.length > 0 ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            {imagePreviews.map((preview, index) => (
                              <img
                                key={`${preview}-${index}`}
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                className="h-24 w-full rounded-none object-cover"
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Description</label>
                        <textarea
                          value={form.description}
                          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                          className="w-full rounded-none border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-accent"
                          rows={5}
                          placeholder="Tell buyers what you offer, your location, and what makes your business stand out."
                          required
                        />
                      </div>

                      {submitError ? (
                        <div className="rounded-none border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          {submitError}
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex w-full items-center justify-center gap-2 rounded-none bg-accent px-6 py-3.5 font-semibold text-white transition hover:bg-accent/90 disabled:bg-slate-400"
                      >
                        {submitting ? 'Submitting...' : `Review & Continue to Secure Payment — ${formatMoney(totalAmount)}`}
                        {!submitting ? <ArrowRight className="h-5 w-5" /> : null}
                      </button>
                    </form>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-none border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Your order</p>
                      <div className="mt-4 rounded-none border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{selectedPlan.name}</p>
                            <p className="text-sm text-slate-600">{selectedPlan.duration}</p>
                          </div>
                          <p className="text-lg font-semibold text-slate-900">{formatMoney(selectedPlan.price)}</p>
                        </div>
                        {upgradeTotal > 0 ? (
                          <div className="mt-4 border-t border-slate-200 pt-4">
                            <p className="text-sm font-semibold text-slate-700">Add-ons</p>
                            <div className="mt-2 space-y-2 text-sm text-slate-600">
                              {Object.entries(selectedUpgrades).filter(([, active]) => active).map(([key]) => {
                                const upgrade = upgrades.find((option) => option.key === key);
                                return (
                                  <div key={key} className="flex items-center justify-between gap-3">
                                    <span>{upgrade?.label}</span>
                                    <span>{formatMoney(upgrade?.price || 0)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                        <div className="mt-4 border-t border-slate-200 pt-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-900">Estimated total</p>
                            <p className="text-xl font-semibold text-accent">{formatMoney(totalAmount)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 rounded-none border border-slate-200 bg-white p-4 text-sm text-slate-600">
                        <p className="font-semibold text-slate-900">What you get</p>
                        <ul className="mt-3 space-y-2">
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> Premium listing placement</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> Direct lead delivery</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> Fast review and approval</li>
                        </ul>
                      </div>
                    </div>

                    <div className="rounded-none border border-slate-200 bg-white p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Why businesses choose us</p>
                      <div className="mt-4 space-y-3">
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-accent" />
                          <span>Premium property audience with real buying intent.</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-accent" />
                          <span>Fast support on WhatsApp and email from our team.</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-accent" />
                          <span>No hidden fees. Just a clear, predictable investment.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-none border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] sm:p-10">
                <SectionHeading
                  eyebrow="Frequently asked questions"
                  title="Everything you need to know before you book"
                  subtitle="Clear answers reduce friction and remove uncertainty."
                />
                <div className="mt-8 space-y-3">
                  {faqs.map((faq) => (
                    <details key={faq.question} className="rounded-none border border-slate-200 bg-slate-50 p-4">
                      <summary className="cursor-pointer list-none font-semibold text-slate-900">{faq.question}</summary>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
}
