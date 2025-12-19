import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

export default function PropertyAgentRequest({ property, isOpen, onClose }) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.fullName || '',
    email: user?.primaryEmailAddress?.emailAddress || '',
    phone: '',
    message: '',
    agreeToContact: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.agreeToContact) {
      toast.error('Please agree to be contacted');
      return;
    }

    setLoading(true);

    try {
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', property.owner_id)
        .single();

      if (agentError && agentError.code !== 'PGRST116') {
        console.error('Error looking up agent:', agentError);
      }

      const agentId = agentData?.id || null;

      let propertyType = 'house';
      const titleLower = property.title.toLowerCase();
      
      if (titleLower.includes('apartment') || titleLower.includes('apt')) {
        propertyType = 'apartment';
      } else if (titleLower.includes('land') || titleLower.includes('lot')) {
        propertyType = 'land';
      } else if (titleLower.includes('commercial') || titleLower.includes('office') || titleLower.includes('warehouse')) {
        propertyType = 'commercial';
      }

      // Map property listing type to request_type
      // If property is for 'sale', request is to 'buy'
      // If property is for 'rent', request is to 'rent'
      const requestType = property.type === 'sale' ? 'buy' : 'rent';

      const requestPayload = {
        client_name: formData.name,
        client_email: formData.email,
        client_phone: formData.phone,
        request_type: requestType,
        property_type: propertyType,
        location: `${property.town}, ${property.parish}`,
        budget_min: property.price,
        budget_max: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        description: formData.message || `Interested in: ${property.title}`,
        urgency: 'normal',
        status: agentId ? 'assigned' : 'open',
        assigned_agent_id: agentId,
      };

      const { data: request, error: requestError } = await supabase
        .from('service_requests')
        .insert([requestPayload])
        .select()
        .single();

      if (requestError) {
        console.error('Service request error:', requestError);
        
        if (requestError.code === 'PGRST116') {
          throw new Error('Unable to create request. Please try again.');
        } else if (requestError.code === '42501') {
          throw new Error('Permission denied. Please ensure you are logged in.');
        } else {
          throw new Error(requestError.message || 'Failed to submit request');
        }
      }

      if (agentId && request) {
        const { error: notificationError } = await supabase
          .from('agent_notifications')
          .insert([{
            agent_id: agentId,
            notification_type: 'new_request',
            message: `New Property Inquiry: ${formData.name} is interested in ${property.title}`,
            service_request_id: request.id,
            is_read: false,
          }]);

        if (notificationError) {
          console.error('Notification error:', notificationError);
        }
      }

      toast.success('Request sent successfully! The agent will contact you soon.');
      onClose();
    } catch (error) {
      console.error('Request submission error:', error);
      toast.error(error.message || 'Failed to send request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Request Property Information</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-1">{property.title}</h3>
            <p className="text-sm text-gray-600">
              {property.town}, {property.parish} • {property.bedrooms} bed, {property.bathrooms} bath
            </p>
            <p className="text-lg font-bold text-accent mt-2">
              {property.currency} {property.price?.toLocaleString()}
              {property.type === 'rent' ? '/mo' : ''}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="+1 876 555-1234"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Message (Optional)
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
              placeholder="Any questions or special requests..."
            />
          </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              id="agreeToContact"
              checked={formData.agreeToContact}
              onChange={(e) => setFormData({ ...formData, agreeToContact: e.target.checked })}
              className="mt-1 w-4 h-4 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="agreeToContact" className="ml-3 text-sm text-gray-700">
              I agree to be contacted by the agent regarding this property via phone, email, or WhatsApp. *
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-dark transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
