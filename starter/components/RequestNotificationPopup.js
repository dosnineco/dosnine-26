import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Bell, X, User, Mail, Phone, MapPin, DollarSign } from 'lucide-react';

export default function RequestNotificationPopup() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [currentNotif, setCurrentNotif] = useState(null);

  useEffect(() => {
    if (!user) return;
    
    // Check for new requests every 30 seconds
    const interval = setInterval(checkNewRequests, 30000);
    checkNewRequests(); // Initial check
    
    return () => clearInterval(interval);
  }, [user]);

  async function checkNewRequests() {
    try {
      const response = await axios.get('/api/agent/requests', {
        params: { clerkId: user.id, status: 'open' }
      });

      const newRequests = response.data.requests || [];
      
      // Check if there are new requests since last check
      const lastCheckTime = localStorage.getItem('last_request_check');
      const now = new Date().getTime();
      
      if (lastCheckTime) {
        const recentRequests = newRequests.filter(r => 
          new Date(r.created_at).getTime() > parseInt(lastCheckTime)
        );
        
        if (recentRequests.length > 0) {
          // Show notification for the most recent one
          setCurrentNotif(recentRequests[0]);
          setShowPopup(true);
          toast.success(`New client request received!`, {
            icon: '🔔',
            duration: 5000
          });
        }
      }
      
      localStorage.setItem('last_request_check', now.toString());
    } catch (error) {
      console.error('Failed to check requests:', error);
    }
  }

  function closePopup() {
    setShowPopup(false);
    setCurrentNotif(null);
  }

  if (!showPopup || !currentNotif) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden animate-bounce-in">
        {/* Header */}
        <div className="bg-accent text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 animate-pulse" />
            <h3 className="text-xl font-bold">New Client Request!</h3>
          </div>
          <button
            onClick={closePopup}
            className="text-white hover:bg-white/20 rounded p-1 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-accent/5 border-l-4 border-accent p-4 rounded">
            <p className="text-sm text-gray-600 mb-1">Request Type</p>
            <p className="font-bold text-lg text-gray-900">
              {currentNotif.request_type?.toUpperCase()} - {currentNotif.property_type}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-accent" />
              Client Information
            </h4>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Name:</span>
                <span className="text-gray-900">{currentNotif.client_name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <a 
                  href={`mailto:${currentNotif.client_email}`}
                  className="text-accent hover:underline"
                >
                  {currentNotif.client_email}
                </a>
              </div>
              
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <a 
                  href={`tel:${currentNotif.client_phone}`}
                  className="text-accent hover:underline"
                >
                  {currentNotif.client_phone}
                </a>
              </div>

              {currentNotif.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{currentNotif.location}</span>
                </div>
              )}

              {(currentNotif.budget_min || currentNotif.budget_max) && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">
                    ${currentNotif.budget_min?.toLocaleString()} - ${currentNotif.budget_max?.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {currentNotif.description && (
              <div>
                <p className="font-medium text-gray-700 mb-1">Additional Details:</p>
                <p className="text-gray-600 text-sm">{currentNotif.description}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={closePopup}
              className="flex-1 btn-accent-outline"
            >
              View Later
            </button>
            <a
              href={`tel:${currentNotif.client_phone}`}
              className="flex-1 btn-accent text-center flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Call Now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
