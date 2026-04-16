import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import axios from 'axios';
import toast from 'react-hot-toast';
import { PARISHES } from '../../lib/normalizeParish';

export default function NewProperty() {
  const { user, isLoaded } = useUser();
  const { getToken, isLoaded: authLoaded, userId } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Check payment status for agents before loading page
  useEffect(() => {
    async function checkAgentPaymentStatus() {
      if (!isLoaded) return;
      
      if (!user) {
        setCheckingAccess(false);
        return;
      }

      try {
        const token = await getToken();
        await axios.get('/api/user/profile', {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        // If user is an agent (verified), just allow them to continue
        // Payment status will be managed on the agent dashboard
        
        setCheckingAccess(false);
      } catch (error) {
        if (error?.response?.status === 401) {
          toast.error('Session expired. Please sign in again.');
          router.push('/sign-in');
          return;
        }
        setCheckingAccess(false);
      }
    }

    checkAgentPaymentStatus();
  }, [user, isLoaded, router, getToken]);

  const PROPERTY_TYPES = [
    { value: 'house', label: 'House' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'land', label: 'Land' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'other', label: 'Other' },
  ];

  const initialFormState = {
    title: '',
    description: '',
    parish: '',
    town: '',
    address: '',
    bedrooms: '',
    bathrooms: '',
    price: '',
    currency: 'JMD',
    type: 'rent',
    property_type: 'house',
    status: 'available',
    available_date: '',
    phone_number: '',
  };

  const [form, setForm] = useState(initialFormState);

  const resetForm = () => {
    setForm(initialFormState);
    setImages([]);
  };

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Handle image selection and prepare files
const handleImageUpload = async (e) => {
  const files = Array.from(e.target.files || []);
  if (images.length + files.length > 5) {
    toast.error('Maximum 5 images allowed');
    return;
  }

  setUploadingImages(true);
  try {
    // Store actual File objects for direct upload
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);
    toast.success('Image(s) ready');
  } catch (err) {
    toast.error('Failed to read image');
    console.error(err);
  } finally {
    setUploadingImages(false);
  }
};

// Handle form submit and upload images to Supabase bucket
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!authLoaded) {
    toast.error('Authentication still loading, please try again');
    return;
  }

  if (!userId) {
    toast.error('Session expired. Please sign in again.');
    router.push('/sign-in');
    return;
  }

  if (!user?.id) {
    toast.error("You must be logged in");
    return;
  }

  const handleLimitDenied = (limitCheck) => {
    if (!limitCheck || limitCheck.canPost) return false;

    if (limitCheck.reason === 'verification_required') {
      toast.error('Agent verification required. Please complete your agent profile.');
      router.push('/agent/signup');
      return true;
    }

    if (limitCheck.reason === 'payment_required') {
      toast.error('Active agent plan required to post properties.');
      return true;
    }

    if (limitCheck.reason === 'limit_reached') {
      toast.error('Property limit reached. Regular users can post 2 properties. Become a verified agent for unlimited postings!');
      return true;
    }

    toast.error(limitCheck.error || 'Unable to verify posting permissions');
    return true;
  };

  // Check property limit before allowing submission
  try {
    const token = await getToken();
    const { data: limitCheck } = await axios.get('/api/properties/check-limit', {
      withCredentials: true,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (handleLimitDenied(limitCheck)) {
      return;
    }
  } catch (limitError) {
    console.error('Failed to check property limit:', limitError);

    if (limitError?.response?.status === 401) {
      toast.error('Session expired. Please sign in again.');
      router.push('/sign-in');
      return;
    }

    if (limitError?.response?.data) {
      if (handleLimitDenied(limitError.response.data)) {
        return;
      }
      toast.error(limitError.response.data.error || 'Unable to verify posting permissions');
      return;
    }

    toast.error('Unable to verify posting permissions');
    return;
  }

  if (images.length === 0) {
    toast.error('Please upload at least one image');
    return;
  }

  setLoading(true);
  try {
    const token = await getToken();
    const imagePayload = await Promise.all(
      images.map(async (img) => ({ dataUrl: await fileToDataUrl(img.file) }))
    );

    const useRoomCounts = ['house', 'apartment'].includes(form.property_type);
    const payloadForm = {
      ...form,
      bedrooms: useRoomCounts ? Number(form.bedrooms || 0) : 0,
      bathrooms: useRoomCounts ? Number(form.bathrooms || 0) : 0,
      price: Number(form.price),
      property_type: form.property_type,
    };

    const response = await fetch('/api/properties/create', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        form: payloadForm,
        images: imagePayload,
      })
    });

    const raw = await response.text();
    let payload = null;

    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = null;
    }

    if (!response.ok || !payload?.success) {
      if (response.status === 401) {
        toast.error('Session expired. Please sign in again.');
        router.push('/sign-in');
        return;
      }

      const message =
        payload?.error ||
        payload?.message ||
        (raw && !raw.startsWith('<!DOCTYPE') ? raw : '') ||
        'Failed to create property';

      throw new Error(message);
    }

    images.forEach((img) => {
      try { URL.revokeObjectURL(img.preview); } catch (e) {}
    });

    toast.success('Property posted successfully!');
    resetForm();
    router.push('/dashboard');

  } catch (err) {
    console.error(err);
    toast.error(err.message || 'Failed to create property');
  } finally {
    setLoading(false);
  }
};


  // Show loading screen while checking access
  if (checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 flex justify-center">
        <div className="w-full max-w-3xl">
          <div className="mb-4">
            <Link href="/properties/my-listings" className="text-blue-600 hover:underline">← Back to My Properties</Link>
          </div>
          
          <h1 className="text-3xl font-bold mb-8 text-center">Post New Property</h1>

          <form onSubmit={handleSubmit} className="w-full bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {/* Basic Info */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            required
            placeholder="e.g., Beautiful 3 Bed House in Portmore"
            className="w-full border rounded px-3 py-2"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Description *</label>
          <textarea
            required
            placeholder="Describe your property..."
            rows="4"
            className="w-full border rounded px-3 py-2"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          ></textarea>
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Parish *</label>
            <select
              required
              className="w-full border rounded px-3 py-2"
              value={form.parish}
              onChange={(e) => setForm({ ...form, parish: e.target.value })}
            >
              <option value="">Select Parish</option>
              {PARISHES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Town/Area *</label>
            <input
              type="text"
              required
              placeholder="e.g., Portmore"
              className="w-full border rounded px-3 py-2"
              value={form.town}
              onChange={(e) => setForm({ ...form, town: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select
              required
              className="w-full border rounded px-3 py-2"
              value={form.property_type}
              onChange={(e) => setForm({ ...form, property_type: e.target.value })}
            >
              {PROPERTY_TYPES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Address</label>
          <input
            type="text"
            placeholder="Street address"
            className="w-full border rounded px-3 py-2"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <input
            type="tel"
            placeholder="e.g., +1 876 555-1234"
            className="w-full border rounded px-3 py-2"
            value={form.phone_number}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
          />
        </div>

        {/* Details */}
        {['house', 'apartment'].includes(form.property_type) ? (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Bedrooms *</label>
              <input
                type="number"
                required
                min="0"
                className="w-full border rounded px-3 py-2"
                value={form.bedrooms}
                onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bathrooms *</label>
              <input
                type="number"
                required
                min="0"
                className="w-full border rounded px-3 py-2"
                value={form.bathrooms}
                onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <div className="mb-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
            Bedrooms and bathrooms are not required for this category. Values will default to 0.
          </div>
        )}

        {/* Price */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Price *</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              className="w-full border rounded px-3 py-2"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Currency</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              <option value="JMD">JMD</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        {/* Status */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Market</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="rent">Rent</option>
              <option value="sale">Sale</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="available">Available</option>
              <option value="coming_soon">Coming Soon</option>
              <option value="rented">Rented</option>
            </select>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Available Date</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={form.available_date}
            onChange={(e) => setForm({ ...form, available_date: e.target.value })}
          />
        </div>

        {/* Image Upload */}
        <div className="mb-6 p-4 bg-blue-50 rounded">
          <label className="block text-sm font-medium mb-2">Upload Images (Max 5) *</label>
          <input
            type="file"
            multiple
            accept="image/*"
            disabled={uploadingImages}
            onChange={handleImageUpload}
            className="block w-full text-sm text-gray-500 mb-3"
          />
          {uploadingImages && <p className="text-blue-600">Uploading...</p>}

          {images.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Uploaded Images ({images.length}/5)</p>
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, idx) => {
                  const src = typeof img === 'string' ? img : img.preview || img.url;
                  return (
                    <div key={idx} className="relative group">
                      <img src={src} alt={`Uploaded ${idx + 1}`} className="w-full h-24 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => setImages(images.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 rounded transition"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || uploadingImages}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Posting...' : 'Post Property'}
        </button>
      </form>
    </div>
  </div>
</div>
  );
}
