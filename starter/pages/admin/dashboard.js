import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { FiStar, FiTrash2, FiEye, FiGrid, FiUsers } from 'react-icons/fi';

export default function AdminDashboard() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('properties');
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('clerk_id', user.id)
        .single();

      if (data?.role !== 'admin') {
        toast.error('Access denied: Admin only');
        setIsAdmin(false);
        // Redirect to home after 1 second
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
        return;
      }

      setIsAdmin(true);
      fetchData();
    } catch (err) {
      console.error('Error checking admin access:', err);
      setIsAdmin(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'properties') {
        const { data } = await supabase
          .from('properties')
          .select('*')
          .order('created_at', { ascending: false });
        setProperties(data || []);
      } else if (activeTab === 'users') {
        const { data } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
        setUsers(data || []);
      }
    } catch (err) {
      toast.error('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleToggleFeatured = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ is_featured: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      setProperties(properties.map(p => 
        p.id === id ? { ...p, is_featured: !currentStatus } : p
      ));
      
      toast.success(currentStatus ? 'Removed from featured' : 'Added to featured');
    } catch (err) {
      toast.error('Failed to update featured status');
    }
  };

  const handleDeleteProperty = async (id) => {
    if (!confirm('Delete this property and all its images?')) return;
    try {
      // Get property to find images
      const property = properties.find(p => p.id === id);
      
      // Delete images from storage bucket
      if (property?.image_urls && property.image_urls.length > 0) {
        for (const imageUrl of property.image_urls) {
          const urlParts = imageUrl.split('/property-images/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from('property-images').remove([filePath]);
          }
        }
      }
      
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Property and images deleted');
      setProperties(properties.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete property');
    }
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
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

      {/* Simple Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('properties')}
          className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'properties'
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FiGrid size={18} />
          Properties
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FiUsers size={18} />
          Users
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : activeTab === 'properties' ? (
        /* Mobile-Friendly Property Cards */
        <div className="space-y-3">
          {properties.map((prop) => (
            <div key={prop.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 truncate text-lg">{prop.title || 'Untitled'}</h3>
                  <p className="text-sm text-gray-600">{prop.parish || 'No parish'}</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">{prop.price} {prop.currency}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 flex-shrink-0">
                  <FiEye size={16} />
                  {prop.views || 0}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleToggleFeatured(prop.id, prop.is_featured)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-1 ${
                    prop.is_featured 
                      ? 'bg-gray-800 text-white hover:bg-gray-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FiStar size={16} />
                  {prop.is_featured ? 'Featured' : 'Feature'}
                </button>
                <button
                  onClick={() => handleDeleteProperty(prop.id)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm flex items-center gap-1"
                >
                  <FiTrash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Simple Users List */
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 truncate">{u.full_name || 'No name'}</h3>
                  <p className="text-sm text-gray-600 truncate">{u.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Joined {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  u.role === 'admin' ? 'bg-gray-800 text-white' :
                  u.role === 'landlord' ? 'bg-gray-200 text-gray-800' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {u.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
