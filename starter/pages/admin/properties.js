import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth, useUser } from '@clerk/nextjs';
import AdminLayout from '../../components/AdminLayout';
import toast from 'react-hot-toast';
import { FiTrash2, FiEdit2 } from 'react-icons/fi';

export default function AdminPropertiesPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    parish: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    description: '',
    is_featured: false,
    is_active: true
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
          console.error('❌ SECURITY: Admin user has NULL data');
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
      if (editingId) {
        const response = await authedFetch('/api/admin/properties', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            title: formData.title,
            parish: formData.parish,
            price: parseFloat(formData.price),
            bedrooms: parseInt(formData.bedrooms) || null,
            bathrooms: parseInt(formData.bathrooms) || null,
            description: formData.description,
            is_featured: formData.is_featured,
            is_active: formData.is_active,
          })
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to update property');
        toast.success('Property updated successfully!');
      } else {
        const response = await authedFetch('/api/admin/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            parish: formData.parish,
            price: parseFloat(formData.price),
            bedrooms: parseInt(formData.bedrooms) || null,
            bathrooms: parseInt(formData.bathrooms) || null,
            description: formData.description,
            is_featured: formData.is_featured,
            is_active: formData.is_active,
          })
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to create property');
        toast.success('Property created successfully!');
      }

      resetForm();
      await fetchData();
    } catch (err) {
      toast.error(err?.message || (editingId ? 'Failed to update property' : 'Failed to create property'));
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
      is_active: isActive
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('⚠️ DELETE this property?\n\nThis action cannot be undone!')) return;

    try {
      const response = await authedFetch('/api/admin/properties', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to delete property');

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
      is_active: true
    });
  };

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Properties — Admin Dashboard</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <AdminLayout />

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-gray-100 rounded-xl p-6 sticky top-6">
                  <h2 className="text-xl font-bold mb-4">
                    {editingId ? 'Edit Property' : 'Add Property'}
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-gray-50 px-4 py-3 rounded-lg focus:ring-2 focus:ring-accent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Parish
                      </label>
                      <input
                        type="text"
                        value={formData.parish}
                        onChange={(e) => setFormData({ ...formData, parish: e.target.value })}
                        className="w-full bg-gray-50 px-4 py-3 rounded-lg focus:ring-2 focus:ring-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price *
                      </label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full bg-gray-50 px-4 py-3 rounded-lg focus:ring-2 focus:ring-accent"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bedrooms
                        </label>
                        <input
                          type="number"
                          value={formData.bedrooms}
                          onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                          className="w-full bg-gray-50 px-4 py-3 rounded-lg focus:ring-2 focus:ring-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bathrooms
                        </label>
                        <input
                          type="number"
                          value={formData.bathrooms}
                          onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                          className="w-full bg-gray-50 px-4 py-3 rounded-lg focus:ring-2 focus:ring-accent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-gray-50 px-4 py-3 rounded-lg focus:ring-2 focus:ring-accent"
                        rows="3"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.is_featured}
                          onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Featured</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Active</span>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 font-medium"
                      >
                        {editingId ? 'Update' : 'Create'}
                      </button>
                      {editingId && (
                        <button
                          type="button"
                          onClick={resetForm}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-gray-100 rounded-xl">
                  <div className="p-6">
                    <h2 className="text-xl font-bold">Properties ({properties.length})</h2>
                  </div>

                  {properties.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <p>No properties yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3 px-4 pb-4">
                      {properties.map((property) => (
                        <div key={property.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900">{property.title}</h3>
                              <p className="text-sm text-gray-600">📍 {property.parish || 'N/A'}</p>
                              
                              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                                <span>JMD ${property.price?.toLocaleString() || '0'}</span>
                                {property.bedrooms && <span>{property.bedrooms} bed</span>}
                                {property.bathrooms && <span>{property.bathrooms} bath</span>}
                              </div>

                              {property.description && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{property.description}</p>
                              )}

                              <div className="flex gap-2 mt-2">
                                {property.is_featured && (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                                    ⭐ Featured
                                  </span>
                                )}
                                {!property.is_active && (
                                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                                    ❌ Inactive
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleEdit(property)}
                                className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                              >
                                <FiEdit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(property.id)}
                                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
