import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Bell, MapPin, DollarSign, Home, Calendar, CheckCircle, AlertCircle, Eye } from 'lucide-react';

export default function AgentNotificationCenter() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread
  const [expandedRequest, setExpandedRequest] = useState(null);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      const response = await axios.get(`/api/agents/notifications/${user.id}`);
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Don't show error toast on polling
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`/api/agents/notifications/${user.id}`, {
        notificationId,
        isRead: true,
      });
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
              <Bell className="w-8 h-8 text-blue-600 mr-3" />
              Service Requests
            </h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="text-gray-600">
            Manage incoming service requests from clients looking for your expertise
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {filter === 'unread' ? 'No new requests' : 'No requests yet'}
            </h3>
            <p className="text-gray-600">
              {filter === 'unread'
                ? 'You are all caught up! Check back soon for new client requests.'
                : 'When clients request your services, they will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map(notification => {
              const request = notification.service_requests;
              const isExpanded = expandedRequest === notification.id;

              return (
                <div
                  key={notification.id}
                  className={`bg-white rounded-lg shadow-lg overflow-hidden transition ${
                    !notification.is_read ? 'ring-2 ring-blue-500 border-l-4 border-blue-600' : ''
                  }`}
                >
                  {/* Header */}
                  <div
                    onClick={() => {
                      setExpandedRequest(isExpanded ? null : notification.id);
                      if (!notification.is_read) {
                        markAsRead(notification.id);
                      }
                    }}
                    className="p-6 cursor-pointer hover:bg-gray-50 transition flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-800">
                          {request?.users?.full_name || 'Client'}
                        </h3>
                        {!notification.is_read && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                            New
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Quick Info */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {request?.property_type && (
                          <span className="flex items-center">
                            <Home className="w-4 h-4 mr-1 text-blue-600" />
                            {request.property_type}
                          </span>
                        )}
                        {request?.location && (
                          <span className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1 text-green-600" />
                            {request.location}
                          </span>
                        )}
                        {request?.budget_min && request?.budget_max && (
                          <span className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1 text-purple-600" />
                            JMD {request.budget_min.toLocaleString()} - {request.budget_max.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="ml-4 text-right">
                      <div className="text-2xl cursor-pointer">
                        {isExpanded ? '▼' : '▶'}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-200 p-6 space-y-4">
                      {/* Client Contact Info */}
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-3">Client Contact Information</h4>
                        <div className="space-y-2">
                          {request?.users?.email && (
                            <p className="text-sm text-gray-600">
                              <strong>Email:</strong>{' '}
                              <a href={`mailto:${request.users.email}`} className="text-blue-600 hover:underline">
                                {request.users.email}
                              </a>
                            </p>
                          )}
                          {request?.users?.phone && (
                            <p className="text-sm text-gray-600">
                              <strong>Phone:</strong>{' '}
                              <a href={`tel:${request.users.phone}`} className="text-blue-600 hover:underline">
                                {request.users.phone}
                              </a>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Property Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {request?.bedrooms !== null && (
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Bedrooms</p>
                            <p className="text-lg font-semibold text-gray-800">{request.bedrooms || 'Any'}</p>
                          </div>
                        )}
                        {request?.bathrooms !== null && (
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Bathrooms</p>
                            <p className="text-lg font-semibold text-gray-800">{request.bathrooms || 'Any'}</p>
                          </div>
                        )}
                        {request?.timeline && (
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1 flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Timeline
                            </p>
                            <p className="text-lg font-semibold text-gray-800">
                              {request.timeline === 'urgent' ? '🔴 ASAP' : request.timeline}
                            </p>
                          </div>
                        )}
                        {request?.status && (
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Status</p>
                            <p className="text-lg font-semibold text-gray-800 capitalize">{request.status}</p>
                          </div>
                        )}
                      </div>

                      {/* Requirements */}
                      {request?.requirements && (
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <p className="font-semibold text-gray-800 mb-2">Special Requirements</p>
                          <p className="text-gray-700">{request.requirements}</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => {
                            if (request?.users?.email) {
                              window.location.href = `mailto:${request.users.email}?subject=Property Matching Request`;
                            }
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center"
                        >
                          Contact Client
                        </button>
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className={`flex-1 border-2 px-4 py-2 rounded-lg font-semibold transition ${
                            notification.is_read
                              ? 'border-gray-300 text-gray-700 bg-white'
                              : 'border-green-600 text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {notification.is_read ? '✓ Marked as Read' : 'Mark as Read'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
