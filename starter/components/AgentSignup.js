import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CheckCircle, AlertCircle, Upload, MapPin, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PARISHES } from '@/lib/normalizeParish';

/* ----------------------------------------------------------
 * Dosnine UI tokens
 * ---------------------------------------------------------- */
const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:bg-slate-50 disabled:text-slate-500';

const labelClass =
  'block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5';

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
  const { getToken } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [agentData, setAgentData] = useState(null);

  useEffect(() => {
    const checkAgentStatus = async () => {
      if (!user?.id) return;
      try {
        const token = await getToken();
        const { data } = await axios.get('/api/user/profile', {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
  }, [user, router, getToken]);

  useEffect(() => {
    const loadProfileData = async () => {
      if (!user?.id) return;

      try {
        const token = await getToken();
        const { data } = await axios.get('/api/user/profile', {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!data) return;

        const profileFullName = data.full_name || data.fullName || user.fullName || '';
        const profileEmail =
          data.email ||
          user?.primaryEmailAddress?.emailAddress ||
          user?.emailAddresses?.[0]?.emailAddress ||
          '';
        const profilePhone = data.phone || '';

        setFormData((prev) => ({
          ...prev,
          fullName: prev.fullName || profileFullName || '',
          email: prev.email || profileEmail || '',
          phone: prev.phone || profilePhone || '',
        }));
      } catch (error) {
        console.log('User profile lookup failed for signup prefill:', error);
      }
    };

    loadProfileData();
  }, [user, getToken]);

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email:
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      '',
    phone: '',
    businessName: '',
    yearsExperience: '',
    specializations: [],
    licenseNumber: '',
    serviceAreas: [],
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
    setFormData((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter((s) => s !== spec)
        : [...prev.specializations, spec],
    }));
  };

  const handleServiceAreaToggle = (parish) => {
    setFormData((prev) => ({
      ...prev,
      serviceAreas: prev.serviceAreas.includes(parish)
        ? prev.serviceAreas.filter((p) => p !== parish)
        : [...prev.serviceAreas, parish],
    }));
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG and PNG images are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setVerification((prev) => ({
      ...prev,
      [fileType]: file,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (step === 1) {
      if (
        !formData.fullName ||
        !formData.phone ||
        !formData.businessName ||
        !formData.yearsExperience
      ) {
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

    if (step === 3) {
      setLoading(true);

      let licenseUrl = null;
      let registrationUrl = null;

      try {
        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        console.log('Uploading documents for user:', user.id);

        const licenseExt = verification.agentLicenseFile.name.split('.').pop();
        const licenseName = `${user.id}_license_${Date.now()}.${licenseExt}`;

        const { error: licenseError } = await supabase.storage
          .from('agent-documents')
          .upload(licenseName, verification.agentLicenseFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (licenseError) {
          console.error('License upload error:', licenseError);
          throw new Error(`License upload failed: ${licenseError.message}`);
        }

        licenseUrl = licenseName;
        console.log('License uploaded:', licenseName);

        const regExt = verification.businessRegistrationFile.name.split('.').pop();
        const regName = `${user.id}_registration_${Date.now()}.${regExt}`;

        const { error: regError } = await supabase.storage
          .from('agent-documents')
          .upload(regName, verification.businessRegistrationFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (regError) {
          console.error('Registration upload error:', regError);
          throw new Error(`Registration upload failed: ${regError.message}`);
        }

        registrationUrl = regName;
        console.log('Registration uploaded:', regName);
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        console.error(
          'Upload error details:',
          uploadError.response?.data || uploadError.message
        );
        const errorMsg =
          uploadError.response?.data?.error || uploadError.message || 'Unknown error';
        toast.error(`Failed to upload documents: ${errorMsg}`);
        setLoading(false);
        return;
      }

      try {
        const token = await getToken();
        const response = await axios.post(
          '/api/agents/signup',
          {
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
          },
          {
            withCredentials: true,
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );

        if (response.data.success) {
          toast.success(
            'Agent signup successful! Our team will review your application.'
          );
          router.replace('/dashboard');
        } else {
          toast.error(response.data.error || 'Failed to complete signup');
        }
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to complete signup');
      } finally {
        setLoading(false);
      }
    }
  };

  /* ----------------------------------------------------------
   * Pending review state
   * ---------------------------------------------------------- */
  if (agentData?.verification_status === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-8">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertCircle size={20} />
          </span>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Agent Application
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Verification pending
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your agent application is submitted and currently under review. We
            will notify you within 24–48 hours.
          </p>

          <div className="mt-5 rounded-xl border border-accent/30 bg-accent/10 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              What happens next
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {[
                'Document verification',
                'License confirmation',
                'Approval notification',
                'Payment activation',
                'Agent dashboard access',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle
                    size={14}
                    className="mt-0.5 shrink-0 text-accent"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/dashboard"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent/90"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------
   * Main form
   * ---------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-slate-50 px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Agent Registration
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Become a Dosnine agent
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Three short steps — your details, your documents, and a final review.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-1 items-center">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                    s <= step
                      ? 'bg-accent text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 rounded-full transition ${
                      s < step ? 'bg-accent' : 'bg-slate-100'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[11px] font-semibold uppercase tracking-wider">
            <span className={step >= 1 ? 'text-accent' : 'text-slate-400'}>
              Basic Info
            </span>
            <span className={step >= 2 ? 'text-accent' : 'text-slate-400'}>
              Verification
            </span>
            <span className={step >= 3 ? 'text-accent' : 'text-slate-400'}>
              Review
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
        >
          {/* ============================================================
              Step 1: Basic information
             ============================================================ */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Your details
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Let&apos;s start with your basic information.
                </p>
              </div>

              {/* Full name */}
              <div>
                <label className={labelClass}>Full name *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Your full name"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className={labelClass}>Email address</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Linked to your account
                </p>
              </div>

              {/* Phone */}
              <div>
                <label className={labelClass}>Phone number *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className={inputClass}
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </div>

              {/* Business name */}
              <div>
                <label className={labelClass}>Business name *</label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) =>
                    setFormData({ ...formData, businessName: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Your business name"
                  required
                />
              </div>

              {/* Years of experience */}
              <div>
                <label className={labelClass}>Years of experience *</label>
                <select
                  value={formData.yearsExperience}
                  onChange={(e) =>
                    setFormData({ ...formData, yearsExperience: e.target.value })
                  }
                  className={inputClass}
                  required
                >
                  <option value="">Select years</option>
                  <option value="1">0–1 years</option>
                  <option value="2">1–2 years</option>
                  <option value="5">2–5 years</option>
                  <option value="10">5–10 years</option>
                  <option value="15">10+ years</option>
                </select>
              </div>

              {/* Specializations */}
              <div>
                <label className={labelClass}>
                  Specializations * · select at least one
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {SPECIALIZATIONS.map((spec) => {
                    const selected = formData.specializations.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => handleSpecializationToggle(spec)}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                          selected
                            ? 'border-accent bg-accent text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-accent'
                        }`}
                      >
                        {spec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* License number */}
              <div>
                <label className={labelClass}>
                  Real estate license number
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, licenseNumber: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Your license number"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Verify at{' '}
                  <a
                    href="https://reb.gov.jm/search-public-register/dealer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-accent hover:text-accent/80"
                  >
                    Jamaica Real Estate Board
                  </a>
                </p>
              </div>

              {/* Service areas */}
              <div>
                <label className={labelClass}>
                  Service areas * · select at least one
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PARISHES.map((parish) => {
                    const selected = formData.serviceAreas.includes(parish);
                    return (
                      <button
                        key={parish}
                        type="button"
                        onClick={() => handleServiceAreaToggle(parish)}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                          selected
                            ? 'border-accent bg-accent text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-accent'
                        }`}
                      >
                        {parish}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Select the parishes you serve
                </p>
              </div>

              {/* About me */}
              <div>
                <label className={labelClass}>About you</label>
                <textarea
                  value={formData.aboutMe}
                  onChange={(e) =>
                    setFormData({ ...formData, aboutMe: e.target.value })
                  }
                  className={`${inputClass} resize-none`}
                  placeholder="Tell us about yourself and your experience…"
                  rows={4}
                />
              </div>

              {/* Deals closed */}
              <div>
                <label className={labelClass}>
                  Deals closed · approximate
                </label>
                <input
                  type="number"
                  value={formData.dealsClosedCount}
                  onChange={(e) =>
                    setFormData({ ...formData, dealsClosedCount: e.target.value })
                  }
                  className={inputClass}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          )}

          {/* ============================================================
              Step 2: Documents
             ============================================================ */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Document verification
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Upload documents to verify your credentials.
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 p-3.5">
                <AlertCircle
                  size={16}
                  className="mt-0.5 shrink-0 text-accent"
                />
                <p className="text-xs leading-relaxed text-slate-700">
                  Upload clear images of your agent license and business
                  registration (or government ID if no company). Files must be
                  JPG or PNG and under 5MB.
                </p>
              </div>

              {/* Agent license */}
              <div>
                <label className={labelClass}>
                  Real estate agent license *
                </label>
                <UploadDropzone
                  id="license-file"
                  file={verification.agentLicenseFile}
                  onPick={() =>
                    document.getElementById('license-file').click()
                  }
                  onChange={(e) => handleFileChange(e, 'agentLicenseFile')}
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                />
              </div>

              {/* Business registration */}
              <div>
                <label className={labelClass}>
                  Business registration or government ID *
                </label>
                <p className="mb-2 text-xs text-slate-500">
                  Upload your business registration document or
                  government-issued ID if you operate as an individual.
                </p>
                <UploadDropzone
                  id="registration-file"
                  file={verification.businessRegistrationFile}
                  onPick={() =>
                    document.getElementById('registration-file').click()
                  }
                  onChange={(e) =>
                    handleFileChange(e, 'businessRegistrationFile')
                  }
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                />
              </div>

              {/* Terms + consent */}
              <div className="space-y-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-slate-300">
                  <input
                    id="agree-terms"
                    type="checkbox"
                    checked={verification.agreeToTerms}
                    onChange={(e) =>
                      setVerification({
                        ...verification,
                        agreeToTerms: e.target.checked,
                      })
                    }
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/20"
                  />
                  <span className="text-sm text-slate-700">
                    I agree to the{' '}
                    <a
                      href="/terms-of-service"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-accent hover:text-accent/80"
                    >
                      Agent Terms and Conditions
                    </a>{' '}
                    *
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                  <input
                    id="data-consent"
                    type="checkbox"
                    checked={verification.dataConsent}
                    onChange={(e) =>
                      setVerification({
                        ...verification,
                        dataConsent: e.target.checked,
                      })
                    }
                    className="mt-0.5 h-4 w-4 rounded border-amber-300 text-accent focus:ring-accent/20"
                  />
                  <span className="text-xs leading-relaxed text-slate-700">
                    <strong className="text-amber-700">* Required:</strong> I
                    consent to sharing my contact information (name, phone,
                    email) and business details with clients who request my
                    services through this platform. I understand that clients
                    will be able to contact me directly. Read our full{' '}
                    <a
                      href="/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-accent hover:text-accent/80"
                    >
                      Privacy Policy
                    </a>{' '}
                    for details on how your data is used and shared. *
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* ============================================================
              Step 3: Review
             ============================================================ */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Review your application
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Please review your information before submitting.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <ReviewRow label="Full name" value={formData.fullName} />
                <ReviewRow label="Email" value={formData.email} />
                <ReviewRow label="Phone" value={formData.phone} />
                <ReviewRow label="Business name" value={formData.businessName} />
                <ReviewRow
                  label="Experience"
                  value={`${formData.yearsExperience} years`}
                />

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Specializations
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {formData.specializations.map((spec) => (
                      <span
                        key={spec}
                        className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Service areas
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {formData.serviceAreas.length > 0 ? (
                      formData.serviceAreas.map((area) => (
                        <span
                          key={area}
                          className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600"
                        >
                          {area}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">
                        Not specified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <CheckCircle
                  size={14}
                  className="shrink-0 text-emerald-700"
                />
                <p className="text-xs font-semibold text-emerald-700">
                  Documents uploaded:{' '}
                  {verification.agentLicenseFile &&
                  verification.businessRegistrationFile
                    ? '2 of 2'
                    : '0 of 2'}
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60"
            >
              {loading
                ? 'Processing…'
                : step === 3
                ? 'Submit application'
                : 'Next'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
 * Sub-components
 * ============================================================ */

function UploadDropzone({ id, file, onPick, onChange, accept }) {
  return (
    <div
      onClick={onPick}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition ${
        file
          ? 'border-accent/40 bg-accent/5'
          : 'border-slate-200 bg-white hover:border-accent/40 hover:bg-slate-50'
      }`}
    >
      <Upload
        size={20}
        className={`mx-auto ${file ? 'text-accent' : 'text-slate-300'}`}
      />
      <p
        className={`mt-2 truncate text-sm font-semibold ${
          file ? 'text-slate-900' : 'text-slate-700'
        }`}
      >
        {file ? file.name : 'Click to upload or drag and drop'}
      </p>
      <p className="mt-1 text-[11px] text-slate-500">JPG, PNG · Max 5MB</p>
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
      />
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">
        {value || '—'}
      </p>
    </div>
  );
}