import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiPlusCircle, FiEye, FiTrash2, FiMapPin, FiZap } from 'react-icons/fi';
import { formatMoney } from '../../lib/formatMoney';

export default function MyPropertiesPage() {
  const { user, isLoaded } = useUser();
  const { getToken, isLoaded: authLoaded, userId } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user || !authLoaded || !userId) return;
    fetchProperties();
  }, [isLoaded, user, authLoaded, userId]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch('/api/properties/mine', {
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const payload = await response.json();
      if (response.status === 401) {
        toast.error('Session expired. Please sign in again.');
        window.location.href = '/sign-in';
        return;
      }
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch properties');
      }
      setProperties(payload.properties || []);
    } catch (err) {
      console.error('Error fetching properties:', err);
      toast.error('Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    try {
      const token = await getToken();
      const response = await fetch('/api/properties/delete', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id }),
      });
      const payload = await response.json();
      if (response.status === 401) {
        toast.error('Session expired. Please sign in again.');
        window.location.href = '/sign-in';
        return;
      }
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to delete property');
      }
      
      toast.success('Property and images deleted');
      setProperties(properties.filter((p) => p.id !== id));
    } catch (err) {
      toast.error('Failed to delete property');
    }
  };

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-lg">Loading...</div>
      </div>
    );
  }

  // Dynamic page title based on property count
  const pageTitle = properties.length > 0 
    ? `My Properties (${properties.length})` 
    : 'My Properties';

  return (
  <div className="container mx-auto px-4 py-8 max-w-6xl">
  {/* Header */}
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8">
    <h1 className="text-3xl font-semibold text-gray-900">{pageTitle}</h1>
    <div className="flex gap-3">
      <Link 
        href="/properties/new" 
        className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 transition"
      >
        <FiPlusCircle size={18} />
        Add Property
      </Link>
      <Link 
        href="/properties/bulk-create" 
        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition"
      >
        <FiPlusCircle size={18} />
        Bulk Add
      </Link>
    </div>
  </div>

  {loading ? (
    <div className="text-center py-12 text-gray-500">Loading...</div>
  ) : properties.length === 0 ? (
    <div className="text-center py-16 bg-gray-50 rounded-lg border">
      <p className="text-gray-600 text-lg mb-4">You haven't posted any properties yet</p>
      <Link 
        href="/properties/new" 
        className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition"
      >
        Add Your First Property
      </Link>
    </div>
  ) : (
    <div className="space-y-6">
      {properties.map((property) => {
        const firstImage = property.image_urls?.[0] || property.property_images?.[0]?.image_url;
        
        return (
          <div key={property.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
            <div className="flex flex-col sm:flex-row">
              {/* Image */}
              <div className="w-full sm:w-56 h-48 sm:h-auto bg-gray-100 flex-shrink-0">
                {firstImage ? (
                  <img 
                    src={firstImage} 
                    alt={property.title} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    No image
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{property.title}</h3>
                    <p className="text-gray-600 flex items-center gap-1 mt-1">
                      <FiMapPin size={14} />
                      {property.town}{property.parish && `, ${property.parish}`}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {formatMoney(property.price)} 
                      <span className="text-lg font-normal text-gray-500"> /mo</span>
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-5">
                  <span className="flex items-center gap-1">
                    <FiEye size={14} />
                    {property.views || 0} views
                  </span>
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                    {property.status || 'available'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-3 flex-wrap">
                  <Link 
                    href={`/property/${property.slug}`} 
                    className="flex-1 sm:flex-none bg-gray-900 text-white text-center px-5 py-2.5 rounded-lg hover:bg-gray-800 transition text-sm font-medium"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(property.id)}
                    className="flex-1 sm:flex-none bg-gray-100 text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-200 transition text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <FiTrash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>



  );
}
