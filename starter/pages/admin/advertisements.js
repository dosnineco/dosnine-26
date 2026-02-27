import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import AdminLayout from '../../components/AdminLayout';

export default function AdminAdvertisements() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [ads, setAds] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [activeTab, setActiveTab] = useState('ads') // 'ads' or 'submissions'
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [editingAd, setEditingAd] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [submissionFilter, setSubmissionFilter] = useState('all')
  const [submissionActionId, setSubmissionActionId] = useState(null)

  const getSubmissionStatus = (status) => String(status || '').trim().toLowerCase()
  const isPendingStatus = (status) => ['pending', 'pending_payment'].includes(getSubmissionStatus(status))
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
    pending: submissions.filter(s => isPendingStatus(s.status)).length,
    approved: submissions.filter(s => getSubmissionStatus(s.status) === 'approved').length,
    rejected: submissions.filter(s => getSubmissionStatus(s.status) === 'rejected').length,
    all: submissions.length
  }

  const activeAdsCount = ads.filter(ad => ad.is_active).length

  const updateSubmissionInState = (id, nextStatus) => {
    setSubmissions(prev => prev.map(item => (
      item.id === id ? { ...item, status: getSubmissionStatus(nextStatus) } : item
    )))
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
    is_featured: false,
    is_active: true
  })

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
      let imageUrl = form.image_url
      if (imageFile) {
        setUploadingImage(true)
        const fileExt = (imageFile.name || 'jpg').split('.').pop()
        const filePath = `ads/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: imageFile.type,
          })

        if (uploadError) throw uploadError
        const publicData = supabase.storage.from('property-images').getPublicUrl(filePath)
        imageUrl = publicData?.data?.publicUrl || publicData?.data?.publicURL || form.image_url
      }

      const existingAd = await findExistingAdByCompanyEmail(form.company_name, form.email)
      if (existingAd) {
        toast.error('Duplicate ad blocked: company and email already exists.')
        return
      }

      const { error } = await supabase
        .from('advertisements')
        .insert([{
          ...form,
          image_url: imageUrl || null,
          created_by_clerk_id: user.id,
          created_at: new Date().toISOString()
        }])

      if (error) {
        if (error.code === '23505') {
          toast.error('Duplicate ad blocked by database rule.')
          return
        }
        throw error
      }

      toast.success('Advertisement created')
      resetForm()
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
      let imageUrl = form.image_url
      if (imageFile) {
        setUploadingImage(true)
        const fileExt = (imageFile.name || 'jpg').split('.').pop()
        const filePath = `ads/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: imageFile.type,
          })
        if (uploadError) throw uploadError

        const publicData = supabase.storage.from('property-images').getPublicUrl(filePath)
        imageUrl = publicData?.data?.publicUrl || publicData?.data?.publicURL || form.image_url
      }

      const { error } = await supabase
        .from('advertisements')
        .update({
          ...form,
          image_url: imageUrl || null,
        })
        .eq('id', editingAd.id)

      if (error) throw error

      toast.success('Advertisement updated')
      setEditingAd(null)
      resetForm()
      loadAds()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploadingImage(false)
      setLoading(false)
    }
  }

  const toggleActive = async (id, currentStatus) => {
    const { error } = await supabase
      .from('advertisements')
      .update({ is_active: !currentStatus })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(!currentStatus ? 'Ad activated' : 'Ad deactivated')
      loadAds()
    }
  }

  const deleteAd = async (id) => {
    if (!confirm('Are you sure you want to delete this ad?')) return

    const { error } = await supabase
      .from('advertisements')
      .delete()
      .eq('id', id)

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
        ad => normalizeValue(ad.company_name) === normalizeValue(submission.company_name)
          && normalizeValue(ad.email) === normalizeValue(submission.email)
      )

      const existingAdInDb = await findExistingAdByCompanyEmail(submission.company_name, submission.email)
      const existingAd = existingAdInState || existingAdInDb

      if (existingAd) {
        const { error: activationError } = await supabase
          .from('advertisements')
          .update({
            is_active: true,
            expires_at: getExpiryIso(submission),
            is_featured: Boolean(submission?.is_featured),
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

      // Create advertisement from submission
      const { error: adError } = await supabase
        .from('advertisements')
        .insert([{
          title: submission.title || submission.company_name,
          company_name: submission.company_name,
          category: submission.category,
          description: submission.description,
          email: submission.email,
          phone: submission.phone,
          website: submission.website,
          image_url: submission.image_url,
          is_featured: submission.is_featured,
          is_active: true,
          expires_at: getExpiryIso(submission),
          created_by_clerk_id: submission.created_by_clerk_id || user.id,
          created_at: new Date().toISOString(),
        }])

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

      // Update submission status
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
    if (!confirm(`Reverse approval for ${companyName}? This will NOT delete the created ad.`)) return
    
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
    if (submissionFilter === 'approved') return getSubmissionStatus(submission.status) === 'approved'
    if (submissionFilter === 'rejected') return getSubmissionStatus(submission.status) === 'rejected'
    return true
  })

  const getStatusPill = (status) => {
    if (isPendingStatus(status)) {
      return {
        text: 'PENDING',
        badge: 'bg-yellow-400 text-yellow-900',
        card: 'bg-yellow-50 border-yellow-300'
      }
    }

    if (getSubmissionStatus(status) === 'approved') {
      return {
        text: 'APPROVED',
        badge: 'bg-green-400 text-green-900',
        card: 'bg-green-50 border-green-300'
      }
    }

    return {
      text: 'REJECTED',
      badge: 'bg-red-400 text-red-900',
      card: 'bg-red-50 border-red-300'
    }
  }

  const startEdit = (ad) => {
    setEditingAd(ad)
    setImageFile(null)
    setImagePreview(ad.image_url || '')
    setForm({
      title: ad.title || '',
      company_name: ad.company_name,
      category: ad.category,
      description: ad.description,
      email: ad.email,
      phone: ad.phone,
      website: ad.website || '',
      image_url: ad.image_url || '',
      is_featured: ad.is_featured,
      is_active: ad.is_active
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setImageFile(null)
    setImagePreview('')
    setForm({
      title: '',
      company_name: '',
      category: 'contractor',
      description: '',
      email: '',
      phone: '',
      website: '',
      image_url: '',
      is_featured: false,
      is_active: true
    })
    setEditingAd(null)
  }

  return (
    <>
      <AdminLayout />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
      <div className="bg-gray-200 rounded-xl p-4 sm:p-6">

      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Advertisements</h1>
        <p className="text-sm text-gray-600">Manage active ads and sponsor submissions.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('ads')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'ads'
              ? 'bg-gray-50 text-gray-900'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Active Ads ({activeAdsCount})
        </button>
        <button
          onClick={() => {
            setActiveTab('submissions')
            setSubmissionFilter('pending')
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'submissions'
              ? 'bg-gray-50 text-gray-900'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Pending Submissions ({statusCounts.pending})
        </button>
      </div>

      {activeTab === 'ads' && (
        <>
          {/* Create/Edit Form */}
          <div className="bg-gray-100 p-6 rounded-xl mb-6">
            <h2 className="text-xl font-bold mb-4">
              {editingAd ? 'Edit Advertisement' : 'Create New Advertisement'}
            </h2>

            <div className="mb-4">
              <input
                placeholder="Advertisement Title *"
                className="w-full bg-gray-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input
                placeholder="Company name *"
                className="w-full bg-gray-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                value={form.company_name}
                onChange={e => setForm({ ...form, company_name: e.target.value })}
              />

              <select
                className="w-full bg-gray-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
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

            <textarea
              placeholder="Description *"
              className="w-full bg-gray-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 mb-4"
              rows="3"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input
                placeholder="Email *"
                type="email"
                className="w-full bg-gray-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />

              <input
                placeholder="Phone *"
                type="tel"
                className="w-full bg-gray-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input
                placeholder="Website (optional)"
                type="url"
                className="w-full bg-gray-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                value={form.website}
                onChange={e => setForm({ ...form, website: e.target.value })}
              />

              <input
                placeholder="Image URL (optional)"
                type="url"
                className="w-full bg-gray-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                value={form.image_url}
                onChange={e => setForm({ ...form, image_url: e.target.value })}
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-2">Upload Ad Image (optional)</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="w-full bg-white p-3 rounded-lg"
                onChange={e => {
                  const file = e.target.files?.[0] || null
                  if (!file) return
                  if (file.size > 8 * 1024 * 1024) {
                    toast.error('Image must be 8MB or less.')
                    return
                  }
                  setImageFile(file)
                  setImagePreview(URL.createObjectURL(file))
                }}
              />
              {(imagePreview || form.image_url) && (
                <div className="mt-3">
                  <img
                    src={imagePreview || form.image_url}
                    alt="Ad preview"
                    className="h-24 w-auto rounded-lg object-cover"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-6 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={e => setForm({ ...form, is_featured: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="font-medium">Featured Ad (Gold Badge)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="font-medium">Active</span>
              </label>
            </div>

            <div className="flex gap-3">
              {editingAd ? (
                <>
                  <button
                    onClick={handleUpdate}
                    disabled={loading}
                    className="btn-primary disabled:opacity-50"
                  >
                    {loading || uploadingImage ? 'Updating...' : 'Update Advertisement'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="btn-primary disabled:opacity-50"
                >
                  {loading || uploadingImage ? 'Creating...' : 'Create Advertisement'}
                </button>
              )}
            </div>
          </div>

          {/* Active Ads List */}
          <div className="bg-gray-100 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">All Advertisements</h2>
            <div className="space-y-3">
              {ads.map(ad => (
                <div
                  key={ad.id}
                  className={`p-4 rounded-lg ${
                    ad.is_active ? 'bg-gray-50' : 'bg-gray-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-bold text-lg">{ad.company_name}</p>
                      {ad.is_featured && (
                        <span className="bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-bold">
                          ⭐ FEATURED
                        </span>
                      )}
                      {!ad.is_active && (
                        <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded-full font-bold">
                          INACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {ad.category} • {ad.phone} • 
                      <span className="ml-2 text-blue-600 font-medium">
                        👁️ {ad.impressions || 0} views
                      </span>
                      <span className="ml-2 text-green-600 font-medium">
                        🔗 {ad.clicks || 0} clicks
                      </span>
                    </p>
                    <p className="text-sm text-gray-700 line-clamp-2">{ad.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:ml-4">
                    <button
                      onClick={() => toggleActive(ad.id, ad.is_active)}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                        ad.is_active
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {ad.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => startEdit(ad)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold text-sm hover:bg-blue-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteAd(ad.id)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold text-sm hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'submissions' && (
        <div className="bg-gray-100 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Sponsor Submissions</h2>
          
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSubmissionFilter('pending')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm ${submissionFilter === 'pending' ? 'bg-yellow-200 text-yellow-900' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
            >
              Pending ({statusCounts.pending})
            </button>
            <button
              onClick={() => setSubmissionFilter('approved')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm ${submissionFilter === 'approved' ? 'bg-green-200 text-green-900' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
            >
              Approved ({statusCounts.approved})
            </button>
            <button
              onClick={() => setSubmissionFilter('rejected')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm ${submissionFilter === 'rejected' ? 'bg-red-200 text-red-900' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
            >
              Rejected ({statusCounts.rejected})
            </button>
            <button
              onClick={() => setSubmissionFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm ${submissionFilter === 'all' ? 'bg-gray-200 text-gray-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              All ({statusCounts.all})
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Showing {filteredSubmissions.length} submission{filteredSubmissions.length === 1 ? '' : 's'}
          </p>

          <div className="space-y-4">
            {filteredSubmissions.map(sub => {
              const matchingAd = ads.find(
                ad => ad.company_name === sub.company_name && ad.email === sub.email
              )
              const statusUi = getStatusPill(sub.status)

              return (
                <div
                  key={sub.id}
                  className={`p-5 rounded-lg ${statusUi.card}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{sub.company_name}</h3>
                      <p className="text-sm text-gray-600">
                        {sub.category} • J${sub.is_featured ? '14,970' : '8,970'} {sub.is_featured && '(Featured)'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getSubmissionStatus(sub.status) === 'approved' && matchingAd && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded font-bold">
                          ✓ Ad Created (ID: {matchingAd.id.slice(0, 8)})
                        </span>
                      )}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${statusUi.badge}`}
                      >
                        {statusUi.text}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3 space-y-1 text-sm">
                    <p><strong>Phone:</strong> {sub.phone}</p>
                    <p><strong>Email:</strong> {sub.email}</p>
                    {sub.website && <p><strong>Website:</strong> {sub.website}</p>}
                    <p className="mt-2"><strong>Description:</strong> {sub.description}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Submitted: {new Date(sub.submitted_at).toLocaleString()}
                    </p>
                  </div>

                  {isPendingStatus(sub.status) && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => approveSubmission(sub)}
                        disabled={loading || submissionActionId === sub.id}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
                      >
                        ✓ Approve & Activate
                      </button>
                      <button
                        onClick={() => rejectSubmission(sub.id)}
                        disabled={loading || submissionActionId === sub.id}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}

                  {getSubmissionStatus(sub.status) === 'approved' && (
                    <div className="flex gap-3 flex-wrap">
                      {matchingAd ? (
                        <>
                          <button
                            onClick={() => startEdit(matchingAd)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 text-sm"
                          >
                            📝 Edit Ad
                          </button>
                          <button
                            onClick={() => toggleActive(matchingAd.id, matchingAd.is_active)}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                              matchingAd.is_active
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {matchingAd.is_active ? '⏸️ Deactivate Ad' : '▶️ Activate Ad'}
                          </button>
                          <button
                            onClick={() => deleteAd(matchingAd.id)}
                            className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-semibold hover:bg-red-200 text-sm"
                          >
                            🗑️ Delete Ad
                          </button>
                        </>
                      ) : (
                        <p className="text-yellow-700 text-sm">⚠️ Ad not found - may have been manually created</p>
                      )}
                      
                      <button
                        onClick={() => reverseApproval(sub.id, sub.company_name)}
                        disabled={loading || submissionActionId === sub.id}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 disabled:bg-gray-400 text-sm"
                      >
                        ↺ Revert to Pending
                      </button>
                    </div>
                  )}

                  {getSubmissionStatus(sub.status) === 'rejected' && (
                    <div className="flex gap-3">
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
                            .catch(err => {
                              toast.error(err.message)
                              setSubmissionActionId(null)
                            })
                        }}
                        disabled={loading || submissionActionId === sub.id}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 text-sm"
                      >
                        ↺ Restore to Pending
                      </button>
                      <p className="text-sm text-gray-600 py-2">Rejected submissions can be restored if needed.</p>
                    </div>
                  )}
                </div>
              )
            })}

            {filteredSubmissions.length === 0 && (
              <p className="text-center text-gray-500 py-8">No submissions yet</p>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
    </>
  )
}
