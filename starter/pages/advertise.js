import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Head from 'next/head';
import Link from 'next/link';
import { SignInButton, SignUpButton, useAuth, useUser } from '@clerk/nextjs';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Copy,
  Globe2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import toast from 'react-hot-toast';

const plans = [
  {
    id: '14-day',
    name: 'Professional',
    duration: '14 Days',
    price: 17999,
    badge: 'Most Popular',
    popular: true,
    gumroadUrl: 'https://dosnine.gumroad.com/l/ad-professional-14day',
  },
  {
    id: '30-day',
    name: 'Elite',
    duration: '30 Days',
    price: 52499,
    badge: 'Elite',
    gumroadUrl: 'https://dosnine.gumroad.com/l/ad-elite-30day',
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

const formatMoney = (value) => `J$${Number(value || 0).toLocaleString()}`;

const MAX_IMAGE_SIZE_KB = 250;
const MONTHLY_VISITORS = '57K+';
const SPOTS_LEFT = 4;
const SPOTS_TOTAL = 20;

const STORAGE_KEY = 'dosnine:ad-submission';
const STORAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const normalizeWebsite = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const isValidWebsite = (value) => {
  if (!value) return true;
  const normalized = normalizeWebsite(value);
  try {
    const url = new URL(normalized);
    return url.hostname.includes('.') && !/\s/.test(url.hostname);
  } catch {
    return false;
  }
};

/* -------------------- Persistence helpers -------------------- */

const persistSubmission = (data) => {
  try {
    const payload = JSON.stringify({ ...data, savedAt: Date.now() });
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (error) {
    console.error('Failed to persist submission:', error);
  }
};

const loadPersistedSubmission = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > STORAGE_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const clearPersistedSubmission = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
};

/* -------------------- Image processing -------------------- */

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
  if (!context) throw new Error('Unable to process image.');

  context.fillStyle = '#f8fafc';
  context.fillRect(0, 0, outputSize, outputSize);
  context.drawImage(image, startX, startY, cropSize, cropSize, 0, 0, outputSize, outputSize);

  const blobToFile = (blob) =>
    new File([blob], `${(file.name || 'ad-image').replace(/\.[^.]+$/, '')}.webp`, {
      type: 'image/webp',
    });

  let quality = 0.82;
  let outputBlob = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    outputBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Image compression failed.'));
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
      compressedFiles.push(await cropAndCompressAdImage(file));
    } catch (error) {
      console.error('Image compression failed:', error);
      compressedFiles.push(file);
    }
  }
  return compressedFiles;
};

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
  const [paymentMethod, setPaymentMethod] = useState('gumroad');
  const [paidSuccess, setPaidSuccess] = useState(false);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);
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
    plan_id: '14-day',
    is_featured: false,
  });

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === form.plan_id) || plans[0],
    [form.plan_id]
  );

  const totalAmount = selectedPlan.price;
  const emailForNote = (form.email || 'YOUR_EMAIL').trim();
  const whatsappText = encodeURIComponent(
    `Hello Dosnine Team, I submitted an ad request (${selectedPlan.name}). Amount sent: ${formatMoney(totalAmount)}. Submission: ${submissionId || 'pending'}. I am sending payment proof now.`
  );
  const gumroadWhatsappText = encodeURIComponent(
    `Hello Dosnine Team, I just paid for the ${selectedPlan.name} ad plan (${selectedPlan.duration}) via Gumroad. Email: ${emailForNote}. Amount: ${formatMoney(totalAmount)}. Submission: ${submissionId || 'pending'}. Please review and publish my ad.`
  );

  /* -------------------- Restore on mount -------------------- */
  useEffect(() => {
    const persisted = loadPersistedSubmission();
    if (persisted?.submissionId) {
      setSubmissionId(persisted.submissionId);
      if (persisted.form) {
        setForm((prev) => ({ ...prev, ...persisted.form }));
      }
      setStep(2);
      setRestoredFromStorage(true);
      toast.success('Welcome back — pick up where you left off.');
    }
  }, []);

  /* -------------------- Gumroad in-page overlay -------------------- */
  useEffect(() => {
    const handleMessage = (event) => {
      if (event?.data === 'purchase') {
        setPaidSuccess(true);
        clearPersistedSubmission();
        toast.success('Payment received — we will confirm your ad shortly.');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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

  const getFieldClassName = (field, baseClassName) =>
    `${baseClassName} ${fieldErrors[field] ? 'border-red-500 bg-red-50 focus:border-red-500' : ''}`;

  const handleStartOver = () => {
    clearPersistedSubmission();
    setSubmissionId('');
    setStep(1);
    setPaidSuccess(false);
    setRestoredFromStorage(false);
    setForm((prev) => ({
      ...prev,
      company_name: '',
      title: '',
      description: '',
      phone: '',
      whatsapp: '',
      website: '',
      contact_name: '',
      location: '',
    }));
    setImageFiles([]);
    setImagePreviews([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Starting a new ad submission.');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!isSignedIn) {
      requireSignIn();
      return;
    }

    const errors = {};
    if (!String(form.company_name || '').trim()) errors.company_name = 'Enter your business name.';
    if (!String(form.phone || '').trim()) errors.phone = 'Enter a phone number customers can use.';
    if (!String(form.description || '').trim()) errors.description = 'Describe your services.';
    if (!String(form.location || '').trim()) errors.location = 'Enter the area where you serve customers.';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.';
    if (form.website && !isValidWebsite(form.website)) {
      errors.website = 'Enter a valid website, e.g. example.com or https://example.com.';
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
          headers: { 'Content-Type': file.type || 'image/webp' },
          body: file,
        });
        const uploadPayload = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadPayload?.success || !uploadPayload?.image_url) {
          throw new Error(uploadPayload?.error || 'Image upload failed.');
        }
        uploadedImageUrls.push(uploadPayload.image_url);
      }

      setSaveStatus('Saving your ad request...');

      const submissionPayload = {
        ...form,
        website: normalizeWebsite(form.website),
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

      const newId = payload.id || '';
      setSubmissionId(newId);
      setSaveStatus('Saved. Preparing payment step...');

      persistSubmission({
        submissionId: newId,
        planId: selectedPlan.id,
        form: submissionPayload,
        imageUrls: uploadedImageUrls,
      });

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
          content="Advertise your business to active property buyers, renters, investors and homeowners across Jamaica."
        />
        <script src="https://gumroad.com/js/gumroad.js" defer />
      </Head>

      <div className="min-h-screen bg-white">
        {step === 2 ? (
          /* ---------- PAYMENT STEP ---------- */
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Hero banner */}
              <div className="bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-600 p-6 sm:p-8 lg:p-10">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                    {paidSuccess ? (
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    ) : (
                      <ShieldCheck className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100">
                      {paidSuccess ? 'Payment received' : 'Secure payment'}
                    </p>
                    <h1 className="mt-2 text-2xl font-semibold leading-tight text-white sm:text-3xl">
                      {paidSuccess
                        ? 'Thanks — we are setting up your profile'
                        : 'Complete payment to activate your ad'}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50">
                      {paidSuccess
                        ? 'Your payment went through. We are creating your Dosnine business profile and will email your login details shortly.'
                        : 'Your ad request has been received. Pay online with card, PayPal, or Apple Pay — your ad goes live once payment is confirmed.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Restored-from-storage notice */}
              {restoredFromStorage && !paidSuccess ? (
                <div className="border-b border-amber-100 bg-amber-50 px-6 py-4 sm:px-8 lg:px-10">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-start gap-2 text-sm text-amber-900">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      We saved your progress. You can complete payment anytime in the next 7 days.
                    </p>
                    <button
                      type="button"
                      onClick={handleStartOver}
                      className="inline-flex shrink-0 items-center justify-center rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                    >
                      Start over
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Body */}
              <div className="p-6 sm:p-8 lg:p-10">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
                  {/* LEFT: plan + payment */}
                  <div className="min-w-0 space-y-6">
                    {/* Plan summary */}
                    <div>
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Your selected plan
                      </h2>
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xl font-semibold text-slate-900">
                              {selectedPlan.name}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {selectedPlan.duration} of premium placement
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-semibold tracking-tight text-slate-900">
                              {formatMoney(totalAmount)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">One-time payment</p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                            Submission ID
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(submissionId || '', 'submission-id')}
                            className="inline-flex max-w-[60%] items-center gap-1.5 truncate font-mono text-xs font-semibold text-slate-900 transition hover:text-accent"
                            disabled={!submissionId}
                          >
                            <span className="truncate">{submissionId || 'Pending'}</span>
                            {submissionId ? (
                              copied === 'submission-id' ? (
                                <Check size={12} className="shrink-0" />
                              ) : (
                                <Copy size={12} className="shrink-0" />
                              )
                            ) : null}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Payment method tabs */}
                    {!paidSuccess ? (
                      <div className="flex rounded-full bg-slate-100 p-1" role="group">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('gumroad')}
                          aria-pressed={paymentMethod === 'gumroad'}
                          className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                            paymentMethod === 'gumroad'
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Pay Online
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('bank')}
                          aria-pressed={paymentMethod === 'bank'}
                          className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                            paymentMethod === 'bank'
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Bank Transfer
                        </button>
                      </div>
                    ) : null}

                    {/* Gumroad payment */}
                    {!paidSuccess && paymentMethod === 'gumroad' && (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                          <h3 className="text-base font-semibold text-slate-900">
                            Pay securely online
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Pay <strong>{formatMoney(totalAmount)}</strong> using card, PayPal, or
                            Apple Pay. Checkout opens right here — you never leave Dosnine.
                          </p>

                          <a
                            href={`${selectedPlan.gumroadUrl}?wanted=true&email=${encodeURIComponent(
  emailForNote
)}&submission_id=${encodeURIComponent(submissionId || '')}&utm_source=dosnine&utm_content=${selectedPlan.id}&utm_campaign=advertise`}


                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3.5 text-md font-semibold text-white transition hover:bg-accent/90"
                            data-gumroad-single-product="true"
                            rel="noreferrer"
                          >
                            Pay
                          </a>

                          <p className="mt-3 text-xs text-slate-500">
                            A secure overlay opens on this page. If it doesn&apos;t, the link opens
                            in a new tab.
                          </p>
                        </div>

                       
                      </div>
                    )}

                    {/* Bank transfer */}
                    {!paidSuccess && paymentMethod === 'bank' && (
                      <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h3 className="text-base font-semibold text-slate-900">
                          Bank transfer details
                        </h3>
                        <p className="mt-2 text-sm text-slate-600">
                          Transfer {formatMoney(totalAmount)} and send us the receipt on WhatsApp.
                        </p>
                        <div className="mt-4 space-y-3">
                          {bankDetails.map((bank) => (
                            <div
                              key={bank.bank}
                              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                            >
                              <p className="text-sm font-semibold text-slate-900">{bank.bank}</p>
                              <div className="mt-3 divide-y divide-slate-200">
                                {Object.entries(bank)
                                  .filter(([key]) => key !== 'bank')
                                  .map(([key, value]) => (
                                    <div
                                      key={key}
                                      className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                                    >
                                      <span className="text-xs capitalize text-slate-500">
                                        {key.replace(/([A-Z])/g, ' $1')}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          copyToClipboard(value, `${bank.bank}-${key}`)
                                        }
                                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 transition hover:text-accent"
                                      >
                                        <span className="truncate">{value}</span>
                                        {copied === `${bank.bank}-${key}` ? (
                                          <Check size={14} className="shrink-0" />
                                        ) : (
                                          <Copy size={14} className="shrink-0" />
                                        )}
                                      </button>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: confirmation */}
                  <aside className="lg:sticky lg:top-6 lg:self-start">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                        {paidSuccess ? 'Next step' : 'Confirmation'}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold leading-snug text-slate-900">
                        {paidSuccess
                          ? 'Send us a quick WhatsApp'
                          : 'Send proof and we will activate your ad'}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {paidSuccess
                          ? 'Include your submission ID so we can match your payment and publish faster.'
                          : paymentMethod === 'gumroad'
                          ? 'Forward the Gumroad receipt on WhatsApp so we can confirm and publish.'
                          : 'Once we verify your bank transfer, your ad goes through review and publishing.'}
                      </p>

                      <a
                        href={`https://wa.me/18763369045?text=${
                          paymentMethod === 'gumroad' && !paidSuccess
                            ? gumroadWhatsappText
                            : whatsappText
                        }`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent/90"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {paidSuccess
                          ? 'Confirm on WhatsApp'
                          : paymentMethod === 'gumroad'
                          ? 'Send Receipt on WhatsApp'
                          : 'Send Proof on WhatsApp'}
                      </a>

                    

                      <div className="mt-5 flex flex-col items-center gap-2 border-t border-slate-200 pt-4 text-center">
                        <button
                          type="button"
                          onClick={handleStartOver}
                          className="text-xs font-semibold text-slate-500 underline-offset-2 transition hover:text-slate-700 hover:underline"
                        >
                          Submit a different ad
                        </button>
                        <Link
                          href="/"
                          className="text-xs font-semibold text-slate-500 underline-offset-2 transition hover:text-slate-700 hover:underline"
                        >
                          Return to home
                        </Link>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ---------- HERO ---------- */}
            <section className="border-b border-slate-100">
              <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                  Advertise on Dosnine
                </p>
                <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                  Reach buyers, renters, and investors across Jamaica.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                  Your business appears in rotating sponsor slots across all Dosnine Properties
                  pages — seen by people actively searching for property and services.
                </p>

                <div className="mt-12 grid grid-cols-1 gap-6 border-t border-slate-100 pt-8 sm:grid-cols-3">
                  <div>
                    <p className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                      {MONTHLY_VISITORS}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Monthly visitors</p>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold text-slate-900 sm:text-4xl">High-intent</p>
                    <p className="mt-1 text-sm text-slate-500">Buyers & renters, not browsers</p>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                      {SPOTS_LEFT}/{SPOTS_TOTAL}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Spots left this month</p>
                  </div>
                </div>

                <div className="mt-10 flex flex-row gap-3">
                  <a
                    href="#advertise-form"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-accent/90 sm:flex-none sm:px-6"
                  >
                    Start advertising
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <a
                    href="#plans"
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:flex-none sm:px-6"
                  >
                    View pricing
                  </a>
                </div>
              </div>
            </section>

            {/* ---------- HOW IT WORKS ---------- */}
            <section className="border-b border-slate-100">
              <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
                <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                  How it works
                </h2>
                <p className="mt-6 max-w-3xl text-2xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-3xl">
                  Your business appears in rotating sponsor slots on desktop sidebars and mobile
                  banners across every Dosnine page.
                </p>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                  Sponsors rotate so visibility stays fair among all advertisers. Buyers see your
                  brand while they browse listings, requests, and market data.
                </p>

                <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
                  {[
                    { step: '01', title: 'Submit your ad', body: 'Tell us about your business in a two-minute form.' },
                    { step: '02', title: 'Pay & get approved', body: 'Secure payment, then we review and publish within hours.' },
                    { step: '03', title: 'Receive leads', body: 'Buyers and renters reach out by WhatsApp or phone.' },
                  ].map((item) => (
                    <div key={item.step}>
                      <p className="text-xs font-semibold tracking-widest text-slate-400">
                        {item.step}
                      </p>
                      <h3 className="mt-3 text-lg font-semibold text-slate-900">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ---------- PRICING ---------- */}
            <section id="plans" className="border-b border-slate-100">
              <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
                <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                  Pricing
                </h2>
                <p className="mt-6 max-w-2xl text-2xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-3xl">
                  One-time payment. No subscriptions.
                </p>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                  Choose how long you want your ad in rotation. Both plans include the same
                  placement — you are only choosing duration.
                </p>

                <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
                  {plans.map((plan) => {
                    const selected = form.plan_id === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, plan_id: plan.id }))}
                        className={`group relative flex flex-col rounded-2xl border p-6 text-left transition-all duration-200 sm:p-7 ${
                          selected
                            ? 'border-accent bg-accent text-white shadow-[0_24px_50px_-18px_rgba(90,122,205,0.55)]'
                            : 'border-slate-200 bg-white hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-xs font-semibold uppercase tracking-[0.22em] ${
                              selected ? 'text-white/70' : 'text-slate-400'
                            }`}
                          >
                            {plan.badge}
                          </p>
                          {plan.popular && (
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                selected ? 'bg-white text-accent' : 'bg-accent/10 text-accent'
                              }`}
                            >
                              Popular
                            </span>
                          )}
                        </div>

                        <h3
                          className={`mt-4 text-xl font-semibold ${
                            selected ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {plan.name}
                        </h3>

                        <div className="mt-6 flex items-baseline gap-2">
                          <span
                            className={`text-4xl font-semibold tracking-tight ${
                              selected ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {formatMoney(plan.price)}
                          </span>
                        </div>
                        <p
                          className={`mt-1 text-sm ${
                            selected ? 'text-white/70' : 'text-slate-500'
                          }`}
                        >
                          for {plan.duration.toLowerCase()}
                        </p>

                        <div
                          className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                            selected
                              ? 'bg-white text-accent'
                              : 'bg-slate-900 text-white group-hover:bg-accent'
                          }`}
                        >
                          {selected ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Selected
                            </>
                          ) : (
                            <>
                              Choose {plan.name}
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-8 max-w-2xl text-sm text-slate-500">
                  Only {SPOTS_LEFT} of {SPOTS_TOTAL} sponsor slots remain for this month. Once full,
                  new advertisers join the waitlist for next month.
                </p>
              </div>
            </section>

            {/* ---------- FORM ---------- */}
            <section id="advertise-form" className="border-b border-slate-100">
              <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
                <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                  Submit your ad
                </h2>
                <p className="mt-6 max-w-2xl text-2xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-3xl">
                  Tell us about your business. We&apos;ll handle the rest.
                </p>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                  A polished listing builds trust and helps you attract better-qualified leads.
                </p>

                {!isSignedIn ? (
                  <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-8 sm:p-10">
                    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/10">
                        <ShieldCheck className="h-6 w-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-slate-900">
                          Sign in to create your ad
                        </h3>
                        <p className="mt-1.5 text-sm leading-6 text-slate-600">
                          Create a free account to unlock the ad builder. You&apos;ll return here
                          automatically.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <SignInButton mode="modal">
                        <button
                          type="button"
                          onClick={requireSignIn}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent/90"
                        >
                          Sign In
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </SignInButton>
                      <SignUpButton mode="redirect" redirectUrl="/advertise" afterSignUpUrl="/advertise">
                        <button
                          type="button"
                          onClick={requireSignIn}
                          className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Create Free Account
                        </button>
                      </SignUpButton>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} noValidate className="mt-12 space-y-6">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Business Name
                      </label>
                      <input
                        id="ad-company_name"
                        type="text"
                        value={form.company_name}
                        onChange={(event) => {
                          clearFieldError('company_name');
                          setForm((prev) => ({ ...prev, company_name: event.target.value }));
                        }}
                        className={getFieldClassName(
                          'company_name',
                          'w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'
                        )}
                        aria-invalid={Boolean(fieldErrors.company_name)}
                      />
                      {fieldErrors.company_name ? (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.company_name}</p>
                      ) : null}
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Ad Title
                        </label>
                        <input
                          type="text"
                          value={form.title}
                          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Category
                        </label>
                        <select
                          value={form.category}
                          onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                        >
                          {categories.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Phone
                        </label>
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
                            className={getFieldClassName(
                              'phone',
                              'w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'
                            )}
                            placeholder="876-123-4567"
                            aria-invalid={Boolean(fieldErrors.phone)}
                          />
                        </div>
                        {fieldErrors.phone ? (
                          <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
                        ) : null}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          WhatsApp
                        </label>
                        <div className="relative">
                          <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="tel"
                            value={form.whatsapp}
                            onChange={(event) => setForm((prev) => ({ ...prev, whatsapp: event.target.value }))}
                            className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                            placeholder="876-123-4567"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Email
                        </label>
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
                            className={getFieldClassName(
                              'email',
                              'w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'
                            )}
                            placeholder="you@example.com"
                            aria-invalid={Boolean(fieldErrors.email)}
                          />
                        </div>
                        {fieldErrors.email ? (
                          <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                        ) : null}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Website
                        </label>
                        <div className="relative">
                          <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            id="ad-website"
                            type="text"
                            inputMode="url"
                            autoComplete="url"
                            value={form.website}
                            onChange={(event) => {
                              clearFieldError('website');
                              setForm((prev) => ({ ...prev, website: event.target.value }));
                            }}
                            className={getFieldClassName(
                              'website',
                              'w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'
                            )}
                            placeholder="example.com"
                            aria-invalid={Boolean(fieldErrors.website)}
                          />
                        </div>
                        {fieldErrors.website ? (
                          <p className="mt-1 text-sm text-red-600">{fieldErrors.website}</p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-500">
                            Optional. example.com or https://example.com both work.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Contact Name
                        </label>
                        <input
                          type="text"
                          value={form.contact_name}
                          onChange={(event) => setForm((prev) => ({ ...prev, contact_name: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Location
                        </label>
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
                            className={getFieldClassName(
                              'location',
                              'w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'
                            )}
                            placeholder="Kingston, St. Andrew"
                            aria-invalid={Boolean(fieldErrors.location)}
                          />
                        </div>
                        {fieldErrors.location ? (
                          <p className="mt-1 text-sm text-red-600">{fieldErrors.location}</p>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Upload Images
                      </label>
                      <label
                        id="ad-imageFiles"
                        tabIndex={-1}
                        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition hover:border-accent hover:bg-accent/5 ${
                          fieldErrors.imageFiles ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-slate-50'
                        }`}
                      >
                        <UploadCloud className="h-8 w-8 text-accent" />
                        <span className="mt-3 text-sm font-semibold text-slate-900">
                          Upload up to 3 images
                        </span>
                        <span className="mt-1 text-sm text-slate-500">
                          PNG, JPG or WebP up to 8MB each
                        </span>
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
                              toast.success('Images ready.');
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
                      {fieldErrors.imageFiles ? (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.imageFiles}</p>
                      ) : null}
                      {imagePreviews.length > 0 ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          {imagePreviews.map((preview, index) => (
                            <div
                              key={`${preview}-${index}`}
                              className="relative aspect-square w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                            >
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
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Description
                      </label>
                      <textarea
                        id="ad-description"
                        value={form.description}
                        onChange={(event) => {
                          clearFieldError('description');
                          setForm((prev) => ({ ...prev, description: event.target.value }));
                        }}
                        className={getFieldClassName(
                          'description',
                          'w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'
                        )}
                        rows={5}
                        placeholder="Tell buyers what you offer, your location, and what makes your business stand out."
                        aria-invalid={Boolean(fieldErrors.description)}
                      />
                      {fieldErrors.description ? (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.description}</p>
                      ) : null}
                    </div>

                    {submitError ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {submitError}
                      </div>
                    ) : null}

                    {submitting ? (
                      <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-sm text-slate-700">
                        <div className="flex items-center gap-3">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                          <span>{saveStatus || 'Saving your ad request...'}</span>
                        </div>
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-4 text-base font-semibold text-white transition hover:bg-accent/90 disabled:bg-slate-400"
                    >
                      {submitting ? saveStatus || 'Saving...' : `Continue to Payment — ${formatMoney(totalAmount)}`}
                      {!submitting ? <ArrowRight className="h-5 w-5" /> : null}
                    </button>
                  </form>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}