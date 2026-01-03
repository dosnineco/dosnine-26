import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { FiStar, FiTrash2, FiEye, FiGrid, FiUsers, FiZap, FiDollarSign, FiClock, FiTrendingUp, FiMail } from 'react-icons/fi';
import { formatJMD, formatMoney } from '../../lib/formatMoney';

export default function AdminDashboard() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('properties');
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [visitorEmails, setVisitorEmails] = useState([]);
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
      setIsAdmin(false);
    }
  };

  const exportEmailsCSV = () => {
    if (visitorEmails.length === 0) {
      toast.error('No emails to export');
      return;
    }

    const headers = ['Email', 'Phone', 'Source', 'Date'];
    const rows = visitorEmails.map(item => [
      item.email,
      item.phone || '',
      item.referrer ? new URL(item.referrer).hostname : 'Direct',
      new Date(item.created_at).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `visitor-emails-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Emails exported successfully!');
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
      } else if (activeTab === 'emails') {
        const { data } = await supabase
          .from('visitor_emails')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000);
        setVisitorEmails(data || []);
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

  const handleDeleteRequest = async (requestId) => {
    if (!confirm('⚠️ DELETE this service request?\n\nThis action cannot be undone!')) return;

    try {
      // Delete associated notifications first
      const { error: notifError } = await supabase
        .from('agent_notifications')
        .delete()
        .eq('service_request_id', requestId);

      if (notifError) {
        console.error('Notification delete error:', notifError);
        // Continue even if notification deletion fails
      }

      // Delete the request
      const { error: requestError } = await supabase
        .from('service_requests')
        .delete()
        .eq('id', requestId);

      if (requestError) {
        console.error('Request delete error:', requestError);
        throw new Error(requestError.message || 'Failed to delete request');
      }

      toast.success('Request deleted successfully');
      setRequests(requests.filter((r) => r.id !== requestId));
      fetchData(); // Refetch data to ensure sync
    } catch (err) {
      console.error('Delete request error:', err);
      toast.error(err.message || 'Failed to delete request');
    }
  };

  const handleDeleteProperty = async (id) => {
    try {
      // Get property to find details
      const property = properties.find(p => p.id === id);
      
      if (!property) {
        toast.error('Property not found');
        return;
      }

      // Check for active boosts
      const { data: activeBoosts } = await supabase
        .from('property_boosts')
        .select('id, amount, boost_end_date')
        .eq('property_id', id)
        .eq('status', 'active')
        .gte('boost_end_date', new Date().toISOString());

      const imageCount = property.image_urls?.length || 0;
      const boostCount = activeBoosts?.length || 0;
      
      // Build detailed confirmation message
      let confirmMessage = `⚠️ PERMANENTLY DELETE PROPERTY?\n\n`;
      confirmMessage += `Title: ${property.title}\n`;
      confirmMessage += `Parish: ${property.parish || 'N/A'}\n`;
      confirmMessage += `Price: ${formatMoney(property.price)}\n\n`;
      confirmMessage += `This action CANNOT be undone!\n\n`;
      confirmMessage += `Will delete:\n`;
      confirmMessage += `- Property record\n`;
      confirmMessage += `- ${imageCount} image(s) from storage\n`;
      
      if (boostCount > 0) {
        const totalBoostRevenue = activeBoosts.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
        confirmMessage += `- ${boostCount} ACTIVE BOOST(S) (${formatJMD(totalBoostRevenue)} revenue)\n`;
        confirmMessage += `\n⚠️ WARNING: This will cancel active boosts!\n`;
      }
      
      confirmMessage += `\nType the property ID to confirm:\n${id}`;

      if (!confirm(confirmMessage)) return;

      // Delete images from storage bucket
      if (property.image_urls && property.image_urls.length > 0) {
        for (const imageUrl of property.image_urls) {
          const urlParts = imageUrl.split('/property-images/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from('property-images').remove([filePath]);
          }
        }
      }

      // Delete active boosts first
      if (boostCount > 0) {
        await supabase
          .from('property_boosts')
          .delete()
          .eq('property_id', id);
      }
      
      // Delete property
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;
      
      toast.success(`Property deleted: ${imageCount} images + ${boostCount} boosts removed`);
      setProperties(properties.filter((p) => p.id !== id));
    } catch (err) {
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
    <>
      <Head>
        <title>Admin Dashboard — Dosnine Properties</title>
      </Head>
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Quick Actions */}
      <div className="mb-4 flex gap-3 flex-wrap">
        <Link 
          href="/properties/my-listings"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium text-sm flex items-center gap-2"
        >
          <FiGrid className="w-4 h-4" />
          All Properties
        </Link>
        <Link 
          href="/properties/bulk-create"
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium text-sm flex items-center gap-2"
        >
          <FiZap className="w-4 h-4" />
          Bulk Create Listings
        </Link>
      </div>

      {/* Simple Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('properties')}
          className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'properties'
              ? 'bg-accent text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <FiGrid size={14} />
          Properties
        </button>
        <Link
          href="/admin/agents"
          className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap text-gray-700 hover:bg-gray-100"
        >
          <FiUsers size={14} />
          Agents
        </Link>
          <Link
          href="/admin/advertisements"
          className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap text-gray-700 hover:bg-gray-100"
        >
          <FiUsers size={14} />
          Advertisements
        </Link>
        <Link
          href="/admin/allocation"
          className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap text-gray-700 hover:bg-gray-100"
        >
          <FiTrendingUp size={14} />
          Allocation
        </Link>
        <Link
          href="/admin/feedback"
          className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap text-gray-700 hover:bg-gray-100"
        >
          <FiTrendingUp size={14} />
          Feedback
        </Link>
        <Link
          href="/admin/requests"
          className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap text-gray-700 hover:bg-gray-100"
        >
          <FiGrid size={14} />
          Requests
        </Link>
        <Link
          href="/admin/users"
          className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap text-gray-700 hover:bg-gray-100"
        >
          <FiUsers size={14} />
          Users
        </Link>
        <Link
          href="/admin/properties"
          className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap text-gray-700 hover:bg-gray-100"
        >
          <FiGrid size={14} />
          Properties
        </Link>
        <Link
          href="/admin/visitor-emails"
          className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap text-gray-700 hover:bg-gray-100"
        >
          <FiMail size={14} />
          Emails
          {visitorEmails.length > 0 && (
            <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-xs ml-1">
              {visitorEmails.length}
            </span>
          )}
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : activeTab === 'emails' ? (
        /* Visitor Emails */
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Visitor Emails</h2>
              <p className="text-gray-600 text-sm mt-1">Total captured: {visitorEmails.length}</p>
            </div>
            <button
              onClick={exportEmailsCSV}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 font-medium flex items-center gap-2"
            >
              <FiGrid size={16} />
              Export CSV
            </button>
          </div>


          {visitorEmails.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-600">No visitor emails captured yet. The popup captures emails from new visitors.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Phone</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Source</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitorEmails.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-gray-900 font-medium truncate">{item.email}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{item.phone || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs truncate">
                          {item.referrer ? new URL(item.referrer).hostname : 'Direct'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'properties' ? (
        /* Mobile-Friendly Property Cards */
        <div className="space-y-3">
          {properties.map((prop) => (
            <div key={prop.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 truncate text-lg">{prop.title || 'Untitled'}</h3>
                  <p className="text-sm text-gray-600">{prop.parish || 'No parish'}</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">{formatMoney(prop.price)}</p>
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
    </>
  );
}
