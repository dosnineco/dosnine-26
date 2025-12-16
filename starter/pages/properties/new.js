import { useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import axios from 'axios';
import toast from 'react-hot-toast';

const PARISHES = [
  'Kingston', 'St Andrew', 'St Catherine', 'St James', 'Clarendon',
  'Manchester', 'St Ann', 'Portland', 'St Thomas', 'St Elizabeth',
  'Trelawny', 'Hanover'
];

export default function NewProperty() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

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
    status: 'available',
    available_date: '',
    phone_number: '',
  };

  const [form, setForm] = useState(initialFormState);

  const resetForm = () => {
    setForm(initialFormState);
    setImages([]);
  };

  const generateSlug = async (title) => {
    let baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const { data, error } = await supabase
        .from('properties')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!data) break;
      slug = `${baseSlug}-${counter++}`;
    }

    return slug;
  };

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

  if (!user?.id) {
    toast.error("You must be logged in");
    return;
  }

  // Check property limit before allowing submission
  try {
    const { data: limitCheck } = await axios.get('/api/properties/check-limit', {
      params: { clerkId: user.id }
    });

    if (!limitCheck.canPost) {
      if (limitCheck.reason === 'verification_required') {
        toast.error('Agent verification required. Please complete your agent profile.');
        router.push('/agent/signup');
        return;
      } else if (limitCheck.reason === 'payment_required') {
        toast.error('Payment required to access agent features.');
        router.push('/agent/payment');
        return;
      } else if (limitCheck.reason === 'limit_reached') {
        toast.error('Property limit reached. Regular users can post 1 property. Become a verified agent for unlimited postings!');
        return;
      }
    }
  } catch (limitError) {
    console.error('Failed to check property limit:', limitError);
    toast.error('Unable to verify posting permissions');
    return;
  }

  if (images.length === 0) {
    toast.error('Please upload at least one image');
    return;
  }

  setLoading(true);
  try {
    // 1️⃣ Get or create user's UUID in our `users` table
    let ownerUuid = null;
    try {
      const { data: dbUser, error: userErr } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user.id)
        .single();

      if (dbUser && dbUser.id) {
        ownerUuid = dbUser.id;
      } else {
        // If user row doesn't exist, try to insert (upsert) a minimal record.
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.fullName || null;
        const email = (user.emailAddresses && user.emailAddresses[0] && user.emailAddresses[0].email) || (user.primaryEmailAddress && user.primaryEmailAddress.email) || null;

        const { data: newUser, error: newUserErr } = await supabase
          .from('users')
          .insert([{ clerk_id: user.id, full_name: fullName, email }])
          .select('id')
          .single();

        if (newUserErr || !newUser) throw new Error('Failed to create user record');
        ownerUuid = newUser.id;
      }
    } catch (err) {
      console.error('User lookup/upsert error', err);
      throw new Error('User record required to post property');
    }

    // 2️⃣ Generate unique slug
    const slug = await generateSlug(form.title);

    // 3️⃣ Insert property
    const { data: property, error: propErr } = await supabase
      .from('properties')
      .insert([{
        owner_id: ownerUuid,
        slug,
        title: form.title,
        description: form.description,
        parish: form.parish,
        town: form.town,
        address: form.address,
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        price: Number(form.price),
        currency: form.currency,
        type: form.type,
        status: form.status,
        available_date: form.available_date || null,
        phone_number: form.phone_number || null
      }])
      .select()
      .single();
    if (propErr) throw propErr;

    const propertyId = property.id;

    // 4️⃣ Upload each file directly to Supabase Storage bucket
    const imageUrls = [];
    const uploadedFiles = []; // will hold { publicUrl, path }

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const fileExt = img.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${ownerUuid}/${propertyId}/${fileName}`;

      // Upload using the File object and include contentType for correctness
      const { error: uploadErr } = await supabase.storage
        .from('property-images')
        .upload(filePath, img.file, { cacheControl: '3600', upsert: true, contentType: img.file.type });

      if (uploadErr) {
        console.error('Supabase Upload Error:', uploadErr);
        throw new Error(`Failed to upload image ${i + 1}: ${uploadErr.message || JSON.stringify(uploadErr)}`);
      }

      // getPublicUrl returns an object in `data` which may contain `publicUrl` (or older `publicURL`)
      const publicResult = supabase.storage.from('property-images').getPublicUrl(filePath);
      const publicData = publicResult && publicResult.data ? publicResult.data : null;
      const publicUrl = (publicData && (publicData.publicUrl || publicData.publicURL)) || null;

      if (!publicUrl) {
        console.error('Failed to obtain public URL for', filePath, publicResult);
        throw new Error('Failed to get public URL for uploaded image');
      }

      imageUrls.push(publicUrl);
      uploadedFiles.push({ publicUrl, path: filePath });
      // revoke the object URL preview to avoid memory leaks
      try { URL.revokeObjectURL(img.preview); } catch (e) {}
    }

    // 5️⃣ Try saving image URLs in the `properties.image_urls` column (if it exists).
    // If that column doesn't exist (different schema), fall back to inserting rows into `property_images`.
    let imgErr = null;
    try {
      const update = await supabase
        .from('properties')
        .update({ image_urls: imageUrls })
        .eq('id', propertyId);

      imgErr = update.error;
      if (imgErr) throw imgErr;
    } catch (updateErr) {
      // If updateErr indicates missing column, insert into property_images instead
      console.warn('Could not update properties.image_urls, falling back to property_images:', updateErr.message || updateErr);

      // Prepare rows for property_images table
      const imageRows = uploadedFiles.map((f, idx) => ({
        property_id: propertyId,
        image_url: f.publicUrl,
        storage_path: f.path,
        position: idx,
      }));

      const { error: insertErr } = await supabase.from('property_images').insert(imageRows);
      if (insertErr) throw insertErr;
    }

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


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/properties/my-listings" className="text-blue-600 hover:underline">← Back to My Properties</Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-8">Post New Property</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl bg-white rounded-lg  p-6">
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
        <div className="grid grid-cols-2 gap-4 mb-4">
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
          <div>
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
            <label className="block text-sm font-medium mb-1">Type</label>
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
  );
}
