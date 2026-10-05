import { useState, useRef, useEffect, useMemo } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  Upload,
  CheckCircle,
  Loader,
  Check,
  Copy,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Truck,
  Clock,
  Star,
  Zap,
  TrendingUp,
  X,
  MessageCircle,
} from 'lucide-react';

/* ============================================================
 * Constants
 * ============================================================ */

const QUANTITIES = [
  { qty: 5, badge: 'Try it out' },
  { qty: 10, badge: 'Most popular', highlight: true },
  { qty: 20, badge: 'Best value' },
];

const SIZES = {
  small: {
    label: '3"',
    sub: 'Small',
    bestFor: 'Caps, pockets, small items',
    packs: { 5: 2750, 10: 4400, 20: 7700 },
  },
  large: {
    label: '6"',
    sub: 'Large',
    bestFor: 'T-shirts, bags',
    packs: { 5: 4400, 10: 8250, 20: 14300 },
  },
  xlarge: {
    label: '10"',
    sub: 'Xtra Large',
    bestFor: 'Jackets, banners, signage',
    packs: { 5: 7150, 10: 13750, 20: 25300 },
  },
};

const CONVERSION_CHARGE = 500;
const MIN_QTY = 5;
const WHATSAPP_NUMBER = '18763369045';

const CONVERSION_SAMPLES = [
  '/logos/c5b4106c-f2ba-4cf0-8bdb-940fb44068a4.png',
  '/logos/2178ecd9-88e7-497b-993b-1ca4c96692ee.png',
  '/logos/291a49f3-a6d9-4540-9752-ef8e8b380e9b.png',
  '/logos/203c52af-39c0-46e4-8c30-2d378e24525c.png',
];

const KNUTSFORD_LOCATIONS = [
  'Angels (Spanish Town), St. Catherine',
  'Drax Hall, St. Ann',
  'Falmouth, Trelawny',
  'Gutters, St. Elizabeth',
  'Harbour View, Kingston',
  'New Kingston, Kingston',
  'Luana, St. Elizabeth',
  'Lucea, Hanover',
  'Mandeville, Manchester',
  'May Pen, Clarendon',
  'Montego Bay (Pier 1), St. James',
  'Montego Bay Airport, St. James',
  'Negril, Westmoreland',
  'Ocho Rios, St. Ann',
  'Port Antonio, Portland',
  'Port Maria, St. Mary',
  'Portmore, St. Catherine',
  'Savanna-La-Mar, Westmoreland',
  'Washington Boulevard, Kingston',
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

const TESTIMONIALS = [
  {
    name: 'Andre P.',
    business: "Andre's Barbershop, Kingston",
    quote:
      'Ordered 20 shirt logos for my team. Clean cut, sharp edges, arrived at Knutsford in 3 days. Will order again.',
    stars: 5,
  },
  {
    name: 'Shanice W.',
    business: 'Sweet Treats Bakery, Mandeville',
    quote:
      'The conversion fee is worth it — my messy PNG came out looking professional on my cake boxes.',
    stars: 5,
  },
  {
    name: 'Marcus T.',
    business: 'MT Auto Detailing, Montego Bay',
    quote:
      'Fast turnaround, fair price. Paid in the morning, cutting started same day.',
    stars: 5,
  },
];

const FAQS = [
  {
    q: 'How long does it take?',
    a: 'Orders are cut and dispatched within 2–3 business days after payment clears. Knutsford Express typically delivers the next day.',
  },
  {
    q: 'What file do I need to send?',
    a: 'Any clean image — PNG, JPG, or even a phone photo. We convert it into cut-ready vector artwork for J$500.',
  },
  {
    q: 'What if I want more than 20?',
    a: 'No problem. Enter any custom amount on step 1 and we price it based on the nearest pack tier.',
  },
  {
    q: 'How do I pay?',
    a: 'Bank transfer to Scotiabank. After you place the order we show you the account details and a one-tap WhatsApp link to send your proof.',
  },
  {
    q: 'Can I pick up instead of Knutsford?',
    a: "Yes — message us on WhatsApp after ordering and we'll arrange a pickup.",
  },
];

const STORAGE_KEY = 'dosnine:logo-order-draft';

/* ============================================================
 * Helpers
 * ============================================================ */

const computePrice = (sizeKey, qty) => {
  if (!sizeKey || !qty) return 0;
  const packs = SIZES[sizeKey].packs;
  if (packs[qty] !== undefined) return packs[qty];
  if (qty > 20) return packs[20] + (qty - 20) * Math.round(packs[20] / 20);
  if (qty > 10) return packs[10] + (qty - 10) * Math.round(packs[10] / 10);
  if (qty > 5) return packs[5] + (qty - 5) * Math.round(packs[5] / 5);
  return Math.round((packs[5] / 5) * qty);
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
};

const formatJamaicanPhone = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '');
  const local = digits.startsWith('1') ? digits.slice(1) : digits;
  if (local.length <= 3) return local;
  if (local.length <= 6) return `${local.slice(0, 3)}-${local.slice(3)}`;
  return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6, 10)}`;
};

const validatePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  const local = digits.startsWith('1') ? digits.slice(1) : digits;
  return local.length === 10;
};

const escapeHtml = (text) => {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text || '').replace(/[&<>"']/g, (char) => map[char]);
};

const formatCurrency = (amount) => `JMD ${Number(amount || 0).toLocaleString()}`;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/* ============================================================
 * Page
 * ============================================================ */

export default function LogoPage() {
  const [step, setStep] = useState(1);
  const [quantity, setQuantity] = useState(null);
  const [customQuantity, setCustomQuantity] = useState('');
  const [showMinQtyNotice, setShowMinQtyNotice] = useState(false);
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [showStickyCta, setShowStickyCta] = useState(false);

  const fileInputRef = useRef(null);
  const formTopRef = useRef(null);

  const price = computePrice(size, quantity);
  const total = price + CONVERSION_CHARGE;
  const totalSteps = 4;
  const progress = (Math.min(step, totalSteps) / totalSteps) * 100;

  /* ----------------------------------------------------------
   * Persistence — resume draft on reload
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved?.savedAt) return;
      if (Date.now() - saved.savedAt > 24 * 60 * 60 * 1000) {
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }
      if (saved.customerName) setCustomerName(saved.customerName);
      if (saved.phone) setPhone(saved.phone);
      if (saved.deliveryLocation) setDeliveryLocation(saved.deliveryLocation);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!customerName && !phone && !deliveryLocation) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          customerName,
          phone,
          deliveryLocation,
          savedAt: Date.now(),
        })
      );
    } catch {
      /* ignore */
    }
  }, [customerName, phone, deliveryLocation]);

  /* ----------------------------------------------------------
   * Sticky CTA on scroll (step 1 only)
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setShowStickyCta(window.scrollY > 400 && step === 1);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [step]);

  /* ----------------------------------------------------------
   * Scroll to top of form on step change
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  /* ----------------------------------------------------------
   * File upload
   * ---------------------------------------------------------- */
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoFile(file);
      setLogoPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  /* ----------------------------------------------------------
   * Submit order + notify admin via email
   * ---------------------------------------------------------- */
  const handleSubmitOrder = async () => {
    if (!customerName || customerName.trim().length < 2) {
      toast.error('Enter your name');
      return;
    }
    if (!deliveryLocation) {
      toast.error('Pick a Knutsford Express pickup location');
      return;
    }
    if (!validatePhone(phone)) {
      toast.error('Enter a valid 10-digit Jamaican number');
      return;
    }

    setSubmitting(true);
    try {
      let logoUrl = 'manual-entry';
      let logoFilename = 'manual-entry';

      if (logoFile && logoPreview) {
        try {
          const logoDataUrl = await fileToDataUrl(logoFile);
          const uploadResponse = await fetch('/api/admin/upload-logo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: logoDataUrl, filename: logoFile.name }),
          });
          const uploadData = await uploadResponse.json();
          if (uploadResponse.ok && uploadData.logoUrl) {
            logoUrl = uploadData.logoUrl;
            logoFilename = uploadData.filename;
          } else {
            throw new Error(uploadData.error || 'Logo upload failed');
          }
        } catch (uploadErr) {
          console.error('Logo upload error:', uploadErr);
          toast.error('Logo upload failed. Please try again.');
          setSubmitting(false);
          return;
        }
      }

      const cleanPhone = String(phone).replace(/\D/g, '');
      const cleanName = escapeHtml(customerName.trim());

      const payload = {
        business_name: cleanName,
        phone: sanitizeInput(cleanPhone),
        email: '',
        location: escapeHtml(deliveryLocation),
        color,
        size,
        quantity,
        subtotal: price.toFixed(2),
        delivery_fee: '0.00',
        total: total.toFixed(2),
        expenses: CONVERSION_CHARGE.toFixed(2),
        revenue: price.toFixed(2),
        status: 'pending',
        rush_order: false,
        logo_url: logoUrl,
        logo_filename: logoFilename,
        raw_material_cost: '0.00',
        labor_cost: '0.00',
        other_expenses: '0.00',
        profit: '0.00',
        notes: `Customer: ${cleanName} · ${color} ${SIZES[size]?.sub} · ${quantity} units`,
      };

      const response = await fetch('/api/admin/htv-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to submit order');
      }

      const createdId = data.order?.id || data.id || null;
      setOrderId(createdId);
      setOrderPlaced(true);
      setStep(5);

      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }

      // Fire admin notification email (non-blocking)
      fetch('/api/logo/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: createdId,
          customerName: customerName.trim(),
          phone: cleanPhone,
          deliveryLocation,
          size,
          sizeLabel: SIZES[size]?.sub,
          sizeInches: SIZES[size]?.label,
          color,
          quantity,
          price,
          conversionCharge: CONVERSION_CHARGE,
          total,
          logoUrl,
        }),
      }).catch((err) => {
        console.error('Admin notification failed:', err);
      });
    } catch (err) {
      console.error('Order submission failed', err);
      toast.error(err.message || 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappText = encodeURIComponent(
    `Hello Dosnine, I just placed a logo cutting order${
      orderId ? ` (Order #${String(orderId).slice(0, 8).toUpperCase()})` : ''
    }.\n\n` +
      `• Quantity: ${quantity} x ${SIZES[size]?.sub} (${SIZES[size]?.label})\n` +
      `• Color: ${color}\n` +
      `• Name: ${customerName}\n` +
      `• Pickup: ${deliveryLocation}\n` +
      `• Amount: ${formatCurrency(total)}\n\n` +
      `Sending payment proof now.`
  );

  /* ----------------------------------------------------------
   * Derived
   * ---------------------------------------------------------- */
  const savingsLine = useMemo(() => {
    if (!size || !quantity || quantity < 10) return null;
    const perUnit5 = SIZES[size].packs[5] / 5;
    const current = computePrice(size, quantity) / quantity;
    const savings = Math.round((perUnit5 - current) * quantity);
    if (savings <= 0) return null;
    return `You're saving ${formatCurrency(savings)} vs the 5-pack rate`;
  }, [size, quantity]);

  /* ----------------------------------------------------------
   * Render
   * ---------------------------------------------------------- */
  return (
    <>
      <Head>
        <title>Custom Vinyl Logo Cutting — Delivered Islandwide | Dosnine</title>
        <meta
          name="description"
          content="Send us your logo, we cut it into clean vinyl. From J$2,750 for 5 pieces. Knutsford Express islandwide delivery."
        />
      </Head>

      <div className="min-h-screen bg-slate-50">
        {/* ============================================================
            HERO — only on step 1
            ============================================================ */}
        {step === 1 && (
          <section className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-accent">
                  <Sparkles size={11} />
                  From J$2,750 · 5 pieces
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  <Clock size={11} />
                  2–3 day turnaround
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                Send us your logo.
                <br />
                We&apos;ll cut it into clean vinyl.
              </h1>

              <p className="mt-4 text-base leading-7 text-slate-600">
                Perfect for shirts, caps, bags, signs, and shopfronts. Send any
                image — we clean it up and cut it for you. Delivered islandwide
                via Knutsford Express.
              </p>

              {/* Trust row */}
              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-100 pt-6">
                <TrustItem icon={Zap} label="Fast turnaround" sub="2–3 days" />
                <TrustItem
                  icon={ShieldCheck}
                  label="Free cleanup"
                  sub="We fix your file"
                />
                <TrustItem
                  icon={Truck}
                  label="Islandwide"
                  sub="Knutsford Express"
                />
              </div>

              {/* Social proof */}
              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex -space-x-2">
                  {['A', 'S', 'M', 'K'].map((letter, i) => (
                    <span
                      key={i}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-[11px] font-bold text-white"
                    >
                      {letter}
                    </span>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={12} className="fill-amber-500" />
                    ))}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">
                    <strong className="text-slate-900">120+</strong> orders
                    delivered across Jamaica this year
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================
            FORM AREA
            ============================================================ */}
        <div ref={formTopRef} className="mx-auto max-w-md px-4 py-6">
          {/* Progress bar */}
          {step <= totalSteps && (
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Step {step} of {totalSteps}
                </span>
                <span className="text-xs text-slate-400">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* ============================================================
              STEP 1 — Quantity
              ============================================================ */}
          {step === 1 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900">
                How many logos do you need?
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Bulk discounts start at 10 pieces.
              </p>

              <div className="mt-5 space-y-3">
                {QUANTITIES.map(({ qty, badge, highlight }) => {
                  const perUnit = SIZES.small.packs[qty] / qty;
                  return (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => {
                        setQuantity(qty);
                        setStep(2);
                      }}
                      className={`relative flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition ${
                        highlight
                          ? 'border-accent bg-accent/5 hover:bg-accent/10'
                          : 'border-slate-200 bg-white hover:border-accent hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-slate-900">
                            {qty} logos
                          </span>
                          {badge && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                highlight
                                  ? 'bg-accent text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          From {formatCurrency(perUnit)} per piece
                        </p>
                      </div>
                      <ChevronLeft className="h-5 w-5 rotate-180 text-slate-400" />
                    </button>
                  );
                })}
              </div>

              {/* Custom quantity */}
              <div className="mt-6 border-t border-slate-100 pt-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Or enter a custom amount (min {MIN_QTY})
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    type="number"
                    min={MIN_QTY}
                    inputMode="numeric"
                    value={customQuantity}
                    onChange={(e) => setCustomQuantity(e.target.value)}
                    placeholder="e.g. 15"
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const qty = Number(customQuantity);
                      if (qty < MIN_QTY) {
                        setShowMinQtyNotice(true);
                        return;
                      }
                      setQuantity(qty);
                      setStep(2);
                    }}
                    disabled={!(Number(customQuantity) > 0)}
                    className="rounded-xl bg-accent px-6 font-bold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Go
                  </button>
                </div>
              </div>

              {savingsLine && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
                  <TrendingUp size={12} />
                  {savingsLine}
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              STEP 2 — Size
              ============================================================ */}
          {step === 2 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <BackButton onClick={() => setStep(1)} />
              <h2 className="text-xl font-bold text-slate-900">
                Choose your size
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {quantity} logos — pick one
              </p>

              <div className="mt-5 space-y-3">
                {Object.entries(SIZES).map(([key, data]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSize(key);
                      setStep(3);
                    }}
                    className="flex w-full items-center justify-between rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-accent hover:bg-slate-50"
                  >
                    <div>
                      <div className="text-lg font-bold text-slate-900">
                        {data.label} · {data.sub}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {data.bestFor}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-accent">
                        {formatCurrency(computePrice(key, quantity))}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatCurrency(
                          Math.round(computePrice(key, quantity) / quantity)
                        )}{' '}
                        / piece
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================
              STEP 3 — Upload + color
              ============================================================ */}
          {step === 3 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <BackButton onClick={() => setStep(2)} />
              <h2 className="text-xl font-bold text-slate-900">
                Upload your logo
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {quantity} × {SIZES[size].sub} ({SIZES[size].label}) —{' '}
                {formatCurrency(price)}
              </p>

              {/* Upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
                  logoPreview
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-accent/40 bg-accent/5 hover:border-accent'
                }`}
              >
                {logoPreview ? (
                  <>
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="max-h-32"
                    />
                    <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle size={14} />
                      Uploaded — tap to replace
                    </p>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="mb-3 text-accent" />
                    <p className="text-sm font-bold text-slate-900">
                      Tap to upload your logo
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      PNG, JPG, or phone photo up to 10MB
                    </p>
                    <p className="mt-3 rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent">
                      We clean it up for free
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleLogoUpload}
              />

              {/* Conversion samples */}
              {logoFile && (
                <>
                  <div className="mt-6">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <Sparkles size={15} className="text-accent" />
                      This is what we&apos;ll send back
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Real examples of logos we&apos;ve cleaned and cut
                    </p>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {CONVERSION_SAMPLES.map((logo, idx) => (
                        <div
                          key={idx}
                          className="overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5"
                        >
                          <img
                            src={logo}
                            alt={`Sample ${idx + 1}`}
                            className="h-auto w-full"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-slate-900">
                      Vinyl color
                    </label>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {['black', 'white'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`flex flex-col items-center gap-2 rounded-xl border-2 py-4 transition ${
                            color === c
                              ? 'border-accent bg-accent/5'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span
                            className="h-9 w-9 rounded-full"
                            style={{
                              backgroundColor: c === 'black' ? '#000' : '#fff',
                              border:
                                c === 'white' ? '2px solid #e5e7eb' : 'none',
                            }}
                          />
                          <span className="text-sm font-bold capitalize text-slate-900">
                            {c}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => setStep(4)}
                disabled={!logoFile || !color}
                className="mt-6 w-full rounded-xl bg-accent py-4 text-base font-bold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Continue
              </button>
            </div>
          )}

          {/* ============================================================
              STEP 4 — Details + place order
              ============================================================ */}
          {step === 4 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <BackButton onClick={() => setStep(3)} />
              <h2 className="text-xl font-bold text-slate-900">
                Your details
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                So we can prepare and deliver your order
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900">
                    Your name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full name"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900">
                    WhatsApp number
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatJamaicanPhone(e.target.value))}
                    placeholder="876-123-4567"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    We&apos;ll send order updates here.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900">
                    Knutsford Express pickup location
                  </label>
                  <select
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-900 outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="">Select a pickup location</option>
                    {KNUTSFORD_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Summary */}
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Order summary
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">
                      {quantity} × {SIZES[size].sub} ({SIZES[size].label})
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(price)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-600">
                      Logo conversion &amp; cleanup
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(CONVERSION_CHARGE)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 text-base">
                    <span className="font-bold text-slate-900">Total</span>
                    <span className="font-bold text-accent">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={submitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-4 text-base font-bold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Placing order…
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Place order
                  </>
                )}
              </button>

              <p className="mt-3 text-center text-xs text-slate-500">
                No payment taken here. You&apos;ll get bank details next.
              </p>
            </div>
          )}

          {/* ============================================================
              STEP 5 — Payment
              ============================================================ */}
          {step === 5 && orderPlaced && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle size={32} className="text-emerald-600" />
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-slate-900">
                    Order placed
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Now pay to lock in your slot
                  </p>
                  {orderId && (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-mono text-[11px] font-semibold text-slate-600">
                      Order #{String(orderId).slice(0, 8).toUpperCase()}
                    </p>
                  )}
                </div>

                {/* Bank details */}
                <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0 text-accent"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900">
                        Transfer to activate
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Send payment, then forward the receipt on WhatsApp. We
                        start cutting as soon as it clears.
                      </p>

                      <div className="mt-3 space-y-1 rounded-lg bg-white p-3">
                        {[
                          ['Bank', bankDetails[0].bank],
                          ['Account name', bankDetails[0].accountName],
                          ['Account number', bankDetails[0].accountNumber],
                          ['Account type', bankDetails[0].accountType],
                          ['Branch', bankDetails[0].branch],
                          ['Amount', formatCurrency(total)],
                        ].map(([label, value]) => {
                          const field = `logo-${label}`;
                          return (
                            <div
                              key={label}
                              className="flex items-center justify-between gap-2 py-1 text-sm"
                            >
                              <span className="text-slate-600">
                                {label}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900">
                                  {value}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyToClipboard(String(value), field)
                                  }
                                  className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-accent"
                                  aria-label={`Copy ${label}`}
                                >
                                  {copied === field ? (
                                    <Check size={14} />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-base font-bold text-white transition hover:bg-emerald-700"
                >
                  <MessageCircle size={18} />
                  Send Payment Proof on WhatsApp
                </a>

                <p className="mt-3 text-center text-xs text-slate-500">
                  Questions? Message us at {WHATSAPP_NUMBER}
                </p>
              </div>

              {/* Testimonials */}
              <div className="mt-6 space-y-3">
                <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  What other customers say
                </p>
                {TESTIMONIALS.slice(0, 2).map((t) => (
                  <TestimonialCard key={t.name} testimonial={t} />
                ))}
              </div>
            </>
          )}

          {/* ============================================================
              FAQ — shown on step 1 only
              ============================================================ */}
          {step === 1 && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-bold text-slate-900">
                Common questions
              </h2>
              <div className="mt-4 divide-y divide-slate-100">
                {FAQS.map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div key={idx} className="py-3 first:pt-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <span className="text-sm font-semibold text-slate-900">
                          {faq.q}
                        </span>
                        <span
                          className={`shrink-0 text-slate-400 transition-transform ${
                            isOpen ? 'rotate-45' : ''
                          }`}
                        >
                          <X size={14} className={isOpen ? '' : 'rotate-45'} />
                        </span>
                      </button>
                      {isOpen && (
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {faq.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================
            Sticky CTA (step 1 only)
            ============================================================ */}
        {showStickyCta && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
            <div className="mx-auto flex max-w-md items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  From
                </p>
                <p className="text-sm font-bold text-slate-900">
                  J$2,750 · 5 pieces
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  formTopRef.current?.scrollIntoView({ behavior: 'smooth' })
                }
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent/90"
              >
                Start order
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
            Min quantity modal
            ============================================================ */}
        {showMinQtyNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
              <h2 className="text-lg font-bold text-slate-900">
                Minimum order is {MIN_QTY}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                We&apos;ll set your quantity to {MIN_QTY} logos to continue.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCustomQuantity(String(MIN_QTY));
                  setQuantity(MIN_QTY);
                  setShowMinQtyNotice(false);
                  setStep(2);
                }}
                className="mt-6 w-full rounded-xl bg-accent py-3 font-bold text-white"
              >
                Continue with {MIN_QTY}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ============================================================
 * Sub-components
 * ============================================================ */

function TrustItem({ icon: Icon, label, sub }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon size={13} />
      </span>
      <p className="text-xs font-semibold text-slate-900">{label}</p>
      <p className="text-[10px] text-slate-500">{sub}</p>
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
    >
      <ChevronLeft size={16} /> Back
    </button>
  );
}

function TestimonialCard({ testimonial }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-1 text-amber-500">
        {Array.from({ length: testimonial.stars }).map((_, i) => (
          <Star key={i} size={11} className="fill-amber-500" />
        ))}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <p className="mt-2 text-xs font-semibold text-slate-900">
        {testimonial.name}
      </p>
      <p className="text-[11px] text-slate-500">{testimonial.business}</p>
    </div>
  );
}