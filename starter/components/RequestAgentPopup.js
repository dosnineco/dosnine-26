import { useState, useEffect, Fragment } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react';
import { X, Home, MapPin, DollarSign, Bed, Bath, AlertCircle, Send, Shield } from 'lucide-react';

const REQUEST_TYPES = [
  { value: 'buy', label: 'Buy Property' },
  { value: 'rent', label: 'Rent Property' },
  { value: 'sell', label: 'Sell My Property' },
  { value: 'lease', label: 'Lease Property' },
  { value: 'valuation', label: 'Property Valuation' }
];

const PROPERTY_TYPES = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'other', label: 'Other' }
];

const URGENCY_LEVELS = [
  { value: 'low', label: 'Low - Just browsing' },
  { value: 'normal', label: 'Normal - Within a month' },
  { value: 'high', label: 'High - Within 2 weeks' },
  { value: 'urgent', label: 'Urgent - ASAP' }
];

export default function RequestAgentPopup({ isOpen, onClose }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    request_type: 'rent',
    property_type: 'house',
    location: '',
    budget_min: '',
    budget_max: '',
    bedrooms: '',
    bathrooms: '',
    description: '',
    urgency: 'normal'
  });

  useEffect(() => {
    if (user && isOpen) {
      setFormData(prev => ({
        ...prev,
        client_name: user.fullName || '',
        client_email: user.primaryEmailAddress?.emailAddress || ''
      }));
    }
  }, [user, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!consent) {
      toast.error('Please agree to share your information with agents');
      return;
    }

    setLoading(true);

    try {
      if (!formData.client_name || !formData.client_email || !formData.client_phone || !formData.location) {
        toast.error('Please fill in all required fields');
        setLoading(false);
        return;
      }

      const requestData = {
        clerkId: user?.id || null,
        clientName: formData.client_name,
        clientEmail: formData.client_email,
        clientPhone: formData.client_phone,
        requestType: formData.request_type,
        propertyType: formData.property_type,
        location: formData.location,
        budgetMin: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budgetMax: formData.budget_max ? parseFloat(formData.budget_max) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        description: formData.description,
        urgency: formData.urgency
      };

      await axios.post('/api/service-requests/create', requestData);

      toast.success('Request submitted! An agent will contact you soon.');
      onClose();
      
      // Reset form
      setFormData({
        client_name: user?.fullName || '',
        client_email: user?.primaryEmailAddress?.emailAddress || '',
        client_phone: '',
        request_type: 'rent',
        property_type: 'house',
        location: '',
        budget_min: '',
        budget_max: '',
        bedrooms: '',
        bathrooms: '',
        description: '',
        urgency: 'normal'
      });
      setConsent(false);
    } catch (error) {
      const errorMessage = error.response?.data?.details || error.response?.data?.error || 'Failed to submit request';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="bg-accent px-6 py-4 flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <Home className="w-6 h-6" />
                    <Dialog.Title className="text-xl font-bold">
                      Request an Agent
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white hover:bg-white/20 rounded p-1 transition"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
                  {/* Info Banner */}
                  {!isLoaded && (
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded">
                      <p className="text-sm text-blue-700">
                        ℹ️ No account needed - just fill out the form below
                      </p>
                    </div>
                  )}

                  {/* Contact Information */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name <span className="text-accent">*</span>
                        </label>
                        <input
                          type="text"
                          name="client_name"
                          value={formData.client_name}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                          placeholder="John Smith"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email <span className="text-accent">*</span>
                        </label>
                        <input
                          type="email"
                          name="client_email"
                          value={formData.client_email}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                          placeholder="john@example.com"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number <span className="text-accent">*</span>
                        </label>
                        <input
                          type="tel"
                          name="client_phone"
                          value={formData.client_phone}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                          placeholder="+1 (876) 555-0123"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">What are you looking for?</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          I want to... <span className="text-accent">*</span>
                        </label>
                        <select
                          name="request_type"
                          value={formData.request_type}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                        >
                          {REQUEST_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Property Type <span className="text-accent">*</span>
                        </label>
                        <select
                          name="property_type"
                          value={formData.property_type}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                        >
                          {PROPERTY_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="inline w-4 h-4 mr-1" />
                        Location / Parish <span className="text-accent">*</span>
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                        placeholder="Kingston, St. Andrew, etc."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Budget Min
                        </label>
                        <input
                          type="number"
                          name="budget_min"
                          value={formData.budget_min}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                          placeholder="50000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Budget Max 
                        </label>
                        <input
                          type="number"
                          name="budget_max"
                          value={formData.budget_max}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                          placeholder="150000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Details
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                        placeholder="Any specific requirements..."
                      />
                    </div>
                  </div>

                  {/* Consent */}
                  <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="consent"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-1 w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent"
                        required
                      />
                      <label htmlFor="consent" className="text-sm text-gray-700 flex-1">
                        <Shield className="inline w-4 h-4 text-accent mr-1" />
                        I consent to share my contact information with verified agents on this platform. 
                        My information will only be used to help me find a property and will not be sold to third parties.
                        <span className="text-accent ml-1">*</span>
                      </label>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || !consent}
                    className="w-full btn-accent py-3 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Submit Request
                      </>
                    )}
                  </button>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
