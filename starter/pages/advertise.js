import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

const plans = [
  {
    id: '7-day',
    name: '1 Week Ad',
    duration: '7 days',
    price: 5000,
    badge: 'Quick Boost',
    highlight: 'Reach active buyers and renters fast',
  },
  {
    id: '30-day',
    name: '1 Month Ad',
    duration: '30 days',
    price: 20000,
    badge: 'Best Reach',
    highlight: 'Maximum exposure to our wide audience',
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
  { value: 'legal', label: 'Legal Services' },
  { value: 'architect', label: 'Architect' },
  { value: 'mortgage', label: 'Mortgage Services' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'valuation', label: 'Valuation' },
  { value: 'home_inspection', label: 'Home Inspection' },
  { value: 'other', label: 'Other' },
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

export default function AdvertisePage() {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [form, setForm] = useState({
    company_name: '',
    title: '',
    category: 'contractor',
    description: '',
    phone: '',
    email: user?.primaryEmailAddress?.emailAddress || '',
    website: '',
    contact_name: '',
    plan_id: '7-day',
    is_featured: false,
  });

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === form.plan_id) || plans[0],
    [form.plan_id]
  );

  const emailForNote = (form.email || 'YOUR_EMAIL').trim();
  const transferNote = `${selectedPlan.name} - ${emailForNote}`;
  const whatsappText = encodeURIComponent(
    `Hello Dosnine Team, I submitted an ad request (${selectedPlan.name}) for ${submissionId}. Amount sent: ${formatMoney(selectedPlan.price)}. Submission: ${submissionId || 'pending'}. I am sending payment proof now.`
  );

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

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const onSubmit = async (event) => {
    event.preventDefault();

    if (imageFiles.length === 0) {
      toast.error('Please upload at least 1 ad image before continuing.');
      return;
    }

    setSubmitting(true);

    try {
      const uploadedImageUrls = [];

      for (const file of imageFiles) {
        const compressedImage = await compressImageToWebP(file);
        const filePath = `ads/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.webp`;

        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, compressedImage, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'image/webp',
          });

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        const publicData = supabase.storage.from('property-images').getPublicUrl(filePath);
        const publicUrl = publicData?.data?.publicUrl || publicData?.data?.publicURL || '';
        if (publicUrl) uploadedImageUrls.push(publicUrl);
      }

      if (uploadedImageUrls.length === 0) {
        throw new Error('Image upload failed.');
      }

      const response = await fetch('/api/sponsors/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          image_url: uploadedImageUrls[0] || null,
          image_urls: uploadedImageUrls,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to submit ad request.');
      }

      setSubmissionId(payload.id || '');
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('Ad request submitted. Complete payment to activate.');
    } catch (error) {
      toast.error(error.message || 'Unable to submit ad request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Advertise to Our Wide Audience — Dosnine Properties</title>
        <meta
          name="description"
          content="Promote your business to Jamaica-wide property buyers, renters, and homeowners. Weekly and monthly ad plans available."
        />
      </Head>

      <div className="bg-gray-100 min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {step === 2 ? (
            <div className="bg-white rounded-xl p-6 sm:p-8 space-y-6">
              <div className="bg-accent text-white rounded-xl p-6">
                <h1 className="text-3xl font-bold">Complete Payment to Activate Your Ad</h1>
                <p className="mt-2 text-white/90 text-sm sm:text-base">
                  Your ad request is received. Send payment proof on WhatsApp for verification.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-5">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Selected Plan</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-500">Plan</p>
                    <p className="font-semibold text-gray-900">{selectedPlan.name}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-500">Amount</p>
                    <p className="font-semibold text-gray-900">{formatMoney(selectedPlan.price)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-500">Duration</p>
                    <p className="font-semibold text-gray-900">{selectedPlan.duration}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-500">Submission ID</p>
                    <p className="font-semibold text-gray-900 break-all">{submissionId || 'Pending'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-100 rounded-xl p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Bank Transfer Details</h3>
                <div className="space-y-3">
                  {bankDetails.map((bank) => (
                    <div key={bank.bank} className="bg-white rounded-lg p-4 space-y-2">
                      <p className="font-semibold text-gray-900">{bank.bank}</p>
                      {Object.entries(bank).filter(([key]) => key !== 'bank').map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between gap-3">
                          <span className="text-gray-600 text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(value, `${bank.bank}-${key}`)}
                            className="inline-flex items-center gap-1 text-sm text-gray-900 font-medium"
                          >
                            <span>{value}</span>
                            {copied === `${bank.bank}-${key}` ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="mt-4 bg-white rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-600">Transfer note</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(submissionId, 'transfer-note')}
                      className="inline-flex items-center gap-1 text-sm text-gray-900 font-medium"
                    >
                      <span className="break-all">{submissionId}</span>
                      {copied === 'transfer-note' ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-600">Amount</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedPlan.price, 'amount')}
                      className="inline-flex items-center gap-1 text-sm text-gray-900 font-medium"
                    >
                      <span>{formatMoney(selectedPlan.price)}</span>
                      {copied === 'amount' ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 text-center">
                <p className="text-sm text-gray-700 mb-4">
                  After transfer, send your receipt on WhatsApp for verification. Ads are activated after confirmation.
                </p>
                <a
                  href={`https://wa.me/18763369045?text=${whatsappText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl px-6 py-3"
                >
                  Send Proof on WhatsApp
                </a>
                <div className="mt-4">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center text-accent font-semibold hover:text-accent/80 underline"
                  >
                    ← Return to Home
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl p-6 sm:p-8">
                <div className="bg-accent text-white rounded-xl p-6 sm:p-8 text-center">
                  <h1 className="text-3xl sm:text-4xl font-bold">Advertise to Our Wide Audience</h1>
                  <p className="mt-2 text-white/90 text-sm sm:text-base">
                    Reach buyers, renters, and homeowners across Jamaica with high-visibility ad placement.
                  </p>
                  <div className="mt-4 inline-flex items-center bg-white/15 rounded-lg px-4 py-2 text-sm font-semibold">
                    Ads go live after payment verification • Fast activation support on WhatsApp
                  </div>
                </div>

                <div className="mt-4 bg-gray-50 rounded-xl p-4">
                  <h2 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Why Advertise Here</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-700">
                    <p className="bg-white rounded-lg p-3"><span className="font-semibold text-gray-900">High Intent Audience</span><br />Reach people actively looking for property services.</p>
                    <p className="bg-white rounded-lg p-3"><span className="font-semibold text-gray-900">Simple Setup</span><br />Submit details once and complete payment in minutes.</p>
                    <p className="bg-white rounded-lg p-3"><span className="font-semibold text-gray-900">Direct Leads</span><br />Get WhatsApp and call inquiries straight to your business.</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {plans.map((plan) => {
                    const selected = form.plan_id === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, plan_id: plan.id }))}
                        className={`text-left rounded-xl p-5 transition relative ${
                          selected
                            ? 'bg-accent text-white ring-2 ring-accent/40'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        {selected && (
                          <span className="absolute top-3 right-3 bg-white text-accent text-xs font-bold px-2 py-1 rounded-full">
                            Selected
                          </span>
                        )}
                        <p className={`text-xs uppercase font-bold ${selected ? 'text-white/90' : 'text-accent'}`}>
                          {plan.badge}
                        </p>
                        <h3 className={`text-lg font-bold mt-1 ${selected ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                        <p className={`text-sm mt-1 ${selected ? 'text-white/90' : 'text-gray-600'}`}>{plan.highlight}</p>
                        <p className={`text-2xl font-bold mt-3 ${selected ? 'text-white' : 'text-gray-900'}`}>
                          {formatMoney(plan.price)}
                        </p>
                        <p className={`text-xs ${selected ? 'text-white/80' : 'text-gray-500'}`}>{plan.duration}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-5">Submit Your Ad Details</h2>

                <div className="bg-gray-50 rounded-xl p-4 mb-5">
                  <p className="text-xs uppercase tracking-wide text-gray-600 font-bold mb-2">Selected Plan</p>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{selectedPlan.name}</p>
                      <p className="text-sm text-gray-600">{selectedPlan.duration} • {selectedPlan.highlight}</p>
                    </div>
                    <p className="text-xl font-bold text-accent">{formatMoney(selectedPlan.price)}</p>
                  </div>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={form.company_name}
                      onChange={(event) => setForm((prev) => ({ ...prev, company_name: event.target.value }))}
                      className="w-full bg-gray-50 rounded-lg py-3 px-4"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Ad Title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                      className="w-full bg-gray-50 rounded-lg py-3 px-4"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                    <select
                      value={form.category}
                      onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                      className="w-full bg-gray-50 rounded-lg py-3 px-4"
                    >
                      {categories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                      className="w-full bg-gray-50 rounded-lg py-3 px-4"
                      placeholder="876-123-4567"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">This number is where clients will contact you.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                      className="w-full bg-gray-50 rounded-lg py-3 px-4"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={form.contact_name}
                      onChange={(event) => setForm((prev) => ({ ...prev, contact_name: event.target.value }))}
                      className="w-full bg-gray-50 rounded-lg py-3 px-4"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      value={form.website}
                      onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
                      className="w-full bg-gray-50 rounded-lg py-3 px-4"
                      placeholder="https://yourwebsite.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Upload Ad Images</label>
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
                      className="w-full bg-gray-50 rounded-lg py-3 px-4"
                    />
                    <p className="text-xs text-gray-500 mt-1">Required. Upload 1 to 3 images. Each image is compressed before upload (JPG/PNG/WebP, max 8MB each).</p>
                    {imagePreviews.length > 0 && (
                      <div className="mt-3 bg-gray-50 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {imagePreviews.map((preview, index) => (
                          <img
                            key={`${preview}-${index}`}
                            src={preview}
                            alt={`Ad preview ${index + 1}`}
                            className="h-24 w-full rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                      className="w-full bg-gray-50 rounded-lg py-3 px-4"
                      rows={5}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl py-4 disabled:bg-gray-400"
                  >
                    {submitting ? 'Submitting...' : `Submit & Continue to Payment — ${formatMoney(selectedPlan.price)}`}
                  </button>

                  <p className="text-xs text-gray-500 text-center">No ad is published until payment is verified.</p>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
