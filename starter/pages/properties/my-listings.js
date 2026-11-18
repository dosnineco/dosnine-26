import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Fragment } from 'react';
import toast from 'react-hot-toast';
import { FiEdit2, FiEye, FiMapPin, FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { formatPropertyMoney } from '../../lib/formatMoney';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const PageWrapper = PAYPAL_CLIENT_ID ? PayPalScriptProvider : Fragment;
const paypalOptions = PAYPAL_CLIENT_ID
  ? { options: { 'client-id': PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture' } }
  : {};

const emptyForm = {
  title: '', description: '', parish: '', town: '', address: '', phone_number: '',
  property_type: 'house', bedrooms: 0, bathrooms: 0, price: '', currency: 'JMD', type: 'rent',
};

export default function MyPropertiesPage() {
  const { user, isLoaded } = useUser();
  const { getToken, isLoaded: authLoaded, userId } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProperty, setEditingProperty] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [premiumActive, setPremiumActive] = useState(false);
  const [boosts, setBoosts] = useState({});
  const [boostPlan, setBoostPlan] = useState({ includedBoostAvailable: false, boostPriceJmd: 500 });
  const [boostLoading, setBoostLoading] = useState({});

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
        window.location.href = '/dashboard';
        return;
      }
      if (response.status === 403) {
        router.replace('/verify?role=homeowner');
        return;
      }
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to fetch properties');
      setProperties(payload.properties || []);
      const profileResponse = await authedFetch('/api/user/profile');
      const profile = await profileResponse.json();
      if (!profileResponse.ok) throw new Error(profile?.error || 'Unable to load your profile access.');
      setPremiumActive(Boolean(profile.premium));
      try {
        const boostResponse = await authedFetch('/api/properties/boost');
        const boostPayload = await boostResponse.json();
        if (!boostResponse.ok || !boostPayload?.success) {
          throw new Error(boostPayload?.error || 'Unable to load property boosts.');
        }
        setBoosts(Object.fromEntries((boostPayload.boosts || []).map((boost) => [boost.property_id, boost])));
        setBoostPlan({
          includedBoostAvailable: Boolean(boostPayload.includedBoostAvailable),
          boostPriceJmd: Number(boostPayload.boostPriceJmd) || 500,
        });
      } catch (boostError) {
        console.error('Unable to load property boost status:', boostError);
        toast.error(boostError.message || 'Unable to load property boost status.');
      }
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
        window.location.href = '/dashboard';
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

  const claimIncludedBoost = async (propertyId) => {
    setBoostLoading((current) => ({ ...current, [propertyId]: true }));
    try {
      const response = await authedFetch('/api/properties/boost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to activate boost.');
      setBoosts((current) => ({ ...current, [propertyId]: payload.boost }));
      setBoostPlan((current) => ({ ...current, includedBoostAvailable: false }));
      toast.success('Your free 30-day property boost is active.');
    } catch (err) {
      toast.error(err.message || 'Unable to activate boost.');
    } finally {
      setBoostLoading((current) => ({ ...current, [propertyId]: false }));
    }
  };

  const createBoostOrder = async (propertyId) => {
    const response = await authedFetch('/api/properties/boost/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId }),
    });
    const payload = await response.json();
    if (!response.ok || !payload?.success || !payload.orderId) {
      throw new Error(payload?.error || 'Unable to start boost checkout.');
    }
    return payload.orderId;
  };

  const captureBoostOrder = async (propertyId, data) => {
    setBoostLoading((current) => ({ ...current, [propertyId]: true }));
    try {
      const response = await authedFetch('/api/properties/boost/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: data.orderID }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to confirm payment.');
      setBoosts((current) => ({ ...current, [propertyId]: payload.boost }));
      toast.success('Your 30-day property boost is active.');
    } catch (err) {
      toast.error(err.message || 'Unable to confirm payment.');
    } finally {
      setBoostLoading((current) => ({ ...current, [propertyId]: false }));
    }
  };

  const markUnavailable = async (property) => {
    const status = property.type === 'rent' ? 'rented' : 'sold';
    const label = status === 'rented' ? 'rented' : 'sold';
    if (!confirm(`Mark this property as ${label}? Its active boost will end.`)) return;
    try {
      const response = await authedFetch('/api/properties/mark-unavailable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: property.id, status }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to update property status.');
      setProperties((current) => current.map((item) => (
        item.id === property.id ? { ...item, status } : item
      )));
      setBoosts((current) => {
        const next = { ...current };
        delete next[property.id];
        return next;
      });
      toast.success(`Property marked ${label}.`);
    } catch (err) {
      toast.error(err.message || 'Unable to update property status.');
    }
  };

  if (!isLoaded || !user) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }

  return (
    <PageWrapper {...paypalOptions}>
    <main className="dashboard-inspired min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="dashboard-eyebrow mb-2">Your listings</p>
            <h1 className="dashboard-page-heading text-3xl tracking-tight sm:text-4xl">Manage Properties</h1>
           
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/properties/new" className="btn-primary btn-lg"><FiPlus /> Add property</Link>
            <Link href="/properties/bulk-create" className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-300">Bulk add</Link>
          </div>
        </header>

        {loading ? <div className="py-16 text-center text-slate-500">Loading your properties...</div> : properties.length === 0 ? (
          <div className="dashboard-panel px-6 py-16 text-center">
            <p className="mb-4 text-lg text-slate-600">You haven&apos;t posted any properties yet.</p>
            <Link href="/properties/new" className="btn-primary">Add your first property</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {properties.map((property) => {
              const firstImage = property.image_urls?.[0] || property.property_images?.[0]?.image_url;
              const isEditing = editingProperty === property.id;
              const isUnavailable = ['sold', 'rented', 'leased'].includes(String(property.status || '').toLowerCase());
              return (
                <article key={property.id} className="dashboard-panel dashboard-panel-hover flex min-w-0 flex-col overflow-hidden rounded-2xl">
                  <div className="relative aspect-[4/3] bg-slate-200">
                    {firstImage ? <img src={firstImage} alt={property.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>}
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent">{property.is_off_market ? 'Off market' : property.type || 'rent'}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex-1">
                      <h2 className="line-clamp-2 text-lg font-semibold text-slate-950">{property.title}</h2>
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><FiMapPin size={14} /> {property.town}{property.parish && `, ${property.parish}`}</p>
                      <p className="mt-4 text-xl font-bold text-accent">{formatPropertyMoney(property.price, property.currency)}</p>
                      <p className="mt-2 text-xs text-slate-500">{property.bedrooms || 0} bed <span className="mx-1">•</span> {property.bathrooms || 0} bath <span className="mx-1">•</span> <FiEye className="inline" size={13} /> {property.views || 0}</p>
                      {boosts[property.id] ? (
                        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                          Boosted until {new Date(boosts[property.id].boost_end_date).toLocaleDateString('en-JM', { dateStyle: 'medium' })}
                        </p>
                      ) : isUnavailable ? (
                        <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Unavailable</p>
                      ) : (
                        <div className="mt-3">
                          {boostPlan.includedBoostAvailable && premiumActive ? (
                            <button
                              type="button"
                              disabled={boostLoading[property.id]}
                              onClick={() => claimIncludedBoost(property.id)}
                              className="w-full rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-200 disabled:opacity-50"
                            >
                              {boostLoading[property.id] ? 'Activating...' : 'Use free 30-day boost'}
                            </button>
                          ) : PAYPAL_CLIENT_ID ? (
                            <>
                              <p className="mb-1 text-center text-xs text-slate-600">
                                30-day visibility boost · J${boostPlan.boostPriceJmd.toLocaleString('en-JM')}
                              </p>
                              <PayPalButtons
                                style={{ layout: 'horizontal', height: 36, label: 'pay' }}
                                disabled={Boolean(boostLoading[property.id])}
                                createOrder={() => createBoostOrder(property.id)}
                                onApprove={(data) => captureBoostOrder(property.id, data)}
                                onError={(error) => {
                                  console.error('Property boost checkout failed:', error);
                                  toast.error('Boost checkout failed. Please try again.');
                                }}
                              />
                            </>
                          ) : (
                            <p className="text-xs text-slate-500">Boosts cost J${boostPlan.boostPriceJmd.toLocaleString('en-JM')} for 30 days.</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                      <Link href={`/property/${property.slug}`} className="flex-1 rounded-lg bg-slate-950 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-slate-800">View</Link>
                      <button type="button" title="Edit property" onClick={() => startEditing(property)} className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"><FiEdit2 /></button>
                      <button type="button" title="Delete property" onClick={() => handleDelete(property.id)} className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"><FiTrash2 /></button>
                    </div>
                    {!isUnavailable && (
                      <button
                        type="button"
                        onClick={() => markUnavailable(property)}
                        className="mt-2 w-full rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        Mark {property.type === 'rent' ? 'rented' : 'sold'}
                      </button>
                    )}
                  </div>
                  {isEditing && (
                    <form onSubmit={handleSave} className="border-t-4 border-accent bg-slate-50 p-4">
                      <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold text-slate-950">Edit listing</h3><button type="button" title="Close editor" onClick={() => setEditingProperty(null)}><FiX /></button></div>
                      <div className="space-y-3">
                        <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="Title" required className="w-full rounded-lg bg-white px-3 py-2 text-sm" />
                        <textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="Description" rows="3" required className="w-full rounded-lg bg-white px-3 py-2 text-sm" />
                        {['town', 'parish', 'address', 'phone_number'].map((field) => <input key={field} value={form[field] || ''} onChange={(event) => updateForm(field, event.target.value)} placeholder={field.replace('_', ' ')} required={['town', 'parish'].includes(field)} className="w-full rounded-lg bg-white px-3 py-2 text-sm" />)}
                        <div className="grid grid-cols-2 gap-2"><input type="number" min="0" value={form.price} onChange={(event) => updateForm('price', event.target.value)} placeholder="Price" required className="w-full rounded-lg bg-white px-3 py-2 text-sm" /><select value={form.type} onChange={(event) => updateForm('type', event.target.value)} className="w-full rounded-lg bg-white px-3 py-2 text-sm"><option value="rent">Rent</option><option value="sale">Sale</option></select></div>
                        {(premiumActive || form.is_off_market) && <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={Boolean(form.is_off_market)} onChange={(event) => updateForm('is_off_market', event.target.checked)} className="h-4 w-4 rounded accent-accent" /> Keep this property off-market for Premium members</label>}
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
    </PageWrapper>
  );
}
