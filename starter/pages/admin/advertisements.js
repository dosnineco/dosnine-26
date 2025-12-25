import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AdminAdvertisements() {
  const { user } = useUser()
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    company_name: '',
    title: '',
    category: 'legal',
    description: '',
    email: '',
    phone: '',
    image: null
  })

  useEffect(() => {
    loadAds()
  }, [])

  const loadAds = async () => {
    const { data } = await supabase
      .from('advertisements')
      .select('*')
      .order('created_at', { ascending: false })

    setAds(data || [])
  }

  const handleCreate = async () => {
    if (!user?.id) return toast.error('Not authenticated')
    setLoading(true)

    let imageUrl = null

    try {
      if (form.image) {
        const filePath = `ads/${Date.now()}-${form.image.name}`

        const { error: uploadErr } = await supabase.storage
          .from('advertisement-images')
          .upload(filePath, form.image, {
            upsert: true,
            contentType: form.image.type
          })

        if (uploadErr) throw uploadErr

        imageUrl = supabase.storage
          .from('advertisement-images')
          .getPublicUrl(filePath).data.publicUrl
      }

      const { error } = await supabase
        .from('advertisements')
        .insert([{
          company_name: form.company_name,
          title: form.title,
          category: form.category,
          description: form.description,
          email: form.email,
          phone: form.phone,
          image_url: imageUrl,
          created_by_clerk_id: user.id
        }])

      if (error) throw error

      toast.success('Advertisement created')
      setForm({
        company_name: '',
        title: '',
        category: 'legal',
        description: '',
        email: '',
        phone: '',
        image: null
      })
      loadAds()

    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteAd = async (id) => {
    await supabase.from('advertisements').delete().eq('id', id)
    toast.success('Advertisement deleted')
    loadAds()
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">
        Advertisements
      </h1>

      {/* Create */}
      <div className="bg-white p-6 rounded shadow mb-8 space-y-3">
        <input
          placeholder="Company name"
          className="w-full border p-2 rounded"
          value={form.company_name}
          onChange={e => setForm({ ...form, company_name: e.target.value })}
        />

        <input
          placeholder="Title"
          className="w-full border p-2 rounded"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
        />

        <select
          className="w-full border p-2 rounded"
          value={form.category}
          onChange={e => setForm({ ...form, category: e.target.value })}
        >
          <option value="legal">Legal</option>
          <option value="home_inspection">Home Inspection</option>
          <option value="architect">Architect</option>
          <option value="mortgage">Mortgage</option>
          <option value="insurance">Insurance</option>
          <option value="valuation">Valuation</option>
          <option value="contractor">Contractor</option>
        </select>

        <textarea
          placeholder="Description"
          className="w-full border p-2 rounded"
          rows="3"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
        />

        <input
          placeholder="Email"
          className="w-full border p-2 rounded"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
        />

        <input
          placeholder="Phone"
          className="w-full border p-2 rounded"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
        />

        <input
          type="file"
          accept="image/*"
          onChange={e => setForm({ ...form, image: e.target.files[0] })}
        />

        <button
          onClick={handleCreate}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          {loading ? 'Saving...' : 'Create Advertisement'}
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {ads.map(ad => (
          <div
            key={ad.id}
            className="flex justify-between items-center bg-gray-50 p-3 rounded"
          >
            <div>
              <p className="font-medium">{ad.company_name}</p>
              <p className="text-xs text-gray-500">{ad.category}</p>
            </div>

            <button
              onClick={() => deleteAd(ad.id)}
              className="text-red-600 text-sm"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
