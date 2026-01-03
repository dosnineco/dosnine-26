import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AdminAdvertisements() {
  const { user } = useUser()
  const [ads, setAds] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [activeTab, setActiveTab] = useState('ads') // 'ads' or 'submissions'
  const [loading, setLoading] = useState(false)
  const [editingAd, setEditingAd] = useState(null)

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

  const handleCreate = async () => {
    if (!user?.id) return toast.error('Not authenticated')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('advertisements')
        .insert([{
          ...form,
          created_by_clerk_id: user.id,
          created_at: new Date().toISOString()
        }])

      if (error) throw error

      toast.success('Advertisement created')
      resetForm()
      loadAds()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingAd) return
    setLoading(true)

    try {
      const { error } = await supabase
        .from('advertisements')
        .update(form)
        .eq('id', editingAd.id)

      if (error) throw error

      toast.success('Advertisement updated')
      setEditingAd(null)
      resetForm()
      loadAds()
    } catch (err) {
      toast.error(err.message)
    } finally {
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
    setLoading(true)

    try {
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
          created_by_clerk_id: user.id,
          created_at: new Date().toISOString()
        }])

      if (adError) throw adError

      // Update submission status
      const { error: updateError } = await supabase
        .from('sponsor_submissions')
        .update({ status: 'approved' })
        .eq('id', submission.id)

      if (updateError) throw updateError

      toast.success('Submission approved and ad created!')
      loadAds()
      loadSubmissions()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const rejectSubmission = async (id) => {
    if (!confirm('Are you sure you want to reject this submission?')) return

    const { error } = await supabase
      .from('sponsor_submissions')
      .update({ status: 'rejected' })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Submission rejected')
      loadSubmissions()
    }
  }

  const reverseApproval = async (submissionId, companyName) => {
    if (!confirm(`Reverse approval for ${companyName}? This will NOT delete the created ad.`)) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('sponsor_submissions')
        .update({ status: 'pending_payment' })
        .eq('id', submissionId)

      if (error) throw error

      toast.success('Submission reverted to pending payment')
      loadSubmissions()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const findAdFromSubmission = async (submission) => {
    // Find the ad created from this submission by matching company name and details
    const matchingAd = ads.find(
      ad => ad.company_name === submission.company_name && 
            ad.email === submission.email
    )
    return matchingAd
  }

  const startEdit = (ad) => {
    setEditingAd(ad)
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
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Advertisement Manager</h1>
      <p className="text-gray-600 mb-6">Manage ads and approve submissions</p>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b">
        <button
          onClick={() => setActiveTab('ads')}
          className={`px-6 py-3 font-semibold border-b-2 transition ${
            activeTab === 'ads'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Active Ads ({ads.length})
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-6 py-3 font-semibold border-b-2 transition ${
            activeTab === 'submissions'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Pending Submissions ({submissions.filter(s => s.status === 'pending_payment').length})
        </button>
      </div>

      {activeTab === 'ads' && (
        <>
          {/* Create/Edit Form */}
          <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
            <h2 className="text-xl font-bold mb-4">
              {editingAd ? 'Edit Advertisement' : 'Create New Advertisement'}
            </h2>

            <div className="mb-4">
              <input
                placeholder="Advertisement Title *"
                className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-accent focus:outline-none"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input
                placeholder="Company name *"
                className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-accent focus:outline-none"
                value={form.company_name}
                onChange={e => setForm({ ...form, company_name: e.target.value })}
              />

              <select
                className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-accent focus:outline-none"
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
              className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-accent focus:outline-none mb-4"
              rows="3"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input
                placeholder="Email *"
                type="email"
                className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-accent focus:outline-none"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />

              <input
                placeholder="Phone *"
                type="tel"
                className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-accent focus:outline-none"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input
                placeholder="Website (optional)"
                type="url"
                className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-accent focus:outline-none"
                value={form.website}
                onChange={e => setForm({ ...form, website: e.target.value })}
              />

              <input
                placeholder="Image URL (optional)"
                type="url"
                className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-accent focus:outline-none"
                value={form.image_url}
                onChange={e => setForm({ ...form, image_url: e.target.value })}
              />
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
                    className="bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-accent/90 disabled:bg-gray-400"
                  >
                    {loading ? 'Updating...' : 'Update Advertisement'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-accent/90 disabled:bg-gray-400"
                >
                  {loading ? 'Creating...' : 'Create Advertisement'}
                </button>
              )}
            </div>
          </div>

          {/* Active Ads List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">All Advertisements</h2>
            <div className="space-y-3">
              {ads.map(ad => (
                <div
                  key={ad.id}
                  className={`flex justify-between items-center p-4 rounded-lg border-2 ${
                    ad.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex-1">
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

                  <div className="flex gap-2 ml-4">
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
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'submissions' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Sponsor Submissions</h2>
          
          {/* Filter tabs */}
          <div className="flex gap-2 mb-6 border-b pb-4">
            <button
              onClick={() => {/* filter to pending */}}
              className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-semibold text-sm hover:bg-yellow-200"
            >
              Pending ({submissions.filter(s => s.status === 'pending_payment').length})
            </button>
            <button
              onClick={() => {/* filter to approved */}}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold text-sm hover:bg-green-200"
            >
              Approved ({submissions.filter(s => s.status === 'approved').length})
            </button>
            <button
              onClick={() => {/* filter to rejected */}}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold text-sm hover:bg-red-200"
            >
              Rejected ({submissions.filter(s => s.status === 'rejected').length})
            </button>
          </div>

          <div className="space-y-4">
            {submissions.map(sub => {
              const matchingAd = ads.find(
                ad => ad.company_name === sub.company_name && ad.email === sub.email
              )

              return (
                <div
                  key={sub.id}
                  className={`p-5 rounded-lg border-2 ${
                    sub.status === 'pending_payment'
                      ? 'bg-yellow-50 border-yellow-300'
                      : sub.status === 'approved'
                      ? 'bg-green-50 border-green-300'
                      : 'bg-red-50 border-red-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{sub.company_name}</h3>
                      <p className="text-sm text-gray-600">
                        {sub.category} • J${sub.is_featured ? '14,970' : '8,970'} {sub.is_featured && '(Featured)'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {sub.status === 'approved' && matchingAd && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded font-bold">
                          ✓ Ad Created (ID: {matchingAd.id.slice(0, 8)})
                        </span>
                      )}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                          sub.status === 'pending_payment'
                            ? 'bg-yellow-400 text-yellow-900'
                            : sub.status === 'approved'
                            ? 'bg-green-400 text-green-900'
                            : 'bg-red-400 text-red-900'
                        }`}
                      >
                        {sub.status.replace('_', ' ').toUpperCase()}
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

                  {sub.status === 'pending_payment' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => approveSubmission(sub)}
                        disabled={loading}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
                      >
                        ✓ Approve & Activate
                      </button>
                      <button
                        onClick={() => rejectSubmission(sub.id)}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}

                  {sub.status === 'approved' && (
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
                        disabled={loading}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 disabled:bg-gray-400 text-sm"
                      >
                        ↺ Revert to Pending
                      </button>
                    </div>
                  )}

                  {sub.status === 'rejected' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const newStatus = 'pending_payment'
                          supabase
                            .from('sponsor_submissions')
                            .update({ status: newStatus })
                            .eq('id', sub.id)
                            .then(() => {
                              toast.success('Submission restored to pending')
                              loadSubmissions()
                            })
                            .catch(err => toast.error(err.message))
                        }}
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

            {submissions.length === 0 && (
              <p className="text-center text-gray-500 py-8">No submissions yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
