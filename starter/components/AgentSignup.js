import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CheckCircle, AlertCircle, Upload, MapPin, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PARISHES } from '@/lib/normalizeParish';

const SPECIALIZATIONS = [
  'Residential',
  'Commercial',
  'Land',
  'Luxury',
  'Investment Properties',
  'Rentals',
  'First-time Buyers',
  'Corporate Housing',
];

export default function AgentSignup() {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Info, 2: Verification, 3: Confirmation
  const [loading, setLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [agentData, setAgentData] = useState(null);

  // Redirect verified agents with valid plans to dashboard
  useEffect(() => {
    const checkAgentStatus = async () => {
      if (!user?.id) return;
      try {
        const { data } = await axios.get('/api/user/profile', {
          params: { clerkId: user.id }
        });
        if (data?.agent) {
          setAgentData(data.agent);
          const validPlans = ['free', '7-day', '30-day', '90-day'];
          const isVerified = data.agent.verification_status === 'approved';
          const hasValidPlan = validPlans.includes(data.agent.payment_status);
          if (isVerified && hasValidPlan) {
            router.replace('/agent/dashboard');
          }
        }
      } catch (error) {
        console.log('Agent status check failed:', error);
      }
    };
    checkAgentStatus();
  }, [user, router]);

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.primaryEmailAddress?.emailAddress || '',
    phone: '',
    businessName: '',
    yearsExperience: '',
    specializations: [],
    licenseNumber: '',
    serviceAreas: [], // array of parishes
    aboutMe: '',
    profileImageUrl: '',
    dealsClosedCount: 0,
  });

  const [verification, setVerification] = useState({
    agentLicenseFile: null,
    businessRegistrationFile: null,
    agreeToTerms: false,
    dataConsent: false,
  });

  const handleSpecializationToggle = (spec) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec]
    }));
  };

  const handleServiceAreaToggle = (parish) => {
    setFormData(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.includes(parish)
        ? prev.serviceAreas.filter(p => p !== parish)
        : [...prev.serviceAreas, parish]
    }));
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type - only images allowed
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG and PNG images are allowed');
      return;
    }
    
    // Check file size - 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    
    setVerification(prev => ({
      ...prev,
      [fileType]: file,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 1) {
      if (!formData.fullName || !formData.phone || !formData.businessName || !formData.yearsExperience) {
        toast.error('Please fill all required fields');
        return;
      }
      if (formData.specializations.length === 0) {
        toast.error('Please select at least one specialization');
        return;
      }
      if (formData.serviceAreas.length === 0) {
        toast.error('Please select at least one service area');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!verification.agentLicenseFile || !verification.businessRegistrationFile) {
        toast.error('Please upload both required documents');
        return;
      }
      if (!verification.agreeToTerms) {
        toast.error('Please agree to terms and conditions');
        return;
      }
      if (!verification.dataConsent) {
        toast.error('Please consent to data sharing with clients');
        return;
      }
      setStep(3);
      return;
    }

    // Step 3: Submit application
    if (step === 3) {
      setLoading(true);

      // Upload files directly to Supabase (simpler approach)
      let licenseUrl = null;
      let registrationUrl = null;

      try {
        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        console.log('Uploading documents for user:', user.id);

        // Upload license directly
        const licenseExt = verification.agentLicenseFile.name.split('.').pop();
        const licenseName = `${user.id}_license_${Date.now()}.${licenseExt}`;
        
        const { error: licenseError } = await supabase.storage
          .from('agent-documents')
          .upload(licenseName, verification.agentLicenseFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (licenseError) {
          console.error('License upload error:', licenseError);
          throw new Error(`License upload failed: ${licenseError.message}`);
        }
        
        licenseUrl = licenseName;
        console.log('License uploaded:', licenseName);

        // Upload registration directly
        const regExt = verification.businessRegistrationFile.name.split('.').pop();
        const regName = `${user.id}_registration_${Date.now()}.${regExt}`;
        
        const { error: regError } = await supabase.storage
          .from('agent-documents')
          .upload(regName, verification.businessRegistrationFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (regError) {
          console.error('Registration upload error:', regError);
          throw new Error(`Registration upload failed: ${regError.message}`);
        }
        
        registrationUrl = regName;
        console.log('Registration uploaded:', regName);

      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        console.error('Upload error details:', uploadError.response?.data || uploadError.message);
        const errorMsg = uploadError.response?.data?.error || uploadError.message || 'Unknown error';
        toast.error(`Failed to upload documents: ${errorMsg}`);
        setLoading(false);
        return;
      }

      // Now submit data to API
      try {
        const response = await axios.post('/api/agents/signup', {
          userId: user?.id,
          clerkId: user?.id,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          businessName: formData.businessName,
          yearsExperience: parseInt(formData.yearsExperience),
          specializations: formData.specializations,
          licenseNumber: formData.licenseNumber,
          serviceAreas: formData.serviceAreas,
          aboutMe: formData.aboutMe,
          dealsClosedCount: parseInt(formData.dealsClosedCount) || 0,
          dataConsent: verification.dataConsent,
          licenseFileUrl: licenseUrl,
          registrationFileUrl: registrationUrl,
        });

        if (response.data.success) {
          setSignupComplete(true);
          toast.success('Agent signup successful! Our team will review your application.');
        } else {
          toast.error(response.data.error || 'Failed to complete signup');
        }
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to complete signup');
      } finally {
        setLoading(false);
      }
    }
  }

  if (signupComplete) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for applying to become a verified agent. Our team will review your application within 24-48 hours and notify you via email.
          </p>
          <div className="bg-accent/10 border border-accent/20 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-900 font-semibold">
              What happens next:
            </p>
            <ul className="text-sm text-gray-700 space-y-2 mt-3 text-left">
              <li>✓ Document verification</li>
              <li>✓ License confirmation</li>
              <li>✓ Profile approval and payment</li>
              <li>✓ Agent dashboard access</li>
              <li>✓ Start receiving client requests</li>
            </ul>
          </div>
          <a
            href="/dashboard"
            className="inline-block w-full btn-accent px-4 py-2 rounded-lg font-semibold transition"
          >
            Dashboard
          </a>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition ${
                    s <= step
                      ? 'bg-accent text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition ${
                      s < step ? 'bg-accent' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-2">
            <span>Basic Info</span>
            <span>Verification</span>
            <span>Review</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Agent Registration</h2>
              <p className="text-gray-600">Let's start with your basic information</p>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  placeholder="Your full name"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">Linked to your account</p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  placeholder="Your business name"
                  required
                />
              </div>

              {/* Years of Experience */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Years of Experience *
                </label>
                <select
                  value={formData.yearsExperience}
                  onChange={(e) => setFormData({ ...formData, yearsExperience: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  required
                >
                  <option value="">Select years</option>
                  <option value="1">0-1 years</option>
                  <option value="2">1-2 years</option>
                  <option value="5">2-5 years</option>
                  <option value="10">5-10 years</option>
                  <option value="15">10+ years</option>
                </select>
              </div>

              {/* Specializations */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Specializations * (Select at least one)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SPECIALIZATIONS.map(spec => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => handleSpecializationToggle(spec)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        formData.specializations.includes(spec)
                          ? 'bg-accent text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>

              {/* License Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Real Estate License Number
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  placeholder="Your license number"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Verify at <a href="https://reb.gov.jm/search-public-register/dealer" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Jamaica Real Estate Board</a>
                </p>
              </div>

              {/* Service Areas */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Service Areas (Parishes/Regions) * (Select at least one)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PARISHES.map(parish => (
                    <button
                      key={parish}
                      type="button"
                      onClick={() => handleServiceAreaToggle(parish)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        formData.serviceAreas.includes(parish)
                          ? 'bg-accent text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {parish}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Select the parishes you serve</p>
              </div>

              {/* About Me */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  About You
                </label>
                <textarea
                  value={formData.aboutMe}
                  onChange={(e) => setFormData({ ...formData, aboutMe: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  placeholder="Tell us about yourself and your experience..."
                  rows={4}
                />
              </div>

              {/* Deals Closed */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Deals Closed (Approximate)
                </label>
                <input
                  type="number"
                  value={formData.dealsClosedCount}
                  onChange={(e) => setFormData({ ...formData, dealsClosedCount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          )}

          {/* Step 2: Verification Documents */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Document Verification</h2>
              <p className="text-gray-600">Please upload documents to verify your credentials</p>

              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 flex items-start">
                <AlertCircle className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  Upload clear images of your agent license and business registration (or government ID if no company). Files must be JPG or PNG and under 5MB.
                </p>
              </div>
              {/* Agent License */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Real Estate Agent License *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition cursor-pointer"
                  onClick={() => document.getElementById('license-file').click()}
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">
                    {verification.agentLicenseFile
                      ? verification.agentLicenseFile.name
                      : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500">JPG, PNG • Max 5MB</p>
                  <input
                    id="license-file"
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    onChange={(e) => handleFileChange(e, 'agentLicenseFile')}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Business Registration */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Business Registration or Government ID *
                </label>
                <p className="text-xs text-gray-600 mb-2">
                  Upload your business registration document or government-issued ID if you operate as an individual.
                </p>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition cursor-pointer"
                  onClick={() => document.getElementById('registration-file').click()}
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">
                    {verification.businessRegistrationFile
                      ? verification.businessRegistrationFile.name
                      : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500">JPG, PNG • Max 5MB</p>
                  <input
                    id="registration-file"
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    onChange={(e) => handleFileChange(e, 'businessRegistrationFile')}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-3">
                <div className="flex items-start">
                  <input
                    id="agree-terms"
                    type="checkbox"
                    checked={verification.agreeToTerms}
                    onChange={(e) => setVerification({ ...verification, agreeToTerms: e.target.checked })}
                    className="mt-1 w-4 h-4 border-gray-300 rounded focus:ring-accent cursor-pointer"
                  />
                  <label htmlFor="agree-terms" className="ml-3 text-sm text-gray-700">
                    I agree to the <a href="/terms-of-service" target="_blank" className="text-blue-600 hover:underline">Agent Terms and Conditions</a> *
                  </label>
                </div>
                
                <div className="flex items-start bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <input
                    id="data-consent"
                    type="checkbox"
                    checked={verification.dataConsent}
                    onChange={(e) => setVerification({ ...verification, dataConsent: e.target.checked })}
                    className="mt-1 w-4 h-4 border-gray-300 rounded focus:ring-accent cursor-pointer"
                  />
                  <label htmlFor="data-consent" className="ml-3 text-sm text-gray-700">
                    <strong className="text-red-600">* REQUIRED:</strong> I consent to sharing my contact information (name, phone, email) and business details with clients who request my services through this platform. I understand that clients will be able to contact me directly. Read our full <a href="/privacy-policy" target="_blank" className="text-blue-600 hover:underline">Privacy Policy</a> for details on how your data is used and shared. *
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Review Your Application</h2>
              <p className="text-gray-600">Please review your information before submitting</p>

              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs uppercase font-semibold text-gray-500">Full Name</p>
                  <p className="text-gray-800">{formData.fullName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-semibold text-gray-500">Email</p>
                  <p className="text-gray-800">{formData.email}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-semibold text-gray-500">Phone</p>
                  <p className="text-gray-800">{formData.phone}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-semibold text-gray-500">Business Name</p>
                  <p className="text-gray-800">{formData.businessName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-semibold text-gray-500">Experience</p>
                  <p className="text-gray-800">{formData.yearsExperience} years</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-semibold text-gray-500">Specializations</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {formData.specializations.map(spec => (
                      <span key={spec} className="bg-accent/20 text-accent text-xs px-2 py-1 rounded">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase font-semibold text-gray-500">Service Areas</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {formData.serviceAreas.length > 0 ? (
                      formData.serviceAreas.map(area => (
                        <span key={area} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                          {area}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">Not specified</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">
                  ✓ Documents uploaded: {verification.agentLicenseFile && verification.businessRegistrationFile ? '2/2' : '0/2'}
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex-1 border border-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 text-white px-6 py-3 rounded-lg font-semibold transition ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'btn-accent'
              }`}
            >
              {loading ? 'Processing...' : step === 3 ? 'Submit Application' : 'Next'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
