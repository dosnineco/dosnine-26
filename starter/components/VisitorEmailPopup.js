import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

export default function RequestAgentPopup() {
  const { isSignedIn, user } = useUser();

  const [showPopup, setShowPopup] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

 const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: '',
  requestType: '',
  propertyType: 'house',
  parish: '',
  location: '',
  budgetMin: '',
  budgetMax: '',
  bedrooms: '',
  bathrooms: '',
  description: '',
  urgency: 'normal'
});


  /* -----------------------------
     Popup Trigger (3 sec delay)
  ------------------------------*/
  useEffect(() => {
    const hasSubmitted = localStorage.getItem('visitor-lead-submitted');
    if (hasSubmitted) {
      setSubmitted(true);
      return;
    }

    const dismissedUntil = sessionStorage.getItem('agent-popup-dismissed-until');
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) {
      return;
    }

    const timer = setTimeout(() => {
      setShowPopup(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  /* -----------------------------
     Lock body scroll
  ------------------------------*/
  useEffect(() => {
    if (showPopup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [showPopup]);

  /* -----------------------------
     Auto-fill user data
  ------------------------------*/
  useEffect(() => {
    if (isSignedIn && user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.fullName || '',
        email: prev.email || user.emailAddresses?.[0]?.emailAddress || '',
        phone: prev.phone || user.phoneNumbers?.[0]?.phoneNumber || ''
      }));
    }
  }, [isSignedIn, user]);

  /* -----------------------------
     Dismiss (10 min cooldown)
  ------------------------------*/
  const handleDismiss = () => {
    const tenMinutes = Date.now() + (10 * 60 * 1000);
    sessionStorage.setItem('agent-popup-dismissed-until', tenMinutes.toString());
    setShowPopup(false);
  };

  /* -----------------------------
     Input change
  ------------------------------*/
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /* -----------------------------
     Step Navigation
  ------------------------------*/
  const nextStep = () => {
    if (step === 1 && (!formData.name || !formData.email || !formData.phone || !formData.requestType)) {
      toast.error('Please fill required fields');
      return;
    }

    if (step === 2 && (!formData.propertyType || !formData.location)) {
      toast.error('Please fill property type and location');
      return;
    }

    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  /* -----------------------------
     Submit
  ------------------------------*/
  const handleSubmit = async (e) => {
    e.preventDefault();

if (!formData.name || !formData.email || !formData.phone || 
    !formData.requestType || !formData.propertyType || 
    !formData.parish || !formData.location) {
      toast.error('Please fill all required fields');
      return;
    }

    if (formData.requestType === 'rent' && formData.budgetMin && parseInt(formData.budgetMin) < 70000) {
      toast.error('Minimum rental budget is JMD 70,000');
      return;
    }

    if (formData.requestType === 'buy' && formData.budgetMin && parseInt(formData.budgetMin) < 4000000) {
      toast.error('Minimum buy budget is JMD 4,000,000');
      return;
    }

    if (step === 2 && (!formData.propertyType || !formData.parish || !formData.location)) {
      toast.error('Please fill property type, parish and location');
      return;
    }


    setLoading(true);

    try {
        const requestData = {
          client_user_id: null,
          client_name: formData.name,
          client_email: formData.email,
          client_phone: formData.phone,
          request_type: formData.requestType,
          property_type: formData.propertyType,
          parish: formData.parish, // ADD THIS
          location: formData.location,
          budget_min: formData.budgetMin ? parseFloat(formData.budgetMin) : null,
          budget_max: formData.budgetMax ? parseFloat(formData.budgetMax) : null,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
          description: formData.description || null,
          urgency: formData.urgency || 'normal',
          status: 'open'
        };


      const { error } = await supabase
        .from('service_requests')
        .insert(requestData);

      if (error) {
        toast.error(error.message);
        return;
      }

      localStorage.setItem('visitor-lead-submitted', 'true');
      toast.success('Request submitted successfully!');
      setSubmitted(true);
      setShowPopup(false);

    } catch (err) {
      toast.error('Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (!showPopup || submitted) return null;

return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">

    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl relative overflow-y-auto max-h-[90vh]">

      {/* CLOSE BUTTON */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
      >
        <X size={18} />
      </button>

      {/* HEADER */}
      <div className="bg-accent text-white p-8">
        <h2 className="text-2xl font-bold">Connect with an Agent</h2>
        <p className="opacity-90">Get matched with verified professionals</p>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="p-8 space-y-6">

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <div>
              <label className="block font-bold mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                placeholder='eg. John Brown'
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block font-bold mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                placeholder='eg. example@gmail.com'
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block font-bold mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                placeholder='eg. 8761234567'
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block font-bold mb-3">
                What do you need help with? <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                {["buy","rent","sell","lease","valuation"].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, requestType: type }))}
                    className={`p-3 border rounded-lg font-semibold ${
                      formData.requestType === type ? "bg-accent text-white" : ""
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" onClick={nextStep} className="btn-primary w-full">
              Continue
            </button>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <div>
              <label className="block font-bold mb-1">
                Property Type <span className="text-red-500">*</span>
              </label>
              <select
                name="propertyType"
                value={formData.propertyType}
                onChange={handleInputChange}
                className="input"
              >
                <option value="house">House</option>
                <option value="apartment">Apartment</option>
                <option value="land">Land</option>
                <option value="commercial">Commercial</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
  <label className="block font-bold mb-1">
    Parish <span className="text-red-500">*</span>
  </label>

  <select
    name="parish"
    value={formData.parish}
    onChange={handleInputChange}
    className="input"
    required
  >
    <option value="">Select Parish</option>
    {[
      "Kingston",
      "St. Andrew",
      "St. Thomas",
      "Portland",
      "St. Mary",
      "St. Ann",
      "Trelawny",
      "St. James",
      "Hanover",
      "Westmoreland",
      "St. Elizabeth",
      "Manchester",
      "Clarendon",
      "St. Catherine"
    ].map(parish => (
      <option key={parish} value={parish}>
        {parish}
      </option>
    ))}
  </select>
</div>


            <div>
              <label className="block font-bold mb-1">
                Location / Area <span className="text-red-500">*</span>
              </label>
              <input
                placeholder='eg. Patrick City'
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="input"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">
                  Bedrooms
                </label>
                <input
                  type="number"
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleInputChange}
                  placeholder="Bedrooms"
                  className="input"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Bathrooms
                </label>
                <input
                  type="number"
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleInputChange}
                  placeholder="Bathrooms"
                  className="input"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={prevStep} className="flex-1 border py-3 rounded-lg">
                Back
              </button>
              <button type="button" onClick={nextStep} className="flex-1 bg-accent text-white py-3 rounded-lg">
                Continue
              </button>
            </div>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            <label className="block font-bold mb-1">
              Urgency Level
            </label>
            <select
              name="urgency"
              value={formData.urgency}
              onChange={handleInputChange}
              className="input"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <input
              placeholder='Minimum Budget (JMD)'
              type="number"
              name="budgetMin"
              value={formData.budgetMin}
              onChange={handleInputChange}
              className="input"
            />

            <input
              placeholder='Maximum Budget (JMD)'
              type="number"
              name="budgetMax"
              value={formData.budgetMax}
              onChange={handleInputChange}
              className="input"
            />

            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Additional details eg. Monthly income, Occupation"
              className="input"
            />

            <div className="flex gap-4">
              <button type="button" onClick={prevStep} className="flex-1 border py-3 rounded-lg">
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-accent text-white py-3 rounded-lg"
              >
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </>
        )}

      </form>
    </div>
  </div>
);

}
