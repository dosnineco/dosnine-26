import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  Megaphone,
  Plus,
  X,
  Eye,
  MousePointerClick,
  Star,
  EyeOff,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react'

const compressImageToWebP = (file, maxWidth = 1600, quality = 0.82) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      const canvas = document.createElement('canvas')
      const ratio = image.width > maxWidth ? maxWidth / image.width : 1
      canvas.width = Math.round(image.width * ratio)
      canvas.height = Math.round(image.height * ratio)

      const context = canvas.getContext('2d')
      if (!context) {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Unable to process image.'))
        return
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl)
          if (!blob) {
            reject(new Error('Image compression failed.'))
            return
          }

          const compressedFile = new File(
            [blob],
            `${(file.name || 'ad-image').replace(/\.[^.]+$/, '')}.webp`,
            { type: 'image/webp' }
          )
          resolve(compressedFile)
        },
        'image/webp',
        quality
      )
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Invalid image file.'))
    }

    image.src = objectUrl
  })

const normalizeImageUrls = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .map((url) => String(url || '').trim())
    .filter(Boolean)
    .slice(0, 3)
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20'
const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5'

export default function AdminAdvertisements() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [ads, setAds] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [activeTab, setActiveTab] = useState('ads')
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [editingAd, setEditingAd] = useState(null)
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [submissionFilter, setSubmissionFilter] = useState('all')
  const [submissionActionId, setSubmissionActionId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const getSubmissionStatus = (status) => String(status || '').trim().toLowerCase()
  const isPendingStatus = (status) =>
    ['pending', 'pending_payment'].includes(getSubmissionStatus(status))
  const normalizeValue = (value) => String(value || '').trim().toLowerCase()
  const getDurationDays = (submission) => {
    const fromField = Number(submission?.duration_days)
    if (Number.isFinite(fromField) && fromField > 0) return fromField
    if (submission?.plan_id === '30-day') return 30
    return 7
  }

  const getExpiryIso = (submission) => {
    const expires = new Date()
    expires.setDate(expires.getDate() + getDurationDays(submission))
    return expires.toISOString()
  }

  const findExistingAdByCompanyEmail = async (companyName, email) => {
    const normalizedCompany = normalizeValue(companyName)
    const normalizedEmail = normalizeValue(email)

    const { data, error } = await supabase
      .from('advertisements')
      .select('id, company_name, email')
      .ilike('company_name', normalizedCompany)
      .ilike('email', normalizedEmail)
      .limit(1)

    if (error) throw error
    return data?.[0] || null
  }

  const statusCounts = {
    pending: submissions.filter((s) => isPendingStatus(s.status)).length,
    approved: submissions.filter((s) => getSubmissionStatus(s.status) === 'approved').length,
    rejected: submissions.filter((s) => getSubmissionStatus(s.status) === 'rejected').length,
    all: submissions.length,
  }

  const activeAdsCount = ads.filter((ad) => ad.is_active).length

  const updateSubmissionInState = (id, nextStatus) => {
    setSubmissions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: getSubmissionStatus(nextStatus) } : item
      )
    )
  }

  const [form, setForm] = useState({
    title: '',
    company_name: '',
    category: 'contractor',
    description: '',
    email: '',
    phone: '',
    website: '',
    image_url: '',
    image_urls: [],
    is_featured: false,
    is_active: true,
  })

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [imagePreviews])

  useEffect(() => {
    loadAds()
    loadSubmissions()
  }, [])

  const loadAds = async () => {
    const { data } = await supabase
      .from('advertisements')
      .select('*')
      .order('created_at', { ascending: false })

    setAds(data || [])
  }

  const loadSubmissions = async () => {
    const { data } = await supabase
      .from('sponsor_submissions')
      .select('*')
      .order('submitted_at', { ascending: false })

    setSubmissions(data || [])
  }

  const updateSubmissionStatusViaApi = async (id, status) => {
    const token = await getToken()
    const response = await fetch('/api/admin/advertisements', {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ id, status }),
    })

    const payload = await response.json()
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || 'Failed to update submission status')
    }
  }

  const handleCreate = async () => {
    if (!user?.id) return toast.error('Not authenticated')
    setLoading(true)

    try {
      let imageUrls = normalizeImageUrls(form.image_urls)

      if (imageFiles.length > 0) {
        setUploadingImage(true)
        for (const file of imageFiles) {
          const compressedImage = await compressImageToWebP(file)
          const filePath = `ads/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.webp`

          const { error: uploadError } = await supabase.storage
            .from('property-images')
            .upload(filePath, compressedImage, {
              cacheControl: '3600',
              upsert: true,
              contentType: 'image/webp',
            })

          if (uploadError) throw uploadError
          const publicData = supabase.storage.from('property-images').getPublicUrl(filePath)
          const publicUrl = publicData?.data?.publicUrl || publicData?.data?.publicURL || ''
          if (publicUrl) imageUrls.push(publicUrl)
        }
      }

      imageUrls = normalizeImageUrls(imageUrls)
      const imageUrl = imageUrls[0] || null

      const existingAd = await findExistingAdByCompanyEmail(form.company_name, form.email)
      if (existingAd) {
        toast.error('Duplicate ad blocked: company and email already exists.')
        return
      }

      const { error } = await supabase.from('advertisements').insert([
        {
          ...form,
          image_url: imageUrl,
          image_urls: imageUrls,
          created_by_clerk_id: user.id,
          created_at: new Date().toISOString(),
        },
      ])

      if (error) {
        if (error.code === '23505') {
          toast.error('Duplicate ad blocked by database rule.')
          return
        }
        throw error
      }

      toast.success('Advertisement created')
      resetForm()
      setShowForm(false)
      loadAds()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploadingImage(false)
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingAd) return
    setLoading(true)

    try {
      let imageUrls = normalizeImageUrls(form.image_urls)

      if (imageFiles.length > 0) {
        setUploadingImage(true)
        for (const file of imageFiles) {
          const compressedImage = await compressImageToWebP(file)
          const filePath = `ads/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.webp`
          const { error: uploadError } = await supabase.storage
            .from('property-images')
            .upload(filePath, compressedImage, {
              cacheControl: '3600',
              upsert: true,
              contentType: 'image/webp',
            })
          if (uploadError) throw uploadError

          const publicData = supabase.storage.from('property-images').getPublicUrl(filePath)
          const publicUrl = publicData?.data?.publicUrl || publicData?.data?.publicURL || ''
          if (publicUrl) imageUrls.push(publicUrl)
        }
      }

      imageUrls = normalizeImageUrls(imageUrls)
      const imageUrl = imageUrls[0] || null

      const { error } = await supabase
        .from('advertisements')
        .update({
          ...form,
          image_url: imageUrl,
          image_urls: imageUrls,
        })
        .eq('id', editingAd.id)

      if (error) throw error

      toast.success('Advertisement updated')
      setEditingAd(null)
      resetForm()
      setShowForm(false)
      loadAds()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploadingImage(false)
      setLoading(false)
    }
  }

  const toggleActive = async (ad) => {
    const currentStatus = Boolean(ad?.is_active)
    const updatePayload = currentStatus
      ? { is_active: false }
      : { is_active: true, expires_at: null }

    const { error } = await supabase
      .from('advertisements')
      .update(updatePayload)
      .eq('id', ad.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(!currentStatus ? 'Ad activated' : 'Ad deactivated')
      loadAds()
    }
  }

  const deleteAd = async (id) => {
    if (!confirm('Are you sure you want to delete this ad?')) return

    const { error } = await supabase.from('advertisements').delete().eq('id', id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Advertisement deleted')
      loadAds()
    }
  }

  const approveSubmission = async (submission) => {
    if (!user?.id) return toast.error('Not authenticated')
    if (submissionActionId === submission.id) return
    if (submission.status === 'approved') {
      toast('Submission is already approved')
      return
    }

    setSubmissionActionId(submission.id)
    setLoading(true)

    try {
      const existingAdInState = ads.find(
        (ad) =>
          normalizeValue(ad.company_name) === normalizeValue(submission.company_name) &&
          normalizeValue(ad.email) === normalizeValue(submission.email)
      )

      const existingAdInDb = await findExistingAdByCompanyEmail(
        submission.company_name,
        submission.email
      )
      const existingAd = existingAdInState || existingAdInDb

      if (existingAd) {
        const submissionImageUrls = normalizeImageUrls(submission?.image_urls)
        const submissionPrimaryImage =
          submissionImageUrls[0] || submission?.image_url || null

        const { error: activationError } = await supabase
          .from('advertisements')
          .update({
            is_active: true,
            expires_at: getExpiryIso(submission),
            is_featured: Boolean(submission?.is_featured),
            ...(submissionPrimaryImage ? { image_url: submissionPrimaryImage } : {}),
            ...(submissionImageUrls.length > 0 ? { image_urls: submissionImageUrls } : {}),
          })
          .eq('id', existingAd.id)

        if (activationError) throw activationError

        await updateSubmissionStatusViaApi(submission.id, 'approved')

        updateSubmissionInState(submission.id, 'approved')
        toast.success('Submission approved. Existing ad activated automatically.')
        loadAds()
        loadSubmissions()
        return
      }

      const { error: adError } = await supabase.from('advertisements').insert([
        {
          title: submission.title || submission.company_name,
          company_name: submission.company_name,
          category: submission.category,
          description: submission.description,
          email: submission.email,
          phone: submission.phone,
          website: submission.website,
          image_url:
            normalizeImageUrls(submission?.image_urls)[0] || submission.image_url || null,
          image_urls: normalizeImageUrls(submission?.image_urls),
          is_featured: submission.is_featured,
          is_active: true,
          expires_at: getExpiryIso(submission),
          created_by_clerk_id: submission.created_by_clerk_id || user.id,
          created_at: new Date().toISOString(),
        },
      ])

      if (adError) {
        if (adError.code === '23505') {
          await updateSubmissionStatusViaApi(submission.id, 'approved')

          updateSubmissionInState(submission.id, 'approved')
          toast.success('Submission approved. Duplicate ad was blocked.')
          loadSubmissions()
          return
        }
        throw adError
      }

      await updateSubmissionStatusViaApi(submission.id, 'approved')

      updateSubmissionInState(submission.id, 'approved')
      toast.success('Submission approved and ad created!')
      loadAds()
      loadSubmissions()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
      setSubmissionActionId(null)
    }
  }

  const rejectSubmission = async (id) => {
    if (submissionActionId === id) return
    if (!confirm('Are you sure you want to reject this submission?')) return

    setSubmissionActionId(id)

    try {
      await updateSubmissionStatusViaApi(id, 'rejected')
      updateSubmissionInState(id, 'rejected')
      toast.success('Submission rejected')
      loadSubmissions()
    } catch (error) {
      toast.error(error.message)
    }

    setSubmissionActionId(null)
  }

  const reverseApproval = async (submissionId, companyName) => {
    if (submissionActionId === submissionId) return
    if (
      !confirm(
        `Reverse approval for ${companyName}? This will NOT delete the created ad.`
      )
    )
      return

    setSubmissionActionId(submissionId)
    setLoading(true)
    try {
      await updateSubmissionStatusViaApi(submissionId, 'pending_payment')

      updateSubmissionInState(submissionId, 'pending_payment')
      toast.success('Submission reverted to pending payment')
      loadSubmissions()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
      setSubmissionActionId(null)
    }
  }

  const filteredSubmissions = submissions.filter((submission) => {
    if (submissionFilter === 'pending') return isPendingStatus(submission.status)
    if (submissionFilter === 'approved')
      return getSubmissionStatus(submission.status) === 'approved'
    if (submissionFilter === 'rejected')
      return getSubmissionStatus(submission.status) === 'rejected'
    return true
  })

  const getStatusPill = (status) => {
    if (isPendingStatus(status)) {
      return {
        text: 'Pending',
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
        strip: 'bg-amber-400',
        icon: Clock,
      }
    }
    if (getSubmissionStatus(status) === 'approved') {
      return {
        text: 'Approved',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        strip: 'bg-emerald-500',
        icon: CheckCircle2,
      }
    }
    return {
      text: 'Rejected',
      badge: 'bg-red-100 text-red-800 border-red-200',
      strip: 'bg-red-500',
      icon: XCircle,
    }
  }



  const resetForm = () => {
    setImageFiles([])
    imagePreviews.forEach((url) => URL.revokeObjectURL(url))
    setImagePreviews([])
    setForm({
      title: '',
      company_name: '',
      category: 'contractor',
      description: '',
      email: '',
      phone: '',
      website: '',
      image_url: '',
      image_urls: [],
      is_featured: false,
      is_active: true,
    })
    setEditingAd(null)
  }

  const closeForm = () => {
    resetForm()
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Advertisements
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Ads & Sponsor Submissions
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage live advertisements and review pending sponsor submissions.
          </p>
        </div>
        <button
          type="button"
                   onClick={() => {
            // Always jump to the Ads tab so the form is visible
            if (activeTab !== 'ads') setActiveTab('ads')
            if (showForm && editingAd) resetForm()
            setShowForm((v) => !v)
          }}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90"
        >
          {showForm ? (
            <>
              <X size={16} />
              Close form
            </>
          ) : (
            <>
              <Plus size={16} />
              New advertisement
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="inline-flex w-full rounded-full bg-slate-100 p-1 sm:w-auto">
        <button
          type="button"
          onClick={() => setActiveTab('ads')}
          className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition sm:flex-none sm:px-5 ${
            activeTab === 'ads'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Ads
          <span
            className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              activeTab === 'ads'
                ? 'bg-accent/10 text-accent'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {activeAdsCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('submissions')
            setSubmissionFilter('pending')
          }}
          className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition sm:flex-none sm:px-5 ${
            activeTab === 'submissions'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Submissions
          {statusCounts.pending > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-amber-900">
              {statusCounts.pending}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'ads' && (
        <>
          {/* Create / Edit form — collapsible */}
          {showForm && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingAd ? 'Edit advertisement' : 'Create advertisement'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {editingAd
                      ? 'Update the ad details below.'
                      : 'Fill in the business details to publish a new advertisement.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Close form"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Advertisement title *</label>
                  <input
                    placeholder="e.g. Reliable plumbing services in Kingston"
                    className={inputClass}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>Company name *</label>
                  <input
                    placeholder="Business name"
                    className={inputClass}
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    className={inputClass}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="contractor">Contractor</option>
                    <option value="legal">Legal</option>
                    <option value="home_inspection">Home Inspection</option>
                    <option value="architect">Architect</option>
                    <option value="mortgage">Mortgage</option>
                    <option value="insurance">Insurance</option>
                    <option value="valuation">Valuation</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Description *</label>
                  <textarea
                    placeholder="What does this business offer?"
                    className={inputClass}
                    rows="3"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>Email *</label>
                  <input
                    placeholder="contact@business.com"
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>Phone *</label>
                  <input
                    placeholder="876-123-4567"
                    type="tel"
                    className={inputClass}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Website (optional)</label>
                  <input
                    placeholder="https://business.com"
                    type="url"
                    className={inputClass}
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                  />
                </div>
              </div>

              {/* Image URLs */}
              <div className="mt-6">
                <p className={labelClass}>Image URLs (optional, up to 3)</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[0, 1, 2].map((index) => (
                    <input
                      key={`ad-image-url-${index}`}
                      placeholder={`Image URL ${index + 1}`}
                      type="url"
                      className={inputClass}
                      value={form.image_urls?.[index] || ''}
                      onChange={(e) => {
                        const nextUrls = [...(form.image_urls || [])]
                        nextUrls[index] = e.target.value
                        const cleanedUrls = normalizeImageUrls(nextUrls)
                        setForm({
                          ...form,
                          image_urls: cleanedUrls,
                          image_url: cleanedUrls[0] || '',
                        })
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* File uploads */}
              <div className="mt-6">
                <p className={labelClass}>Upload images (optional, up to 3)</p>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-accent hover:bg-accent/5">
                  <ImageIcon className="h-7 w-7 text-accent" />
                  <span className="mt-2 text-sm font-semibold text-slate-900">
                    Click to upload
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    PNG, JPG or WebP · max 8MB each · compressed to WebP
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const existingCount = normalizeImageUrls(form.image_urls).length
                      const availableSlots = Math.max(0, 3 - existingCount)
                      const selectedFiles = Array.from(e.target.files || []).slice(
                        0,
                        availableSlots
                      )
                      if (selectedFiles.length === 0) {
                        toast.error(
                          'Maximum of 3 images reached. Remove one URL to add another file.'
                        )
                        return
                      }

                      const oversized = selectedFiles.find((file) => file.size > 8 * 1024 * 1024)
                      if (oversized) {
                        toast.error('Each image must be 8MB or less.')
                        return
                      }

                      imagePreviews.forEach((url) => URL.revokeObjectURL(url))
                      setImageFiles(selectedFiles)
                      setImagePreviews(selectedFiles.map((file) => URL.createObjectURL(file)))

                      if ((e.target.files || []).length > availableSlots) {
                        toast(
                          `Only ${availableSlots} image${
                            availableSlots === 1 ? '' : 's'
                          } selected due to 3-image limit.`
                        )
                      }
                    }}
                  />
                </label>

                {(normalizeImageUrls(form.image_urls).length > 0 ||
                  imagePreviews.length > 0) && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {normalizeImageUrls(form.image_urls).map((url, idx) => (
                      <img
                        key={`existing-${url}-${idx}`}
                        src={url}
                        alt={`Ad image ${idx + 1}`}
                        className="h-24 w-full rounded-lg border border-slate-200 object-cover"
                      />
                    ))}
                    {imagePreviews.map((preview, idx) => (
                      <img
                        key={`new-${preview}-${idx}`}
                        src={preview}
                        alt={`New ad image ${idx + 1}`}
                        className="h-24 w-full rounded-lg border border-slate-200 object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-8">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                  />
                  <span className="text-sm font-medium text-slate-800">
                    Featured ad (gold badge)
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                  />
                  <span className="text-sm font-medium text-slate-800">Active</span>
                </label>
              </div>

              {/* Form actions */}
              <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                {editingAd ? (
                  <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60"
                  >
                    {loading || uploadingImage ? 'Updating…' : 'Update advertisement'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60"
                  >
                    {loading || uploadingImage ? 'Creating…' : 'Create advertisement'}
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Ads list */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                All advertisements ({ads.length})
              </h2>
            </div>

            {ads.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
                <Megaphone className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">No ads yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Create your first advertisement to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {ads.map((ad) => {
                  const primaryImage =
                    normalizeImageUrls(ad.image_urls)[0] || ad.image_url || null
                  return (
                    <article
                      key={ad.id}
                      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
                        ad.is_active
                          ? 'border-slate-200'
                          : 'border-slate-200 bg-slate-50/60 opacity-90'
                      }`}
                    >
                      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                        {/* Thumbnail */}
                        <div className="h-32 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-24 sm:w-32">
                          {primaryImage ? (
                            <img
                              src={primaryImage}
                              alt={ad.company_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <ImageIcon size={22} />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">
                              {ad.company_name}
                            </h3>
                            {ad.is_featured && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                <Star size={10} className="fill-amber-600 text-amber-600" />
                                Featured
                              </span>
                            )}
                            {!ad.is_active && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                                <EyeOff size={10} />
                                Inactive
                              </span>
                            )}
                          </div>

                          {ad.title && (
                            <p className="mt-0.5 truncate text-sm font-medium text-slate-700">
                              {ad.title}
                            </p>
                          )}

                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span className="capitalize">{ad.category}</span>
                            <span>{ad.phone}</span>
                          </p>

                          {/* Stats */}
                          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                              <Eye size={13} className="text-slate-400" />
                              {ad.impressions || 0} views
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                              <MousePointerClick size={13} className="text-slate-400" />
                              {ad.clicks || 0} clicks
                            </span>
                          </div>

                          {ad.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                              {ad.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
                        <Link
                          href={`/ads/${ad.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <ExternalLink size={13} />
                          View
                        </Link>
                        <button
                          onClick={() => toggleActive(ad)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold shadow-sm transition ${
                            ad.is_active
                              ? 'bg-white text-amber-700 hover:bg-amber-50'
                              : 'bg-white text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {ad.is_active ? (
                            <>
                              <EyeOff size={13} />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Eye size={13} />
                              Activate
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => startEdit(ad)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteAd(ad.id)}
                          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'submissions' && (
        <section>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              { key: 'pending', label: 'Pending', count: statusCounts.pending, tone: 'amber' },
              {
                key: 'approved',
                label: 'Approved',
                count: statusCounts.approved,
                tone: 'emerald',
              },
              { key: 'rejected', label: 'Rejected', count: statusCounts.rejected, tone: 'red' },
              { key: 'all', label: 'All', count: statusCounts.all, tone: 'slate' },
            ].map(({ key, label, count, tone }) => {
              const selected = submissionFilter === key
              const toneClasses = {
                amber: selected
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-amber-700 border-amber-200 hover:border-amber-300',
                emerald: selected
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-emerald-700 border-emerald-200 hover:border-emerald-300',
                red: selected
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-white text-red-700 border-red-200 hover:border-red-300',
                slate: selected
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300',
              }[tone]

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSubmissionFilter(key)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${toneClasses}`}
                >
                  {label}
                  <span
                    className={`rounded-full px-1.5 text-[10px] font-bold ${
                      selected ? 'bg-white/25' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <p className="mb-4 text-sm text-slate-500">
            Showing {filteredSubmissions.length} submission
            {filteredSubmissions.length === 1 ? '' : 's'}
          </p>

          {filteredSubmissions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                No submissions in this view
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try switching the filter above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((sub) => {
                const matchingAd = ads.find(
                  (ad) => ad.company_name === sub.company_name && ad.email === sub.email
                )
                const statusUi = getStatusPill(sub.status)
                const StatusIcon = statusUi.icon

                return (
                  <article
                    key={sub.id}
                    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    {/* Status strip */}
                    <div className={`absolute inset-y-0 left-0 w-1 ${statusUi.strip}`} />

                    <div className="pl-5 pr-4 pt-4 pb-4 sm:pl-6 sm:pr-5 sm:pt-5 sm:pb-5">
                      {/* Header */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-slate-900">
                            {sub.company_name}
                          </h3>
                          <p className="mt-0.5 text-sm text-slate-600">
                            <span className="capitalize">{sub.category}</span>
                            <span className="mx-1.5 text-slate-300">·</span>
                            <span className="font-semibold text-slate-900">
                              J${sub.is_featured ? '14,970' : '8,970'}
                            </span>
                            {sub.is_featured && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                Featured
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusUi.badge}`}
                          >
                            <StatusIcon size={11} />
                            {statusUi.text}
                          </span>
                        </div>
                      </div>

                      {/* Linked ad indicator */}
                      {getSubmissionStatus(sub.status) === 'approved' && matchingAd && (
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          <CheckCircle2 size={12} />
                          Ad created · ID {matchingAd.id.slice(0, 8)}
                        </div>
                      )}

                      {/* Details */}
                      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                        <div className="flex items-start gap-2">
                          <dt className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Phone
                          </dt>
                          <dd className="min-w-0 truncate text-slate-800">{sub.phone}</dd>
                        </div>
                        <div className="flex items-start gap-2">
                          <dt className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Email
                          </dt>
                          <dd className="min-w-0 truncate text-slate-800">{sub.email}</dd>
                        </div>
                        {sub.website && (
                          <div className="flex items-start gap-2 sm:col-span-2">
                            <dt className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Website
                            </dt>
                            <dd className="min-w-0 truncate text-slate-800">
                              <a
                                href={sub.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-accent hover:underline"
                              >
                                {sub.website}
                              </a>
                            </dd>
                          </div>
                        )}
                      </dl>

                      {sub.description && (
                        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                          {sub.description}
                        </p>
                      )}

                      <p className="mt-3 text-xs text-slate-400">
                        Submitted {new Date(sub.submitted_at).toLocaleString()}
                      </p>

                      {/* Actions */}
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        {isPendingStatus(sub.status) && (
                          <>
                            <button
                              onClick={() => approveSubmission(sub)}
                              disabled={loading || submissionActionId === sub.id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                              <CheckCircle2 size={14} />
                              {submissionActionId === sub.id
                                ? 'Approving…'
                                : 'Approve & activate'}
                            </button>
                            <button
                              onClick={() => rejectSubmission(sub.id)}
                              disabled={loading || submissionActionId === sub.id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                            >
                              <XCircle size={14} />
                              Reject
                            </button>
                          </>
                        )}

                        {getSubmissionStatus(sub.status) === 'approved' && (
                          <>
                            {matchingAd ? (
                              <>
                                <button
                                  onClick={() => startEdit(matchingAd)}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                                >
                                  <Pencil size={14} />
                                  Edit ad
                                </button>
                                <button
                                  onClick={() => toggleActive(matchingAd)}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                                >
                                  {matchingAd.is_active ? (
                                    <>
                                      <EyeOff size={14} />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <Eye size={14} />
                                      Activate
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => deleteAd(matchingAd.id)}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                                >
                                  <Trash2 size={14} />
                                  Delete ad
                                </button>
                              </>
                            ) : (
                              <p className="self-center text-sm text-amber-700">
                                Ad not found — may have been created manually.
                              </p>
                            )}

                            <button
                              onClick={() => reverseApproval(sub.id, sub.company_name)}
                              disabled={loading || submissionActionId === sub.id}
                              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                            >
                              Revert to pending
                            </button>
                          </>
                        )}

                        {getSubmissionStatus(sub.status) === 'rejected' && (
                          <>
                            <button
                              onClick={() => {
                                if (submissionActionId === sub.id) return
                                const newStatus = 'pending_payment'
                                setSubmissionActionId(sub.id)
                                updateSubmissionStatusViaApi(sub.id, newStatus)
                                  .then(() => {
                                    updateSubmissionInState(sub.id, newStatus)
                                    toast.success('Submission restored to pending')
                                    loadSubmissions()
                                    setSubmissionActionId(null)
                                  })
                                  .catch((err) => {
                                    toast.error(err.message)
                                    setSubmissionActionId(null)
                                  })
                              }}
                              disabled={loading || submissionActionId === sub.id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                            >
                              Restore to pending
                            </button>
                            <p className="self-center text-sm text-slate-500">
                              Rejected submissions can be restored if needed.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}