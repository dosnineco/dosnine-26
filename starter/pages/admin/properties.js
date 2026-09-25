import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth, useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import {
  Plus,
  X,
  Pencil,
  Trash2,
  Star,
  EyeOff,
  MapPin,
  BedDouble,
  Bath,
  DollarSign,
  Home,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20';
const labelClass =
  'block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5';

const formatJMD = (value) => {
  const num = Number(value || 0);
  if (!num) return 'Price not set';
  return `J$${num.toLocaleString()}`;
};

export default function AdminPropertiesPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    parish: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    description: '',
    is_featured: false,
    is_active: true,
  });

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const authedFetch = async (url, options = {}) => {
    const token = await getToken();
    const nextHeaders = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    return fetch(url, {
      ...options,
      credentials: 'include',
      headers: nextHeaders,
    });
  };

  const checkAdminAccess = async () => {
    if (!user) return;

    try {
      const response = await authedFetch('/api/user/profile');
      const userData = await response.json();
      if (!response.ok) throw new Error(userData?.error || 'Access check failed');

      if (userData?.role === 'admin') {
        if (!userData.email || !userData.full_name) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        setIsAdmin(true);
        fetchData();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const response = await authedFetch('/api/admin/properties');
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load properties');
      }
      setProperties(payload.properties || []);
    } catch (err) {
      toast.error(err?.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  // Lightweight polling for updates
  useEffect(() => {
    if (!isAdmin) return;

    const interval = setInterval(() => {
      fetchData();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [isAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const body = {
        title: formData.title,
        parish: formData.parish,
        price: parseFloat(formData.price),
        bedrooms: parseInt(formData.bedrooms) || null,
        bathrooms: parseInt(formData.bathrooms) || null,
        description: formData.description,
        is_featured: formData.is_featured,
        is_active: formData.is_active,
      };

      if (editingId) {
        const response = await authedFetch('/api/admin/properties', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...body }),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success)
          throw new Error(payload?.error || 'Failed to update property');
        toast.success('Property updated successfully!');
      } else {
        const response = await authedFetch('/api/admin/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success)
          throw new Error(payload?.error || 'Failed to create property');
        toast.success('Property created successfully!');
      }

      resetForm();
      setShowForm(false);
      await fetchData();
    } catch (err) {
      toast.error(
        err?.message || (editingId ? 'Failed to update property' : 'Failed to create property')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (property) => {
    setEditingId(property.id);
    const isActive =
      typeof property.is_active === 'boolean'
        ? property.is_active
        : (property.status || 'available') === 'available';

    setFormData({
      title: property.title || '',
      parish: property.parish || '',
      price: property.price || '',
      bedrooms: property.bedrooms || '',
      bathrooms: property.bathrooms || '',
      description: property.description || '',
      is_featured: property.is_featured || false,
      is_active: isActive,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this property?\n\nThis action cannot be undone.')) return;

    try {
      const response = await authedFetch('/api/admin/properties', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success)
        throw new Error(payload?.error || 'Failed to delete property');

      toast.success('Property deleted successfully!');
      await fetchData();
    } catch (err) {
      toast.error(err?.message || 'Failed to delete property');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: '',
      parish: '',
      price: '',
      bedrooms: '',
      bathrooms: '',
      description: '',
      is_featured: false,
      is_active: true,
    });
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  if (!isAdmin && !loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Access denied</h1>
          <p className="mt-2 text-sm text-slate-600">
            Admin access is required to view properties.
          </p>
        </div>
      </div>
    );
  }

  const activeCount = properties.filter(
    (p) => typeof p.is_active === 'boolean' ? p.is_active : (p.status || 'available') === 'available'
  ).length;
  const featuredCount = properties.filter((p) => p.is_featured).length;

  return (
    <>
      <Head>
        <title>Properties — Admin</title>
      </Head>

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Properties
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Manage Properties
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Create, edit, and organize the properties shown on your listings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                if (showForm && editingId) resetForm();
                setShowForm((v) => !v);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90"
            >
              {showForm ? (
                <>
                  <X size={15} />
                  Close form
                </>
              ) : (
                <>
                  <Plus size={15} />
                  New property
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Total" value={properties.length} tone="slate" />
          <StatCard label="Active" value={activeCount} tone="emerald" />
          <StatCard label="Featured" value={featuredCount} tone="amber" />
        </div>

        {/* Create / Edit form */}
        {showForm && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingId ? 'Edit property' : 'New property'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {editingId
                    ? 'Update the property details below.'
                    : 'Fill in the property details to publish a new listing.'}
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

            <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Modern 3-bedroom home in Kingston"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Parish</label>
                <input
                  type="text"
                  value={formData.parish}
                  onChange={(e) => setFormData({ ...formData, parish: e.target.value })}
                  placeholder="e.g. Kingston"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Price (JMD) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="45000000"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Bedrooms</label>
                <input
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  placeholder="3"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Bathrooms</label>
                <input
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  placeholder="2"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the property's key features, condition, and neighborhood…"
                  rows="4"
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Toggles */}
              <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                  />
                  <span className="text-sm font-medium text-slate-800">
                    Featured property
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                  />
                  <span className="text-sm font-medium text-slate-800">Active</span>
                </label>
              </div>

              {/* Actions */}
              <div className="sm:col-span-2 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60"
                >
                  {loading
                    ? 'Saving…'
                    : editingId
                    ? 'Update property'
                    : 'Create property'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Properties list */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              All properties ({properties.length})
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
                />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
              <Home className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                No properties yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Create your first listing to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {properties.map((property) => {
                const isActive =
                  typeof property.is_active === 'boolean'
                    ? property.is_active
                    : (property.status || 'available') === 'available';

                return (
                  <article
                    key={property.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex flex-1 flex-col p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900">
                            {property.title || 'Untitled property'}
                          </h3>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                            <MapPin size={13} className="shrink-0 text-slate-400" />
                            <span className="truncate">
                              {property.parish || 'Location not set'}
                            </span>
                          </p>
                        </div>

                        {isActive ? null : (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            <EyeOff size={10} />
                            Inactive
                          </span>
                        )}
                      </div>

                      {/* Price */}
                      <p className="mt-3 text-lg font-bold tracking-tight text-slate-900">
                        {formatJMD(property.price)}
                      </p>

                      {/* Specs */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                        {property.bedrooms != null && property.bedrooms !== '' && (
                          <span className="inline-flex items-center gap-1.5">
                            <BedDouble size={14} className="text-slate-400" />
                            {property.bedrooms} bd
                          </span>
                        )}
                        {property.bathrooms != null && property.bathrooms !== '' && (
                          <span className="inline-flex items-center gap-1.5">
                            <Bath size={14} className="text-slate-400" />
                            {property.bathrooms} ba
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {property.description && (
                        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
                          {property.description}
                        </p>
                      )}

                      {/* Badges */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {property.is_featured && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                            <Star size={10} className="fill-amber-600 text-amber-600" />
                            Featured
                          </span>
                        )}
                        {isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                      <button
                        type="button"
                        onClick={() => handleEdit(property)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
                      >
                        <Pencil size={13} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(property.id)}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function StatCard({ label, value, tone = 'slate' }) {
  const classes = {
    slate: { bg: 'bg-slate-100', text: 'text-slate-800' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-800' },
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${classes.text}`}>{value}</p>
    </div>
  );
}