import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiEdit2, FiEye, FiMapPin, FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi';
import { formatPropertyMoney } from '../../lib/formatMoney';

const emptyForm = {
  title: '', description: '', parish: '', town: '', address: '', phone_number: '',
  property_type: 'house', bedrooms: 0, bathrooms: 0, price: '', currency: 'JMD', type: 'rent',
};

export default function MyPropertiesPage() {
  const { user, isLoaded } = useUser();
  const { getToken, isLoaded: authLoaded, userId } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProperty, setEditingProperty] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user || !authLoaded || !userId) return;
    fetchProperties();
  }, [isLoaded, user, authLoaded, userId]);

  const authedFetch = async (url, options = {}) => {
    const token = await getToken();
    return fetch(url, {
      ...options,
      credentials: 'include',
      headers: { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  };

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await authedFetch('/api/properties/mine');
      const payload = await response.json();
      if (response.status === 401) {
        toast.error('Session expired. Please sign in again.');
        window.location.href = '/sign-in';
        return;
      }
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to fetch properties');
      setProperties(payload.properties || []);
    } catch (err) {
      console.error('Error fetching properties:', err);
      toast.error('Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (property) => {
    setEditingProperty(property.id);
    setForm({ ...emptyForm, ...property, price: property.price || '' });
  };

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await authedFetch('/api/properties/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingProperty, ...form }),
      });
      const payload = await response.json();
      if (response.status === 401) {
        toast.error('Session expired. Please sign in again.');
        window.location.href = '/sign-in';
        return;
      }
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to update property');
      setProperties((current) => current.map((property) => (
        property.id === editingProperty ? { ...property, ...payload.property } : property
      )));
      setEditingProperty(null);
      toast.success('Property updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update property');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    try {
      const response = await authedFetch('/api/properties/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to delete property');
      setProperties((current) => current.filter((property) => property.id !== id));
      toast.success('Property and images deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete property');
    }
  };

  if (!isLoaded || !user) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className=" text-4xl font-semibold tracking-tight text-slate-950">Manage Properties</h1>
           
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/properties/new" className="btn-primary btn-lg"><FiPlus /> Add property</Link>
            <Link href="/properties/bulk-create" className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-300">Bulk add</Link>
          </div>
        </header>

        {loading ? <div className="py-16 text-center text-slate-500">Loading your properties...</div> : properties.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            <p className="mb-4 text-lg text-slate-600">You haven&apos;t posted any properties yet.</p>
            <Link href="/properties/new" className="btn-primary">Add your first property</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {properties.map((property) => {
              const firstImage = property.image_urls?.[0] || property.property_images?.[0]?.image_url;
              const isEditing = editingProperty === property.id;
              return (
                <article key={property.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-1">
                  <div className="relative aspect-[4/3] bg-slate-200">
                    {firstImage ? <img src={firstImage} alt={property.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>}
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent">{property.type || 'rent'}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex-1">
                      <h2 className="line-clamp-2 text-lg font-semibold text-slate-950">{property.title}</h2>
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><FiMapPin size={14} /> {property.town}{property.parish && `, ${property.parish}`}</p>
                      <p className="mt-4 text-xl font-bold text-accent">{formatPropertyMoney(property.price, property.currency)}</p>
                      <p className="mt-2 text-xs text-slate-500">{property.bedrooms || 0} bed <span className="mx-1">•</span> {property.bathrooms || 0} bath <span className="mx-1">•</span> <FiEye className="inline" size={13} /> {property.views || 0}</p>
                    </div>
                    <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                      <Link href={`/property/${property.slug}`} className="flex-1 rounded-lg bg-slate-950 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-slate-800">View</Link>
                      <button type="button" title="Edit property" onClick={() => startEditing(property)} className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"><FiEdit2 /></button>
                      <button type="button" title="Delete property" onClick={() => handleDelete(property.id)} className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"><FiTrash2 /></button>
                    </div>
                  </div>
                  {isEditing && (
                    <form onSubmit={handleSave} className="border-t-4 border-accent bg-slate-50 p-4">
                      <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold text-slate-950">Edit listing</h3><button type="button" title="Close editor" onClick={() => setEditingProperty(null)}><FiX /></button></div>
                      <div className="space-y-3">
                        <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="Title" required className="w-full rounded-lg bg-white px-3 py-2 text-sm" />
                        <textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="Description" rows="3" required className="w-full rounded-lg bg-white px-3 py-2 text-sm" />
                        {['town', 'parish', 'address', 'phone_number'].map((field) => <input key={field} value={form[field] || ''} onChange={(event) => updateForm(field, event.target.value)} placeholder={field.replace('_', ' ')} required={['town', 'parish'].includes(field)} className="w-full rounded-lg bg-white px-3 py-2 text-sm" />)}
                        <div className="grid grid-cols-2 gap-2"><input type="number" min="0" value={form.price} onChange={(event) => updateForm('price', event.target.value)} placeholder="Price" required className="w-full rounded-lg bg-white px-3 py-2 text-sm" /><select value={form.type} onChange={(event) => updateForm('type', event.target.value)} className="w-full rounded-lg bg-white px-3 py-2 text-sm"><option value="rent">Rent</option><option value="sale">Sale</option></select></div>
                        <div className="grid grid-cols-2 gap-2"><input type="number" min="0" value={form.bedrooms} onChange={(event) => updateForm('bedrooms', event.target.value)} placeholder="Bedrooms" className="w-full rounded-lg bg-white px-3 py-2 text-sm" /><input type="number" min="0" value={form.bathrooms} onChange={(event) => updateForm('bathrooms', event.target.value)} placeholder="Bathrooms" className="w-full rounded-lg bg-white px-3 py-2 text-sm" /></div>
                        <div className="flex gap-2"><button disabled={saving} className="btn-primary flex-1"><FiSave /> {saving ? 'Saving...' : 'Save changes'}</button><button type="button" onClick={() => setEditingProperty(null)} className="rounded-lg bg-white px-3 text-sm font-semibold text-slate-600"><FiX /></button></div>
                      </div>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
