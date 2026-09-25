import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import Head from 'next/head'
import Link from 'next/link'
import {
  Tag,
  MessageCircle,
  Phone,
  ShieldCheck,
  X,
  ChevronLeft,
  ChevronRight,
  Mail,
  Globe2,
  User,
  Building2,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [ad, setAd] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [message, setMessage] = useState('')
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [copied, setCopied] = useState('')
  const { isSignedIn, user } = useUser()
  const { getToken } = useAuth()

  const adImages =
    Array.isArray(ad?.image_urls) && ad.image_urls.length > 0
      ? ad.image_urls.slice(0, 3)
      : ad?.image_url
      ? [ad.image_url]
      : []

  // Build a wa.me link from a phone number string.
  // If the number is 10 digits (Jamaica local), prepend country code 1.
  const buildWhatsAppLink = (number) => {
    if (!number) return null
    const digits = String(number).replace(/\D/g, '')
    if (!digits) return null
    const withCountry = digits.length === 10 ? `1${digits}` : digits
    return `https://wa.me/${withCountry}?text=${encodeURIComponent(
      `Hello ${ad?.company_name || ''}, I found your business on Dosnine and I'd like a quote.`
    )}`
  }

  useEffect(() => {
    if (id) {
      loadAd()
      trackClick()
      setCurrentImageIndex(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    if (isFullscreen) {
      document.addEventListener('keydown', handleEscKey)
      return () => document.removeEventListener('keydown', handleEscKey)
    }
  }, [isFullscreen])

  useEffect(() => {
    if (!ad?.company_name || message) return
    setMessage(
      `Hello ${ad.company_name}, I am interested in your services and would like a quote. Please contact me with more details.`
    )
  }, [ad?.company_name, message])

  useEffect(() => {
    if (phone || !user?.primaryPhoneNumber?.phoneNumber) return
    setPhone(user.primaryPhoneNumber.phoneNumber)
  }, [phone, user?.primaryPhoneNumber?.phoneNumber])

  const loadAd = async () => {
    const { data } = await supabase
      .from('advertisements')
      .select(
        'id, title, category, company_name, description, image_url, image_urls, is_active, is_featured, impressions, clicks, contact_name, email, phone, website'
        // If you add columns later, extend the select — e.g.:
        // , whatsapp, location
      )
      .eq('id', id)
      .single()

    setAd(data)
    setLoading(false)
  }

  const trackClick = async () => {
    try {
      const { error } = await supabase.rpc('increment_ad_clicks', { ad_id: id })
      if (!error) {
        setAd((prev) =>
          prev ? { ...prev, clicks: (prev.clicks || 0) + 1 } : null
        )
      }
    } catch (err) {
      // silent
    }
  }

  const copyToClipboard = async (value, key) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(key)
      toast.success('Copied')
      setTimeout(() => setCopied(''), 1800)
    } catch {
      toast.error('Unable to copy.')
    }
  }

  const submitInquiry = async (event) => {
    event.preventDefault()
    if (!isSignedIn) {
      toast.error('Sign in with a verified Dosnine account to contact this advertiser.')
      router.push(`/sign-in?redirect_url=${encodeURIComponent(router.asPath)}`)
      return
    }

    setSending(true)
    try {
      const token = await getToken()
      const response = await fetch('/api/advertisements/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ advertisementId: ad.id, message, phone }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to send your enquiry.')
      }
      setMessage('')
      setPhone('')
      setSent(true)
      toast.success('Your enquiry was sent to the advertiser.')
    } catch (error) {
      toast.error(error.message || 'Unable to send your enquiry.')
    } finally {
      setSending(false)
    }
  }

  const scrollToForm = () => {
    if (typeof document === 'undefined') return
    document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!ad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Ad Not Found</h1>
          <Link href="/" className="text-accent font-semibold hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const whatsappLink = buildWhatsAppLink(ad.phone)
  const telLink = ad.phone ? `tel:${String(ad.phone).replace(/\s+/g, '')}` : null
  const mailLink = ad.email ? `mailto:${ad.email}` : null

  const hasContact = Boolean(
    ad.contact_name || ad.company_name || ad.phone || ad.email || ad.website
  )

  return (
    <>
      <Head>
        <title>{ad.company_name} — Dosnine Limited Partner</title>
        <meta name="description" content={ad.description} />
      </Head>

      <div className="min-h-screen bg-gray-50 pb-24 lg:pb-12">
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-accent to-red-600">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <h1 className="mt-4 text-3xl font-bold leading-tight text-black sm:text-4xl lg:text-5xl">
              {ad.title}
            </h1>
            <p className="mt-3 text-base text-black/85 sm:text-lg">
              by {ad.company_name}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
            {/* LEFT: content */}
            <div className="min-w-0 space-y-8">
              {/* Gallery */}
              {adImages.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div
                    className="group relative aspect-[16/9] w-full cursor-pointer bg-gray-100"
                    onClick={() => setIsFullscreen(true)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={adImages[currentImageIndex]}
                      alt={ad.company_name}
                      className="h-full w-full object-cover transition group-hover:opacity-95"
                    />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
                      <div className="rounded-lg bg-white/95 px-4 py-2 text-sm font-semibold text-gray-800 shadow">
                        Click to expand
                      </div>
                    </div>
                  </div>

                  {adImages.length > 1 && (
                    <div className="border-t border-gray-100 p-4">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        Gallery · {currentImageIndex + 1}/{adImages.length}
                      </p>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                        {adImages.map((imageUrl, index) => (
                          <button
                            key={`${imageUrl}-${index}`}
                            type="button"
                            onClick={() => setCurrentImageIndex(index)}
                            className={`overflow-hidden rounded-lg border-2 transition ${
                              currentImageIndex === index
                                ? 'border-accent ring-2 ring-accent/40'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imageUrl}
                              alt={`${ad.company_name} ${index + 1}`}
                              className="aspect-square w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* About */}
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                  About {ad.company_name}
                </h2>
                <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-gray-700">
                  {ad.description}
                </p>
              </section>

              {/* Service details */}
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <h3 className="text-lg font-bold text-gray-900">Service details</h3>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <Tag size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Category
                      </p>
                      <p className="mt-0.5 text-sm font-medium capitalize text-gray-900">
                        {ad.category?.replace('_', ' ') || 'Not provided'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <ShieldCheck size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Verified partner
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-gray-900">
                        Listed through Dosnine
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Contact details */}
              {hasContact && (
                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-gray-900">Contact the business</h3>
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-green-700">
                      Verified
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Reach {ad.company_name} directly — call, message, or email.
                  </p>

                  {/* Quick action row */}
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {telLink && (
                      <a
                        href={telLink}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:border-accent hover:bg-accent hover:text-white"
                      >
                        <Phone size={15} />
                        Call
                      </a>
                    )}
                    {whatsappLink && (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:border-green-600 hover:bg-green-600 hover:text-white"
                      >
                        <MessageCircle size={15} />
                        WhatsApp
                      </a>
                    )}
                    {mailLink && (
                      <a
                        href={mailLink}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:border-accent hover:bg-accent hover:text-white"
                      >
                        <Mail size={15} />
                        Email
                      </a>
                    )}
                  </div>

                  {/* Detail rows */}
                  <div className="mt-6 divide-y divide-gray-100">
                    {ad.contact_name && (
                      <ContactRow
                        icon={User}
                        label="Contact person"
                        value={ad.contact_name}
                        onCopy={() => copyToClipboard(ad.contact_name, 'contact_name')}
                        copied={copied === 'contact_name'}
                      />
                    )}
                    {ad.company_name && (
                      <ContactRow
                        icon={Building2}
                        label="Business name"
                        value={ad.company_name}
                        onCopy={() => copyToClipboard(ad.company_name, 'company_name')}
                        copied={copied === 'company_name'}
                      />
                    )}
                    {ad.phone && (
                      <ContactRow
                        icon={Phone}
                        label="Phone"
                        value={ad.phone}
                        href={telLink}
                        onCopy={() => copyToClipboard(ad.phone, 'phone')}
                        copied={copied === 'phone'}
                      />
                    )}
                    {ad.email && (
                      <ContactRow
                        icon={Mail}
                        label="Email"
                        value={ad.email}
                        href={mailLink}
                        onCopy={() => copyToClipboard(ad.email, 'email')}
                        copied={copied === 'email'}
                      />
                    )}
                    {ad.website && (
                      <ContactRow
                        icon={Globe2}
                        label="Website"
                        value={ad.website}
                        href={ad.website}
                        external
                        onCopy={() => copyToClipboard(ad.website, 'website')}
                        copied={copied === 'website'}
                      />
                    )}
                    {/* If you add columns later, uncomment:
                    {ad.whatsapp && (
                      <ContactRow
                        icon={MessageCircle}
                        label="WhatsApp"
                        value={ad.whatsapp}
                        href={buildWhatsAppLink(ad.whatsapp)}
                        external
                        onCopy={() => copyToClipboard(ad.whatsapp, 'whatsapp')}
                        copied={copied === 'whatsapp'}
                      />
                    )}
                    {ad.location && (
                      <ContactRow
                        icon={MapPin}
                        label="Location"
                        value={ad.location}
                        onCopy={() => copyToClipboard(ad.location, 'location')}
                        copied={copied === 'location'}
                      />
                    )}
                    */}
                  </div>
                </section>
              )}

              {/* Inline lead form (for users who scroll past the sidebar) */}
              <section
                id="lead-form"
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:hidden"
              >
                <LeadForm
                  ad={ad}
                  message={message}
                  setMessage={setMessage}
                  phone={phone}
                  setPhone={setPhone}
                  sending={sending}
                  sent={sent}
                  onSubmit={submitInquiry}
                  isSignedIn={isSignedIn}
                />
              </section>
            </div>

            {/* RIGHT: sticky sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-6 space-y-4">
             

                {/* Lead form */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <LeadForm
                    ad={ad}
                    message={message}
                    setMessage={setMessage}
                    phone={phone}
                    setPhone={setPhone}
                    sending={sending}
                    sent={sent}
                    onSubmit={submitInquiry}
                    isSignedIn={isSignedIn}
                  />
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Mobile sticky CTA */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-gray-500">
                Get a quote from
              </p>
              <p className="truncate text-sm font-bold text-gray-900">
                {ad.company_name}
              </p>
            </div>
            {telLink ? (
              <a
                href={telLink}
                className="inline-flex shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white p-2.5 text-gray-800 transition hover:border-accent hover:text-accent"
                aria-label="Call"
              >
                <Phone size={16} />
              </a>
            ) : null}
            {whatsappLink ? (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white p-2.5 text-gray-800 transition hover:border-green-600 hover:text-green-600"
                aria-label="WhatsApp"
              >
                <MessageCircle size={16} />
              </a>
            ) : null}
            <button
              onClick={scrollToForm}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              <MessageCircle size={16} />
              Get a quote
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen image viewer */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <div
            className="relative flex h-full w-full items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 text-black shadow-lg transition hover:bg-gray-200"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={adImages[currentImageIndex]}
              alt={ad.company_name}
              className="max-h-full max-w-full object-contain"
            />

            {adImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentImageIndex((prev) =>
                      prev === 0 ? adImages.length - 1 : prev - 1
                    )
                  }}
                  className="absolute left-4 rounded-full bg-white/80 p-3 text-black shadow-lg transition hover:bg-white"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentImageIndex((prev) =>
                      prev === adImages.length - 1 ? 0 : prev + 1
                    )
                  }}
                  className="absolute right-4 rounded-full bg-white/80 p-3 text-black shadow-lg transition hover:bg-white"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-black/70 px-4 py-2 text-sm font-semibold text-white">
                  {currentImageIndex + 1} / {adImages.length}
                </div>
              </>
            )}

            <div className="absolute bottom-4 right-4 text-xs text-white/60">
              Press ESC or click outside to close
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* -------------------- Contact row -------------------- */

function ContactRow({ icon: Icon, label, value, href, external, onCopy, copied }) {
  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium text-gray-900">{value}</p>
      </div>
      {external ? <ExternalLink size={14} className="shrink-0 text-gray-400" /> : null}
    </>
  )

  return (
    <div className="flex items-center gap-3 py-3">
      {href ? (
        <a
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className="flex min-w-0 flex-1 items-center gap-3 transition hover:text-accent"
        >
          {content}
        </a>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
      )}

      {onCopy ? (
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      ) : null}
    </div>
  )
}

/* -------------------- Lead form subcomponent -------------------- */

function LeadForm({
  ad,
  message,
  setMessage,
  phone,
  setPhone,
  sending,
  sent,
  onSubmit,
  isSignedIn,
}) {
  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
          <ShieldCheck size={22} />
        </div>
        <h3 className="mt-4 text-lg font-bold text-gray-900">Enquiry sent</h3>
        <p className="mt-1 text-sm text-gray-600">
          {ad.company_name} will get back to you shortly.
        </p>
      </div>
    )
  }

  return (
    <>
      <div>
        <h3 className="text-lg font-bold text-gray-900">
          Get a quote from {ad.company_name}
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Send your enquiry directly through Dosnine. Replies usually arrive
          within 24 hours.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          required
          minLength={10}
          placeholder="Tell the advertiser what service you need..."
          className="w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
          placeholder="Your phone number"
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="submit"
          disabled={sending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
        >
          <MessageCircle className="h-4 w-4" />
          {sending ? 'Sending...' : isSignedIn ? 'Send enquiry' : 'Sign in to send'}
        </button>
      </form>
    </>
  )
}