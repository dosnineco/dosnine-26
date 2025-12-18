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
  const [boosts, setBoosts] = useState([]);
  const [visitorEmails, setVisitorEmails] = useState([]);
  const [boostStats, setBoostStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [agents, setAgents] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
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

  const handleManualAssign = async (requestId, agentId) => {
    setAssignLoading(true);
    try {
      const now = new Date().toISOString();
      
      // Update request
      const { error: updateError } = await supabase
        .from('service_requests')
        .update({
          assigned_agent_id: agentId,
          status: agentId ? 'assigned' : 'open',
          assigned_at: agentId ? now : null,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Update agent timestamp if assigning
      if (agentId) {
        await supabase
          .from('agents')
          .update({ last_request_assigned_at: now })
          .eq('id', agentId);
      }

      toast.success(agentId ? 'Request assigned successfully' : 'Request unassigned');
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Assignment error:', err);
      toast.error('Failed to update request');
    } finally {
      setAssignLoading(false);
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
      } else if (activeTab === 'boosts') {
        // Fetch boosts with property and owner details
        const { data: boostsData } = await supabase
          .from('property_boosts')
          .select(`
            *,
            properties (id, title, slug),
            users:owner_id (id, full_name, email)
          `)
          .order('created_at', { ascending: false });
        setBoosts(boostsData || []);

        // Calculate statistics
        const now = new Date();
        const activeBoosts = (boostsData || []).filter(
          b => b.status === 'active' && new Date(b.boost_end_date) > now
        );
        const expiredBoosts = (boostsData || []).filter(
          b => b.status === 'expired' || (b.status === 'active' && new Date(b.boost_end_date) <= now)
        );
        const totalRevenue = (boostsData || []).reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
        const totalImpressions = (boostsData || []).reduce((sum, b) => sum + (Number(b.impressions) || 0), 0);
        const totalClicks = (boostsData || []).reduce((sum, b) => sum + (Number(b.clicks) || 0), 0);

        // Find boosts expiring in next 7 days
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const expiringSoon = activeBoosts.filter(
          b => new Date(b.boost_end_date) <= sevenDaysFromNow
        );

        setBoostStats({
          total: boostsData?.length || 0,
          active: activeBoosts.length,
          expired: expiredBoosts.length,
          totalRevenue,
          totalImpressions,
          totalClicks,
          expiringSoon: expiringSoon.length,
          avgCTR: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0
        });
      } else if (activeTab === 'emails') {
        const { data } = await supabase
          .from('visitor_emails')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000);
        setVisitorEmails(data || []);
      } else if (activeTab === 'requests') {
        const { data: requestData } = await supabase
          .from('service_requests')
          .select(`
            *,
            agent:agents(
              id, 
              business_name,
              users:user_id(full_name, email)
            )
          `)
          .order('created_at', { ascending: false });
        
        // Transform the data to flatten the nested users object
        const transformedRequests = requestData?.map(request => ({
          ...request,
          agent: request.agent ? {
            id: request.agent.id,
            full_name: request.agent.users?.full_name || request.agent.business_name || 'Unnamed Agent',
            email: request.agent.users?.email || 'No email',
            business_name: request.agent.business_name
          } : null
        }));
        
        setRequests(transformedRequests || []);

        // Fetch all paid agents for assignment dropdown
        const { data: agentData } = await supabase
          .from('agents')
          .select(`
            id, 
            business_name,
            last_request_assigned_at,
            users:user_id(full_name, email)
          `)
          .eq('verification_status', 'approved')
          .eq('payment_status', 'paid')
          .order('last_request_assigned_at', { ascending: true, nullsFirst: true });
        
        // Transform agents data
        const transformedAgents = agentData?.map(agent => ({
          id: agent.id,
          full_name: agent.users?.full_name || agent.business_name || 'Unnamed Agent',
          email: agent.users?.email || 'No email',
          business_name: agent.business_name,
          last_request_assigned_at: agent.last_request_assigned_at
        }));
        
        setAgents(transformedAgents || []);
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

  const handleHardDeleteBoost = async (boostId, propertyId) => {
    if (!confirm('⚠️ PERMANENTLY DELETE this boost record?\n\nThis action CANNOT be undone!\n\n- Boost record will be deleted\n- Property will be unfeatured if no other active boosts exist\n- All analytics data will be lost')) return;
    
    try {
      const { error } = await supabase
        .from('property_boosts')
        .delete()
        .eq('id', boostId);

      if (error) throw error;

      // Check if property has other active boosts
      const { data: remainingBoosts } = await supabase
        .from('property_boosts')
        .select('id')
        .eq('property_id', propertyId)
        .eq('status', 'active')
        .gte('boost_end_date', new Date().toISOString());

      // If no active boosts remain, remove featured flag
      if (!remainingBoosts || remainingBoosts.length === 0) {
        await supabase
          .from('properties')
          .update({ is_featured: false })
          .eq('id', propertyId);
      }

      toast.success('Boost deleted permanently');
      fetchData();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete boost');
    }
  };

  const handleCancelBoost = async (boostId, propertyId) => {
    if (!confirm('Cancel this boost?\n\nThe property will be unfeatured if no other active boosts exist.')) return;
    
    try {
      const { error } = await supabase
        .from('property_boosts')
        .update({ status: 'cancelled' })
        .eq('id', boostId);

      if (error) throw error;

      // Check if property has other active boosts
      const { data: remainingBoosts } = await supabase
        .from('property_boosts')
        .select('id')
        .eq('property_id', propertyId)
        .eq('status', 'active')
        .gte('boost_end_date', new Date().toISOString());

      // If no active boosts remain, remove featured flag
      if (!remainingBoosts || remainingBoosts.length === 0) {
        await supabase
          .from('properties')
          .update({ is_featured: false })
          .eq('id', propertyId);
      }

      toast.success('Boost cancelled');
      fetchData();
    } catch (err) {
      console.error('Cancel error:', err);
      toast.error('Failed to cancel boost');
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
    <>
      <Head>
        <title>Admin Dashboard — Dosnine Properties</title>
      </Head>
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
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
        <button
          onClick={() => setActiveTab('boosts')}
          className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'boosts'
              ? 'bg-accent text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <FiZap size={14} />
          Boosts
          {boostStats?.active > 0 && (
            <span className="bg-yellow-600 text-white px-1.5 py-0.5 rounded-full text-xs ml-1">
              {boostStats.active}
            </span>
          )}
        </button>
        <Link
          href="/admin/agents"
          className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap text-gray-700 hover:bg-gray-100"
        >
          <FiUsers size={14} />
          Agents
        </Link>
        <Link
          href="/admin/allocation"
          className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap text-gray-700 hover:bg-gray-100"
        >
          <FiTrendingUp size={14} />
          Allocation
        </Link>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'requests'
              ? 'bg-accent text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <FiGrid size={14} />
          Requests
          {requests.filter(r => r.status === 'open').length > 0 && (
            <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs ml-1">
              {requests.filter(r => r.status === 'open').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-accent text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <FiUsers size={14} />
          Users
        </button>
        <button
          onClick={() => setActiveTab('emails')}
          className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'emails'
              ? 'bg-accent text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <FiMail size={14} />
          Emails
          {visitorEmails.length > 0 && (
            <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-xs ml-1">
              {visitorEmails.length}
            </span>
          )}
        </button>
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
      ) : activeTab === 'boosts' ? (
        /* Boost Analytics & Management */
        <div>
          {/* Stats Overview */}
          {boostStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiDollarSign size={20} />
                  <span className="text-sm opacity-90">Total Revenue</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatJMD(boostStats.totalRevenue)}
                </div>
                <div className="text-xs opacity-75 mt-1">
                  ~${(boostStats.totalRevenue / 100).toFixed(2)} USD
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiZap size={20} />
                  <span className="text-sm opacity-90">Active Boosts</span>
                </div>
                <div className="text-2xl font-bold">{boostStats.active}</div>
                <div className="text-xs opacity-75 mt-1">
                  of 20 max slots
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiTrendingUp size={20} />
                  <span className="text-sm opacity-90">Performance</span>
                </div>
                <div className="text-2xl font-bold">{boostStats.avgCTR}%</div>
                <div className="text-xs opacity-75 mt-1">
                  Average CTR
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiClock size={20} />
                  <span className="text-sm opacity-90">Expiring Soon</span>
                </div>
                <div className="text-2xl font-bold">{boostStats.expiringSoon}</div>
                <div className="text-xs opacity-75 mt-1">
                  Within 7 days
                </div>
              </div>
            </div>
          )}

          {/* Detailed Stats */}
          {boostStats && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <h3 className="font-bold text-gray-800 mb-3">Analytics Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Boosts:</span>
                  <span className="font-bold text-gray-800 ml-2">{boostStats.total}</span>
                </div>
                <div>
                  <span className="text-gray-600">Expired:</span>
                  <span className="font-bold text-gray-800 ml-2">{boostStats.expired}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Impressions:</span>
                  <span className="font-bold text-gray-800 ml-2">{boostStats.totalImpressions.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Clicks:</span>
                  <span className="font-bold text-gray-800 ml-2">{boostStats.totalClicks.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Boost List */}
          <div className="space-y-3">
            {boosts.map((boost) => {
              const now = new Date();
              const endDate = new Date(boost.boost_end_date);
              const isActive = boost.status === 'active' && endDate > now;
              const isExpired = boost.status === 'expired' || (boost.status === 'active' && endDate <= now);
              const daysRemaining = isActive ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0;
              const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;

              return (
                <div
                  key={boost.id}
                  className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${
                    isActive ? 'border-green-500' : isExpired ? 'border-gray-400' : 'border-orange-500'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Boost Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <FiZap className={`mt-1 flex-shrink-0 ${
                          isActive ? 'text-green-500' : 'text-gray-400'
                        }`} size={20} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-800 truncate">
                            {boost.properties?.title || 'Property Deleted'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Owner: {boost.users?.full_name || 'Unknown'} ({boost.users?.email})
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2 text-xs">
                            <span className={`px-2 py-1 rounded-full font-medium ${
                              isActive ? 'bg-green-100 text-green-800' :
                              boost.status === 'cancelled' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {isActive ? 'Active' : boost.status.charAt(0).toUpperCase() + boost.status.slice(1)}
                            </span>
                            {isExpiringSoon && (
                              <span className="px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-800">
                                Expires in {daysRemaining}d
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-100">
                        <div>
                          <span className="text-xs text-gray-600">Revenue</span>
                          <p className="font-bold text-gray-800">{formatJMD(boost.amount)}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-600">Impressions</span>
                          <p className="font-bold text-gray-800">{(boost.impressions || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-600">Clicks</span>
                          <p className="font-bold text-gray-800">{(boost.clicks || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-600">CTR</span>
                          <p className="font-bold text-gray-800">
                            {boost.impressions > 0 ? ((boost.clicks / boost.impressions) * 100).toFixed(2) : 0}%
                          </p>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">Start:</span> {new Date(boost.boost_start_date).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">End:</span> {new Date(boost.boost_end_date).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Payment ID:</span> {boost.payment_id}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {new Date(boost.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex md:flex-col gap-2 flex-shrink-0">
                      {isActive && (
                        <button
                          onClick={() => handleCancelBoost(boost.id, boost.property_id)}
                          className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-medium text-sm whitespace-nowrap"
                        >
                          Cancel Boost
                        </button>
                      )}
                      <button
                        onClick={() => handleHardDeleteBoost(boost.id, boost.property_id)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm flex items-center gap-2 whitespace-nowrap"
                      >
                        <FiTrash2 size={16} />
                        Hard Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {boosts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No boosts found
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'requests' ? (
        /* Service Requests Management */
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Requests</h2>
            <p className="text-gray-600">All submitted client requests with agent assignments and reassignment options</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 mb-1">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 mb-1">Open</p>
              <p className="text-2xl font-bold text-orange-600">{requests.filter(r => r.status === 'open').length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 mb-1">Assigned</p>
              <p className="text-2xl font-bold text-blue-600">{requests.filter(r => r.status === 'assigned' || r.status === 'in_progress').length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-600">{requests.filter(r => r.status === 'completed').length}</p>
            </div>
          </div>

          {/* Request List */}
          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-600">No service requests yet</p>
              </div>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-gray-800 text-lg">
                          {request.request_type.toUpperCase()} - {request.property_type}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.status === 'open' ? 'bg-orange-100 text-orange-800' :
                          request.status === 'assigned' || request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          request.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status}
                        </span>
                        {request.urgency === 'urgent' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Urgent
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-medium">Client:</span> {request.client_name}
                        </div>
                        <div>
                          <span className="font-medium">Location:</span> {request.location}
                        </div>
                        {request.budget_min && (
                          <div>
                            <span className="font-medium">Budget:</span> ${request.budget_min?.toLocaleString()} - ${request.budget_max?.toLocaleString()}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Date:</span> {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {request.description && (
                        <p className="text-sm text-gray-700 mb-3 bg-gray-50 p-2 rounded">{request.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
                        <span className="text-gray-600">📧 {request.client_email}</span>
                        <span className="text-gray-600">📞 {request.client_phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Agent Assignment Section */}
                  <div className="border-t pt-3 mt-3 bg-gray-50 -mx-4 px-4 -mb-4 pb-4 rounded-b-lg">
                    {request.agent ? (
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Assigned Agent</p>
                          <p className="font-bold text-gray-900 text-lg">{request.agent.full_name}</p>
                          <p className="text-sm text-gray-600">{request.agent.email}</p>
                        </div>
                        <div className="flex gap-2">
                          {request.status !== 'completed' && request.status !== 'cancelled' && (
                            <>
                              <button
                                onClick={() => handleManualAssign(request.id, null)}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
                                disabled={assignLoading}
                              >
                                Unassign
                              </button>
                              <select
                                onChange={(e) => e.target.value && handleManualAssign(request.id, e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none text-sm"
                                disabled={assignLoading}
                                defaultValue=""
                              >
                                <option value="">Reassign to...</option>
                                {agents.filter(a => a.id !== request.agent_id).map((agent) => (
                                  <option key={agent.id} value={agent.id}>
                                    {agent.full_name}
                                  </option>
                                ))}
                              </select>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex  flex-col gap-2">
                        <p className="text-xs font-semibold text-orange-600 uppercase">⚠️ Unassigned Request</p>
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                          <label className="text-sm font-medium text-gray-700">Assign to Agent:</label>
                          <select
                            onChange={(e) => e.target.value && handleManualAssign(request.id, e.target.value)}
                            className="flex-1 px-3 py-2 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-accent outline-none bg-white"
                            disabled={assignLoading}
                            defaultValue=""
                          >
                            <option value="">Select an agent...</option>
                            {agents.map((agent) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.full_name} - {agent.email}
                                {!agent.last_request_assigned_at && ' (Never assigned)'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>      ) : activeTab === 'properties' ? (
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
