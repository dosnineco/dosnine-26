import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Head from 'next/head';
import Link from 'next/link';
import { SignInButton, SignUpButton, useAuth, useUser } from '@clerk/nextjs';
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
    accent: 'from-accent/20 to-violet-500/10',
    popular: true,
  },
  {
    id: '14-day',
    name: 'Professional',
    duration: '14 Days',
    price: 17999,
    badge: 'Professional',
    accent: 'from-cyan-500/15 to-blue-500/10',
  },
  {
    id: '30-day',
    name: 'Elite',
    duration: '30 Days',
    price: 52499,
    badge: 'Elite',
    accent: 'from-emerald-500/15 to-teal-500/10',
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

const MAX_IMAGE_SIZE_KB = 250;

const cropAndCompressAdImage = async (file, outputSize = 1200, maxBytes = MAX_IMAGE_SIZE_KB * 1024) => {
  const image = await new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Invalid image file.'));
    };

    img.src = objectUrl;
  });

  const cropSize = Math.min(image.width, image.height);
  const startX = (image.width - cropSize) / 2;
  const startY = (image.height - cropSize) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to process image.');
  }

  context.fillStyle = '#f8fafc';
  context.fillRect(0, 0, outputSize, outputSize);
  context.drawImage(image, startX, startY, cropSize, cropSize, 0, 0, outputSize, outputSize);

  const blobToFile = (blob) =>
    new File(
      [blob],
      `${(file.name || 'ad-image').replace(/\.[^.]+$/, '')}.webp`,
      { type: 'image/webp' }
    );

  let quality = 0.82;
  let outputBlob = null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    outputBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Image compression failed.'));
            return;
          }
          resolve(blob);
        },
        'image/webp',
        quality
      );
    });

    if (outputBlob.size <= maxBytes || quality <= 0.38) break;
    quality -= 0.12;
  }

  return blobToFile(outputBlob || new Blob([], { type: 'image/webp' }));
};

const compressImageFiles = async (files) => {
  const compressedFiles = [];

  for (const file of files) {
    if (!file) continue;
    try {
      const compressed = await cropAndCompressAdImage(file);
      compressedFiles.push(compressed);
    } catch (error) {
      console.error('Image compression failed:', error);
      compressedFiles.push(file);
    }
  }

  return compressedFiles;
};

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
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [copied, setCopied] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
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

  const totalAmount = selectedPlan.price;
  const emailForNote = (form.email || 'YOUR_EMAIL').trim();
  const whatsappText = encodeURIComponent(
    `Hello Dosnine Team, I submitted an ad request (${selectedPlan.name}) for ${submissionId}. Amount sent: ${formatMoney(totalAmount)}. Submission: ${submissionId || 'pending'}. I am sending payment proof now.`
  );

  useEffect(() => {
    if (!isSignedIn) {
      sessionStorage.setItem('redirectAfterSignIn', '/advertise');
      return;
    }

    if (user?.primaryEmailAddress?.emailAddress && !form.email) {
      setForm((prev) => ({ ...prev, email: user.primaryEmailAddress.emailAddress }));
    }
  }, [user, form.email, isSignedIn]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const requireSignIn = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('redirectAfterSignIn', '/advertise');
    }
  };

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

  const clearFieldError = (field) => {
    setFieldErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const getFieldClassName = (field, baseClassName) => (
    `${baseClassName} ${fieldErrors[field] ? 'border-red-500 bg-red-50 focus:border-red-500' : ''}`
  );

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!isSignedIn) {
      requireSignIn();
      return;
    }

    const errors = {};
    if (!String(form.company_name || '').trim()) errors.company_name = 'Enter your business name.';
    if (!String(form.phone || '').trim()) errors.phone = 'Enter a phone number customers can use.';
    if (!String(form.description || '').trim()) errors.description = 'Describe your services and what makes your business useful.';
    if (!String(form.location || '').trim()) errors.location = 'Enter the area where you serve customers.';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.';
    if (form.website) {
      try {
        new URL(form.website);
      } catch {
        errors.website = 'Enter a complete website address, including https://.';
      }
    }
    if (imageFiles.length === 0) errors.imageFiles = 'Upload at least 1 image for your advertisement.';

    setFieldErrors(errors);
    setSubmitError(Object.keys(errors).length > 0 ? 'Please fix the highlighted fields before continuing.' : '');

    if (Object.keys(errors).length > 0) {
      const firstField = Object.keys(errors)[0];
      const fieldElement = document.getElementById(`ad-${firstField}`);
      fieldElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      fieldElement?.focus({ preventScroll: true });
      toast.error(errors[firstField]);
      return;
    }

    setSaveStatus('Saving your ad details...');
    setSubmitting(true);

    try {
      const toastId = toast.loading('Cropping to square and storing images…');
      setSaveStatus('Processing and saving images...');
      const compressedFiles = await compressImageFiles(imageFiles);
      toast.dismiss(toastId);

      const uploadedImageUrls = [];

      setSaveStatus('Uploading images...');

      for (const file of compressedFiles) {
        const uploadResponse = await fetch('/api/sponsors/upload-images', {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'image/webp',
          },
          body: file,
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

      setSaveStatus('Saving your ad request...');

      const submissionPayload = {
        ...form,
        email: form.email || user?.primaryEmailAddress?.emailAddress || 'no-email@dosnine.local',
        image_url: uploadedImageUrls[0] || null,
        image_urls: uploadedImageUrls,
        is_featured: Boolean(selectedPlan.id === '14-day' || selectedPlan.id === '30-day'),
      };

      const token = await getToken();
      const response = await fetch('/api/sponsors/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
      setSaveStatus('Saved. Preparing payment step...');
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('Ad request submitted. Complete payment to activate.');
    } catch (error) {
      const message = error?.message || 'Unable to submit ad request.';
      setSubmitError(message);
      setSaveStatus('');
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
              <header className="rounded-none border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] sm:p-8">
                <div className="max-w-3xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Advertise on Dosnine Properties</p>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
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
                </div>
              </header>

              <section className="rounded-none border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] sm:p-8 lg:p-10">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    'Premium listing placement',
                    'Direct WhatsApp and phone enquiries',
                    'Fast review and approval',
                  ].map((item) => (
                    <div key={item} className="rounded-none border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
                      <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" />{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section id="plans" className="rounded-none border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] sm:p-8 lg:p-10">
                <p className="text-center text-sm font-medium text-slate-600">Your ad is shown across the Dosnine Properties website to daily viewers.</p>
                <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
                        <div className="mt-6 flex items-center justify-end gap-3 text-sm">
                          <span className={`font-semibold ${selected ? 'text-white' : 'text-accent'}`}>Choose plan</span>
                        </div>
                      </button>
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

                    {!isSignedIn ? (
                      <div className="mt-8 rounded-none border border-accent/20 bg-accent/5 p-5">
                        <h3 className="text-lg font-semibold text-slate-900">Sign in to continue</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Please sign in or create an account before submitting your ad request. You will be returned here automatically after sign-in.
                        </p>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                          <SignInButton mode="modal">
                            <button
                              type="button"
                              onClick={requireSignIn}
                              className="px-3 py-2 rounded-lg transition text-sm text-gray-600 hover:bg-gray-100"
                            >
                              Sign In
                            </button>
                          </SignInButton>
                          <SignUpButton mode="redirect" redirectUrl="/advertise" afterSignUpUrl="/advertise">
                            <button
                              type="button"
                              onClick={requireSignIn}
                              className="inline-flex items-center justify-center rounded-none border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Create Account
                            </button>
                          </SignUpButton>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
                        <div className="grid gap-4 md:grid-cols-1">
                          <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Business Name</label>
                            <input
                              id="ad-company_name"
                              type="text"
                              value={form.company_name}
                              onChange={(event) => {
                                clearFieldError('company_name');
                                setForm((prev) => ({ ...prev, company_name: event.target.value }));
                              }}
                              className={getFieldClassName('company_name', 'w-full rounded-none border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-accent')}
                              aria-invalid={Boolean(fieldErrors.company_name)}
                            />
                            {fieldErrors.company_name ? <p className="mt-1 text-sm text-red-600">{fieldErrors.company_name}</p> : null}
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
                                id="ad-phone"
                                type="tel"
                                value={form.phone}
                                onChange={(event) => {
                                  clearFieldError('phone');
                                  setForm((prev) => ({ ...prev, phone: event.target.value }));
                                }}
                                className={getFieldClassName('phone', 'w-full rounded-none border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 outline-none focus:border-accent')}
                                placeholder="876-123-4567"
                                aria-invalid={Boolean(fieldErrors.phone)}
                              />
                            </div>
                            {fieldErrors.phone ? <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p> : null}
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
                                id="ad-email"
                                type="email"
                                value={form.email}
                                onChange={(event) => {
                                  clearFieldError('email');
                                  setForm((prev) => ({ ...prev, email: event.target.value }));
                                }}
                                className={getFieldClassName('email', 'w-full rounded-none border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 outline-none focus:border-accent')}
                                placeholder="you@example.com"
                                aria-invalid={Boolean(fieldErrors.email)}
                              />
                            </div>
                            {fieldErrors.email ? <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p> : null}
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Website</label>
                            <div className="relative">
                              <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input
                                id="ad-website"
                                type="url"
                                value={form.website}
                                onChange={(event) => {
                                  clearFieldError('website');
                                  setForm((prev) => ({ ...prev, website: event.target.value }));
                                }}
                                className={getFieldClassName('website', 'w-full rounded-none border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 outline-none focus:border-accent')}
                                placeholder="https://yourwebsite.com"
                                aria-invalid={Boolean(fieldErrors.website)}
                              />
                            </div>
                            {fieldErrors.website ? <p className="mt-1 text-sm text-red-600">{fieldErrors.website}</p> : null}
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
                                id="ad-location"
                                type="text"
                                value={form.location}
                                onChange={(event) => {
                                  clearFieldError('location');
                                  setForm((prev) => ({ ...prev, location: event.target.value }));
                                }}
                                className={getFieldClassName('location', 'w-full rounded-none border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 outline-none focus:border-accent')}
                                placeholder="Kingston, St. Andrew"
                                aria-invalid={Boolean(fieldErrors.location)}
                              />
                            </div>
                            {fieldErrors.location ? <p className="mt-1 text-sm text-red-600">{fieldErrors.location}</p> : null}
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">Upload Images</label>
                          <label id="ad-imageFiles" tabIndex={-1} className={`flex cursor-pointer flex-col items-center justify-center rounded-none border border-dashed px-6 py-8 text-center transition hover:border-accent hover:bg-accent/5 ${fieldErrors.imageFiles ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-slate-50'}`}>
                            <UploadCloud className="h-8 w-8 text-accent" />
                            <span className="mt-3 text-sm font-semibold text-slate-900">Upload up to 3 images</span>
                            <span className="mt-1 text-sm text-slate-500">PNG, JPG or WebP up to 8MB each</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              multiple
                              required
                              onChange={async (event) => {
                                const selectedFiles = Array.from(event.target.files || []).slice(0, 3);
                                if (selectedFiles.length === 0) return;

                                clearFieldError('imageFiles');

                                const oversized = selectedFiles.find((file) => file.size > 8 * 1024 * 1024);
                                if (oversized) {
                                  toast.error('Each image must be 8MB or less.');
                                  return;
                                }

                                const loadingId = toast.loading('Cropping to square and compressing images…');
                                try {
                                  const compressedFiles = await compressImageFiles(selectedFiles);
                                  imagePreviews.forEach((url) => URL.revokeObjectURL(url));
                                  setImageFiles(compressedFiles);
                                  setImagePreviews(compressedFiles.map((file) => URL.createObjectURL(file)));
                                  toast.dismiss(loadingId);
                                  toast.success('Images cropped to square and ready to store.');
                                } catch (error) {
                                  toast.dismiss(loadingId);
                                  toast.error(error?.message || 'Unable to process images.');
                                }

                                if ((event.target.files || []).length > 3) {
                                  toast('Only the first 3 images were selected.');
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                          {fieldErrors.imageFiles ? <p className="mt-1 text-sm text-red-600">{fieldErrors.imageFiles}</p> : null}
                          {imagePreviews.length > 0 ? (
                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              {imagePreviews.map((preview, index) => (
                                <div key={`${preview}-${index}`} className="relative aspect-square w-full overflow-hidden rounded-none border border-slate-200 bg-slate-100">
                                  <Image
                                    src={preview}
                                    alt={`Preview ${index + 1}`}
                                    fill
                                    unoptimized
                                    className="object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">Description</label>
                          <textarea
                            id="ad-description"
                            value={form.description}
                            onChange={(event) => {
                              clearFieldError('description');
                              setForm((prev) => ({ ...prev, description: event.target.value }));
                            }}
                            className={getFieldClassName('description', 'w-full rounded-none border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-accent')}
                            rows={5}
                            placeholder="Tell buyers what you offer, your location, and what makes your business stand out."
                            aria-invalid={Boolean(fieldErrors.description)}
                          />
                          {fieldErrors.description ? <p className="mt-1 text-sm text-red-600">{fieldErrors.description}</p> : null}
                        </div>

                        {submitError ? (
                          <div className="rounded-none border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {submitError}
                          </div>
                        ) : null}

                        {submitting ? (
                          <div className="rounded-none border border-accent/20 bg-accent/5 p-3 text-sm text-slate-700">
                            <div className="flex items-center gap-3">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                              <span>{saveStatus || 'Saving your ad request...'}</span>
                            </div>
                          </div>
                        ) : null}

                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex w-full items-center justify-center gap-2 rounded-none bg-accent px-6 py-4 text-base font-bold text-white transition hover:bg-accent/90 disabled:bg-slate-400"
                        >
                          {submitting ? (saveStatus || 'Saving...') : `Pay ${formatMoney(totalAmount)}`}
                          {!submitting ? <ArrowRight className="h-5 w-5" /> : null}
                        </button>
                      </form>
                    )}
                  </div>

                </div>
              </section>

            </>
          )}
        </div>
      </div>
    </>
  );
}
