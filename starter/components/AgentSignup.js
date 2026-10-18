import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  AlertCircle,
  Upload,
  Plus,
  Minus,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PARISHES } from '@/lib/normalizeParish';
import { SPECIALIZATIONS } from '@/lib/agentOptions';
import { clearUserCache } from '@/lib/useRoleProtection';
import ContinueOnPhone from '@/components/ContinueOnPhone';

/* ----------------------------------------------------------
 * Brand
 * ---------------------------------------------------------- */
const BRAND_BLUE = '#2373F4';

/* ----------------------------------------------------------
 * Dosnine UI tokens
 * ---------------------------------------------------------- */
const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2373F4] focus:ring-2 focus:ring-[#2373F4]/20 disabled:bg-slate-50 disabled:text-slate-500';

const labelClass =
  'block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5';

/* ============================================================
 * Number stepper — big +/- buttons, digits only
 * ============================================================ */
function NumberStepper({ label, hint, value, onChange, min = 0, max = 999 }) {
  const numeric = Number(value) || 0;

  const handleInput = (raw) => {
    const cleaned = String(raw).replace(/[^0-9]/g, '').slice(0, 4);
    onChange(cleaned);
  };

  const dec = () => {
    if (numeric > min) onChange(String(numeric - 1));
  };
  const inc = () => {
    if (numeric < max) onChange(String(numeric + 1));
  };

  return (
    <div>
      <label className={labelClass}>{label}</label>
      {hint && <p className="-mt-1 mb-1.5 text-xs text-slate-500">{hint}</p>}

      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={dec}
          disabled={numeric <= min}
          aria-label="Decrease"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus size={16} />
        </button>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="0"
          className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-center text-base font-semibold tabular-nums text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[#2373F4] focus:ring-2 focus:ring-[#2373F4]/20"
        />

        <button
          type="button"
          onClick={inc}
          disabled={numeric >= max}
          aria-label="Increase"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 * Multi-select group with "Select all / Clear all"
 * ============================================================ */
function SelectAllGroup({
  label,
  hint,
  required,
  options,
  selected,
  onChange,
  columns = 3,
}) {
  const allSelected = options.length > 0 && selected.length === options.length;
  const someSelected = selected.length > 0 && !allSelected;

  const toggleAll = () => onChange(allSelected ? [] : [...options]);

  const toggle = (option) =>
    onChange(
      selected.includes(option)
        ? selected.filter((x) => x !== option)
        : [...selected, option]
    );

  const gridCols =
    columns === 2
      ? 'grid-cols-2'
      : columns === 4
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
        : 'grid-cols-2 sm:grid-cols-3';

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <label className={labelClass}>
            {label}
            {required && <span style={{ color: BRAND_BLUE }}> *</span>}
          </label>
          {hint && <p className="-mt-1 text-xs text-slate-500">{hint}</p>}
        </div>

        <button
          type="button"
          onClick={toggleAll}
          className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
          style={{
            borderColor: allSelected || someSelected ? BRAND_BLUE : '#e2e8f0',
            color: allSelected || someSelected ? BRAND_BLUE : '#475569',
            backgroundColor:
              allSelected || someSelected
                ? 'rgba(35, 115, 244, 0.06)'
                : '#ffffff',
          }}
        >
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </div>

      <div className={`mt-3 grid gap-2 ${gridCols}`}>
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                isSelected
                  ? 'border-[#2373F4] bg-[#2373F4]/5 text-[#2373F4]'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="truncate">{option}</span>
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition ${
                  isSelected
                    ? 'border-[#2373F4] bg-[#2373F4] text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {isSelected && <Check size={12} strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
 * Main component
 * ============================================================ */
export default function AgentSignup() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [agentData, setAgentData] = useState(null);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [identitySubmitted, setIdentitySubmitted] = useState(false);
  const [savedIdentity, setSavedIdentity] = useState({ idNumber: '', frontUrl: '', backUrl: '' });

  useEffect(() => {
    const checkAgentStatus = async () => {
      if (!user?.id) return;
      try {
        const token = await getToken();
          const { data } = await axios.get('/api/user/profile', {
            withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setIdentityVerified(Boolean(
          data?.identity_verified || data?.id_verification_status === 'approved'
        ));
        setIdentitySubmitted(Boolean(
          data?.identity_verified ||
          data?.id_verification_status === 'approved' ||
          (
            data?.id_verification_status === 'pending' &&
            data?.verification_front_url &&
            data?.verification_back_url
          )
        ));
        setSavedIdentity({
          idNumber: data?.jamaican_id_number || '',
          frontUrl: data?.verification_front_url || '',
          backUrl: data?.verification_back_url || '',
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

        const profileFullName =
          data.full_name || data.fullName || user.fullName || '';
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
    dealsClosedCount: '',
  });

  const [verification, setVerification] = useState({
    agentLicenseFile: null,
    businessRegistrationFile: null,
    jamaicanIdNumber: '',
    idFrontFile: null,
    idBackFile: null,
    agreeToTerms: false,
    dataConsent: false,
    identityConsent: false,
  });

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
        formData.yearsExperience === ''
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
      if (!verification.agentLicenseFile) {
        toast.error('Please upload your real estate agent license');
        return;
      }
      if (!identityVerified && !identitySubmitted && (
        !verification.jamaicanIdNumber.trim() ||
        !verification.idFrontFile ||
        !verification.idBackFile
      )) {
        toast.error('Enter your Jamaican ID number and upload both sides of your ID');
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
      if (!identityVerified && !identitySubmitted && !verification.identityConsent) {
        toast.error('Please consent to identity verification');
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      setLoading(true);

      let licenseUrl = null;
      let registrationUrl = null;
      let verificationFrontUrl = null;
      let verificationBackUrl = null;

      try {
        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        const licenseExt = verification.agentLicenseFile.name
          .split('.')
          .pop();
        const licenseName = `${user.id}_license_${Date.now()}.${licenseExt}`;

        const { error: licenseError } = await supabase.storage
          .from('agent-documents')
          .upload(licenseName, verification.agentLicenseFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (licenseError) {
          throw new Error(`License upload failed: ${licenseError.message}`);
        }
        licenseUrl = licenseName;

        if (verification.businessRegistrationFile) {
          const regExt = verification.businessRegistrationFile.name.split('.').pop();
          const regName = `${user.id}_registration_${Date.now()}.${regExt}`;
          const { error: regError } = await supabase.storage
            .from('agent-documents')
            .upload(regName, verification.businessRegistrationFile, {
              cacheControl: '3600',
              upsert: true,
            });

          if (regError) {
            throw new Error(`Registration upload failed: ${regError.message}`);
          }
          registrationUrl = regName;
        }

        if (!identityVerified) {
          const idTimestamp = Date.now();
          const frontExt = verification.idFrontFile.type === 'image/png' ? 'png' : 'jpg';
          const backExt = verification.idBackFile.type === 'image/png' ? 'png' : 'jpg';
          verificationFrontUrl = `verification/${user.id}/jamaican-id-front-${idTimestamp}.${frontExt}`;
          verificationBackUrl = `verification/${user.id}/jamaican-id-back-${idTimestamp}.${backExt}`;

          const { error: frontError } = await supabase.storage
            .from('agent-documents')
            .upload(verificationFrontUrl, verification.idFrontFile, {
              cacheControl: '3600',
              upsert: true,
            });
          if (frontError) throw new Error(`ID front upload failed: ${frontError.message}`);

          const { error: backError } = await supabase.storage
            .from('agent-documents')
            .upload(verificationBackUrl, verification.idBackFile, {
              cacheControl: '3600',
              upsert: true,
            });
          if (backError) throw new Error(`ID back upload failed: ${backError.message}`);
        }
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(
          `Failed to upload documents: ${
            uploadError.response?.data?.error || uploadError.message
          }`
        );
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
            yearsExperience: parseInt(formData.yearsExperience, 10) || 0,
            specializations: formData.specializations,
            licenseNumber: formData.licenseNumber,
            serviceAreas: formData.serviceAreas,
            aboutMe: formData.aboutMe,
            dealsClosedCount: parseInt(formData.dealsClosedCount, 10) || 0,
            dataConsent: verification.dataConsent,
            licenseFileUrl: licenseUrl,
            registrationFileUrl: registrationUrl,
            jamaicanIdNumber: savedIdentity.idNumber || verification.jamaicanIdNumber,
            verificationFrontUrl: savedIdentity.frontUrl || verificationFrontUrl,
            verificationBackUrl: savedIdentity.backUrl || verificationBackUrl,
            identityConsent: verification.identityConsent || identitySubmitted,
          },
          {
            withCredentials: true,
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );

        if (response.data.success) {
          setAgentData((current) => ({ ...current, verification_status: 'pending' }));
          setIdentitySubmitted(true);
          if (response.data.emailSent && response.data.adminEmailSent) {
            toast.success('Application submitted! Confirmation emails were sent to you and the admin team.');
          } else {
            toast.error('Application submitted, but an email notification failed. Please contact support.');
          }
        } else {
          toast.error(response.data.error || 'Failed to complete signup');
        }
      } catch (error) {
        toast.error(
          error.response?.data?.error || 'Failed to complete signup'
        );
      } finally {
        setLoading(false);
      }
    }
  };

  /* ----------------------------------------------------------
   * Pending review state
   * ---------------------------------------------------------- */
  if (agentData?.verification_status === 'pending' && identitySubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-8">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertCircle size={20} />
          </span>

          <p
            className="mt-4 text-xs font-semibold uppercase tracking-[0.22em]"
            style={{ color: BRAND_BLUE }}
          >
            Agent Application
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Verification pending
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your agent application is submitted and currently under review. We
            will notify you within 24–48 hours.
          </p>

          <div
            className="mt-5 rounded-xl border p-4 text-left"
            style={{
              borderColor: 'rgba(35, 115, 244, 0.3)',
              backgroundColor: 'rgba(35, 115, 244, 0.06)',
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: BRAND_BLUE }}
            >
              What happens next
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {[
                'Identity and document verification',
                'License confirmation',
                'Approval notification',
                'Payment activation',
                'Agent dashboard access',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle
                    size={14}
                    className="mt-0.5 shrink-0"
                    style={{ color: BRAND_BLUE }}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

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
          <p
            className="text-xs font-semibold uppercase tracking-[0.22em]"
            style={{ color: BRAND_BLUE }}
          >
            Agent Registration
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Become a Dosnine agent
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Three short steps — your details, your documents, and a final
            review.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-1 items-center">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                    s <= step ? 'text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                  style={
                    s <= step ? { backgroundColor: BRAND_BLUE } : undefined
                  }
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 rounded-full transition ${
                      s < step ? '' : 'bg-slate-100'
                    }`}
                    style={
                      s < step ? { backgroundColor: BRAND_BLUE } : undefined
                    }
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[11px] font-semibold uppercase tracking-wider">
            <span
              style={{ color: step >= 1 ? BRAND_BLUE : '#94a3b8' }}
            >
              Basic Info
            </span>
            <span
              style={{ color: step >= 2 ? BRAND_BLUE : '#94a3b8' }}
            >
              Verification
            </span>
            <span
              style={{ color: step >= 3 ? BRAND_BLUE : '#94a3b8' }}
            >
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

              {/* Years of experience — easy number entry */}
              <NumberStepper
                label="Years of experience *"
                hint="Approximate is fine"
                value={formData.yearsExperience}
                onChange={(v) =>
                  setFormData({ ...formData, yearsExperience: v })
                }
                min={0}
                max={80}
              />

              {/* Deals closed — easy number entry */}
              <NumberStepper
                label="Deals closed · approximate"
                hint="Total properties you've helped a client buy, sell, or rent"
                value={formData.dealsClosedCount}
                onChange={(v) =>
                  setFormData({ ...formData, dealsClosedCount: v })
                }
                min={0}
                max={999}
              />

              {/* Specializations — with Select all */}
              <SelectAllGroup
                label="Specializations"
                hint="What kind of business do you take on? Select at least one."
                required
                options={SPECIALIZATIONS}
                selected={formData.specializations}
                onChange={(v) =>
                  setFormData({ ...formData, specializations: v })
                }
                columns={2}
              />

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
                    className="font-semibold hover:opacity-80"
                    style={{ color: BRAND_BLUE }}
                  >
                    Jamaica Real Estate Board
                  </a>
                </p>
              </div>

              {/* Service areas — with Select all */}
              <SelectAllGroup
                label="Service areas"
                hint="Select every parish where you actively work. At least one."
                required
                options={PARISHES}
                selected={formData.serviceAreas}
                onChange={(v) => setFormData({ ...formData, serviceAreas: v })}
                columns={3}
              />

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

              <div
                className="flex items-start gap-3 rounded-xl border p-3.5"
                style={{
                  borderColor: 'rgba(35, 115, 244, 0.3)',
                  backgroundColor: 'rgba(35, 115, 244, 0.06)',
                }}
              >
                <AlertCircle
                  size={16}
                  className="mt-0.5 shrink-0"
                  style={{ color: BRAND_BLUE }}
                />
                <p className="text-xs leading-relaxed text-slate-700">
                  {identityVerified
                    ? 'Your identity is already verified. Submit your agent credentials below without uploading your ID again.'
                    : identitySubmitted
                      ? 'Your Jamaican ID was submitted for review. Continue with your agent credentials below.'
                      : 'Submit your Jamaican ID here as part of the same application, either from this device or your phone.'}
                </p>
              </div>

              {!identityVerified && !identitySubmitted && (
                <div className="space-y-3">
                  <ContinueOnPhone
                    verificationType="identity"
                    contextId={user?.id}
                    metadata={{
                      role: 'agent',
                      fullName: formData.fullName,
                      email: formData.email,
                      phone: formData.phone,
                      businessName: formData.businessName,
                      yearsExperience: formData.yearsExperience,
                      dealsClosedCount: formData.dealsClosedCount,
                      specializations: formData.specializations,
                      licenseNumber: formData.licenseNumber,
                      serviceAreas: formData.serviceAreas,
                      aboutMe: formData.aboutMe,
                    }}
                    onComplete={async (completedSession) => {
                      setIdentitySubmitted(true);
                      clearUserCache(user?.id);
                      try {
                        const token = await getToken();
                        const { data } = await axios.get('/api/user/profile', {
                          withCredentials: true,
                          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                        });
                        const isVerified = Boolean(data?.identity_verified || data?.id_verification_status === 'approved');
                        setIdentityVerified(isVerified);
                        setIdentitySubmitted(Boolean(
                          completedSession ||
                          isVerified || (
                            data?.id_verification_status === 'pending' &&
                            data?.verification_front_url &&
                            data?.verification_back_url
                          )
                        ));
                        setSavedIdentity({
                          idNumber: data?.jamaican_id_number || '',
                          frontUrl: data?.verification_front_url || '',
                          backUrl: data?.verification_back_url || '',
                        });
                        if (data?.agent) setAgentData(data.agent);
                      } catch (error) {
                        console.error('Could not refresh agent status after mobile submission:', error);
                        setAgentData((current) => ({
                          ...current,
                          verification_status: 'pending',
                        }));
                        toast.error('Mobile submission is complete, but the latest application status could not be loaded.');
                      }                    }}
                  />
                  <p className="text-center text-xs font-medium uppercase text-slate-400">Or upload from this device</p>
                </div>
              )}

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
                  Business registration (optional)
                </label>
                <p className="mb-2 text-xs text-slate-500">
                  Upload this if you represent a registered business. Your
                  Jamaican ID is collected separately below.
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

              {!identityVerified && !identitySubmitted && (
                <>
                  <div className="space-y-3 rounded-xl bg-slate-50 p-4">
                    <div>
                      <label className={labelClass}>Jamaican ID number *</label>
                      <input
                        type="text"
                        value={verification.jamaicanIdNumber}
                        onChange={(event) => setVerification((current) => ({
                          ...current,
                          jamaicanIdNumber: event.target.value,
                        }))}
                        className={inputClass}
                        autoComplete="off"
                        required
                      />
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600">
                      Upload clear JPG or PNG photos of the front and back of your Jamaican Government ID. Maximum 5MB each.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        ['idFrontFile', 'Front of Jamaican ID'],
                        ['idBackFile', 'Back of Jamaican ID'],
                      ].map(([field, label]) => (
                        <div key={field}>
                          <label className={labelClass}>{label} *</label>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                            onChange={(event) => handleFileChange(event, field)}
                            className={inputClass}
                          />
                          {verification[field] && (
                            <p className="mt-1 truncate text-xs text-slate-500">{verification[field].name}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
                    <input
                      type="checkbox"
                      checked={verification.identityConsent}
                      onChange={(event) => setVerification((current) => ({
                        ...current,
                        identityConsent: event.target.checked,
                      }))}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300"
                      style={{ color: BRAND_BLUE }}
                    />
                    <span className="text-sm text-slate-700">
                      I consent to Dosnine reviewing my Jamaican ID to verify this agent application. *
                    </span>
                  </label>
                </>
              )}

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
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 focus:ring-2 focus:ring-[#2373F4]/20"
                    style={{ color: BRAND_BLUE }}
                  />
                  <span className="text-sm text-slate-700">
                    I agree to the{' '}
                    <a
                      href="/terms-of-service"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold hover:opacity-80"
                      style={{ color: BRAND_BLUE }}
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
                    className="mt-0.5 h-4 w-4 rounded border-amber-300 focus:ring-2 focus:ring-[#2373F4]/20"
                    style={{ color: BRAND_BLUE }}
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
                      className="font-semibold hover:opacity-80"
                      style={{ color: BRAND_BLUE }}
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
                <ReviewRow
                  label="Business name"
                  value={formData.businessName}
                />
                <ReviewRow
                  label="Experience"
                  value={`${formData.yearsExperience || 0} years`}
                />
                <ReviewRow
                  label="Deals closed"
                  value={formData.dealsClosedCount || '0'}
                />

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Specializations
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {formData.specializations.map((spec) => (
                      <span
                        key={spec}
                        className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          borderColor: 'rgba(35, 115, 244, 0.3)',
                          backgroundColor: 'rgba(35, 115, 244, 0.08)',
                          color: BRAND_BLUE,
                        }}
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
                  Agent license: {verification.agentLicenseFile ? 'uploaded' : 'missing'}
                  {!identityVerified && ` · Jamaican ID: ${verification.idFrontFile && verification.idBackFile ? '2 of 2 sides' : 'required'}`}
                  {verification.businessRegistrationFile && ' · Business registration uploaded'}
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
              className="inline-flex flex-1 items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: BRAND_BLUE }}
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
          ? 'border-[#2373F4]/40 bg-[#2373F4]/5'
          : 'border-slate-200 bg-white hover:border-[#2373F4]/40 hover:bg-slate-50'
      }`}
    >
      <Upload
        size={20}
        className={`mx-auto ${
          file ? 'text-[#2373F4]' : 'text-slate-300'
        }`}
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