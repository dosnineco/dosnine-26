import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  useAuth,
  useUser,
} from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  ShieldCheck,
  Upload,
  IdCard,
  Home,
  KeyRound,
  Megaphone,
  Users,
  ArrowRight,
  Smartphone,
} from 'lucide-react';
import { clearUserCache } from '../lib/useRoleProtection';
import ContinueOnPhone from '../components/ContinueOnPhone';
import AgentSignup from '../components/AgentSignup';

const ROLE_OPTIONS = [
  { value: 'tenant', label: 'Tenant' },
  { value: 'homeowner', label: 'Homeowner' },
  { value: 'advertiser', label: 'Advertiser' },
  { value: 'agent', label: 'Real Estate Agent' },
];

const ACCOUNT_OPTIONS = [
  {
    value: 'tenant',
    label: 'Regular account',
    description: 'Browse homes, make requests, and use the regular dashboard. Tenant accounts are regular accounts.',
    icon: KeyRound,
  },
  {
    value: 'homeowner',
    label: 'Homeowner',
    description: 'Post and manage properties. Identity verification is required.',
    icon: Home,
  },
  {
    value: 'advertiser',
    label: 'Advertiser',
    description: 'Create and manage advertising campaigns.',
    icon: Megaphone,
  },
  {
    value: 'agent',
    label: 'Real Estate Agent',
    description: 'Apply for verified agent access and agent tools.',
    icon: Users,
  },
];

function VerifyIdentityPageContent() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [role, setRole] = useState('tenant');
  const [roleLocked, setRoleLocked] = useState(false);
  const [existingAccountType, setExistingAccountType] = useState(null);
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [showManualUpload, setShowManualUpload] = useState(false);
  const [showAgentSignup, setShowAgentSignup] = useState(false);
  const [accountSaveError, setAccountSaveError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [checking, setChecking] = useState(true);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: '',
    idNumber: '',
    consent: false,
  });
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const previewUrlsRef = useRef({});
  const [previews, setPreviews] = useState({});

  useEffect(
    () => () => Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url)),
    []
  );

  useEffect(() => {
    if (!isLoaded) return;

    const hasRoleSelection = typeof router.query.role === 'string';
    const selectedRole = String(router.query.role || 'tenant').toLowerCase();
    if (ROLE_OPTIONS.some((option) => option.value === selectedRole)) {
      setRole(selectedRole);
    }

    const loadProfile = async () => {
      try {
        const { data } = await axios.get('/api/user/profile');
        const isVerified = Boolean(
          data?.identity_verified ||
          data?.id_verification_status === 'approved'
        );
        setIdentityVerified(isVerified);
        setExistingAccountType(data?.account_type || null);
        const savedRole = data?.account_type === 'agent' || data?.user_type === 'agent'
          ? 'agent'
          : data?.account_type === 'advertiser'
            ? 'advertiser'
            : data?.account_type === 'regular'
              ? data?.profile_intent || 'tenant'
              : null;
        const isRegularAccount = data?.account_type === 'regular';
        const isChangingRegularIntent =
          isRegularAccount &&
          hasRoleSelection &&
          ['homeowner', 'tenant'].includes(selectedRole) &&
          selectedRole !== savedRole;
        const needsHomeownerVerification =
          hasRoleSelection && selectedRole === 'homeowner';
        if (isRegularAccount && !isChangingRegularIntent && !needsHomeownerVerification) {
          router.replace('/dashboard');
          return;
        }
        if (!data?.account_type && !hasRoleSelection) {
          setSavingAccount(true);
          try {
            const token = await getToken();
            await axios.post(
              '/api/user/account-type',
              { accountType: 'regular', profileIntent: 'tenant' },
              {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                withCredentials: true,
              }
            );
            clearUserCache(user.id);
            window.location.assign('/dashboard');
            return;
          } catch (error) {
            console.error('Default account setup failed:', error);
            setAccountSaveError(error.response?.data?.error || 'Unable to set up your regular account. Please choose an account type to continue.');
          } finally {
            setSavingAccount(false);
          }
        }
        if (savedRole && ROLE_OPTIONS.some((option) => option.value === savedRole)) {
          setRole(isChangingRegularIntent ? selectedRole : savedRole);
          setRoleLocked(!isRegularAccount);
        }
        if (isVerified) {
          if (typeof window !== 'undefined' && user?.id) {
            window.localStorage.removeItem(`verification_pending_${user.id}`);
          }
          if (!isChangingRegularIntent && selectedRole !== 'agent' && savedRole !== 'agent') {
            router.replace(savedRole === 'agent' ? '/agent/dashboard' : '/dashboard');
            return;
          }
        }
        const pendingLocally = typeof window !== 'undefined' && user?.id
          ? window.localStorage.getItem(`verification_pending_${user.id}`) === 'true'
          : false;
        if (data?.id_verification_status === 'pending' || pendingLocally) {
          setSubmitted(true);
        }
      } catch (error) {
        console.error('Profile lookup failed:', error);
      } finally {
        setChecking(false);
      }
    };

    loadProfile();
  }, [isLoaded, router, getToken, user?.id]);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({ ...prev, fullName: user.fullName || prev.fullName }));
    }
  }, [user]);

  const onFileChange = (event, side) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast.error('Please upload a JPG or PNG image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Each file must be under 5MB');
      return;
    }

    if (previewUrlsRef.current[side]) {
      URL.revokeObjectURL(previewUrlsRef.current[side]);
    }
    const previewUrl = URL.createObjectURL(file);
    previewUrlsRef.current[side] = previewUrl;
    setPreviews((current) => ({ ...current, [side]: previewUrl }));

    if (side === 'front') setFrontFile(file);
    if (side === 'back') setBackFile(file);
  };

  const buildAuthHeaders = (token) => {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (user?.id) headers['x-clerk-user-id'] = user.id;
    const primaryEmail = user?.emailAddresses?.[0]?.emailAddress || user?.primaryEmailAddress?.emailAddress || '';
    if (primaryEmail) headers['x-clerk-user-email'] = primaryEmail;
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    if (fullName) headers['x-clerk-user-name'] = fullName;
    return headers;
  };

  /**
   * Fired by ContinueOnPhone when the phone completes the session.
   * Marks the flow as submitted so the success screen appears.
   *
   * NOTE: The actual ID capture + submission happens on the mobile
   * page you build at /verify/mobile. Once that page finishes calling
   * its own /api/user/verify endpoint, the session is marked complete
   * and this fires.
   */
  const handleMobileComplete = () => {
    clearUserCache(user?.id);
    if (typeof window !== 'undefined' && user?.id) {
      window.localStorage.setItem(`verification_pending_${user.id}`, 'true');
    }
    toast.success('Verification submitted from your phone');
    setSubmitted(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    if (!user?.id) {
      toast.error('Please sign in before continuing');
      router.replace('/dashboard');
      return;
    }
    if (role === 'agent') {
      router.replace('/agent/signup');
      return;
    }
    if (!form.fullName?.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!form.phone?.trim()) {
      toast.error('Phone number is required');
      return;
    }
    if (!form.idNumber?.trim()) {
      toast.error('Jamaican ID number is required');
      return;
    }
    if (!frontFile || !backFile) {
      toast.error('Please upload both sides of your Jamaican ID');
      return;
    }
    if (!form.consent) {
      toast.error('Please confirm consent to verify your identity');
      return;
    }

    setLoading(true);

    try {
      const toastId = toast.loading('Submitting ID verification…');
      const payload = new FormData();
      payload.append('role', role);
      payload.append('fullName', form.fullName);
      payload.append('phone', form.phone);
      payload.append('idNumber', form.idNumber);
      payload.append('consent', String(form.consent));
      payload.append('frontFile', frontFile);
      payload.append('backFile', backFile);

      const token = await getToken();
      const response = await axios.post('/api/user/verify', payload, {
        headers: buildAuthHeaders(token),
        withCredentials: true,
      });

      toast.dismiss(toastId);
      if (response.data?.success) {
        toast.success('ID verification submitted successfully');
        clearUserCache(user.id);
        if (typeof window !== 'undefined' && user?.id) {
          window.localStorage.setItem(`verification_pending_${user.id}`, 'true');
        }
        setSubmitted(true);
      } else {
        throw new Error(response.data?.error || 'Verification failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const continueWithRegularAccount = async () => {
    if (savingAccount || !['homeowner', 'tenant'].includes(role)) return;
    if (!user?.id) {
      toast.error('Please sign in before continuing');
      router.replace('/dashboard');
      return;
    }

    setSavingAccount(true);
    try {
      const token = await getToken();
      await axios.post(
        '/api/user/account-type',
        { accountType: 'regular', profileIntent: role },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        }
      );
      clearUserCache(user.id);
      window.location.assign('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to save your account type.');
    } finally {
      setSavingAccount(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking your account…</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent/5 to-gray-50 flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8 sm:p-10 text-center">
          <div className="relative mx-auto mb-6 w-20 h-20">
            <span className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-40"></span>
            <div className="relative w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification submitted</h1>
          <p className="text-gray-600 leading-relaxed mb-2">
            Thanks — your Jamaican ID is under review. We manually check every submission to keep the platform
            safe and prevent fraud.
          </p>
          <p className="inline-flex items-center gap-2 text-sm font-medium text-accent bg-accent/10 rounded-full px-4 py-2 mb-6">
            <ShieldCheck className="w-4 h-4" />
            Typically approved within a few hours
          </p>
          <button
            onClick={() => router.replace('/')}
            className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3.5 rounded-xl transition shadow-sm shadow-accent/30"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  if (showAgentSignup) {
    return <AgentSignup />;
  }

  if (!showVerificationForm) {
    const selectedOption = ACCOUNT_OPTIONS.find((option) => option.value === role) || ACCOUNT_OPTIONS[0];

    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <header className="mx-auto mb-8 max-w-2xl text-center">
            <h1 className="mt-2 text-3xl font-bold text-gray-900">What type of account do you need?</h1>
            <p className="mt-3 text-gray-600">
              Choose how you plan to use Dosnine. We’ll only ask for identity documents when the account type requires verification.
            </p>
          </header>

          {accountSaveError && (
            <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
              {accountSaveError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {ACCOUNT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = role === option.value;
              const accountTypeConflict = existingAccountType === 'regular' &&
                ['advertiser', 'agent'].includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  disabled={(roleLocked && !selected) || accountTypeConflict}
                  onClick={() => setRole(option.value)}
                  className={`flex min-h-40 flex-col rounded-2xl p-6 text-left transition focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected ? 'bg-accent/10 ring-2 ring-accent' : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className={`h-6 w-6 ${selected ? 'text-accent' : 'text-gray-500'}`} aria-hidden="true" />
                    <span className="text-lg font-semibold text-gray-900">{option.label}</span>
                  </span>
                  <span className="mt-3 text-sm leading-6 text-gray-600">{option.description}</span>
                </button>
              );
            })}
          </div>

          {roleLocked && (
            <p className="mt-4 text-center text-sm text-gray-500">
              Your account type is already set and cannot be changed here.
            </p>
          )}

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              disabled={savingAccount}
              onClick={() => {
                if (role === 'tenant' || (role === 'homeowner' && identityVerified)) {
                  continueWithRegularAccount();
                } else if (role === 'agent') {
                  setShowAgentSignup(true);
                } else {
                  setShowVerificationForm(true);
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-white transition hover:bg-accent/90 disabled:cursor-wait disabled:opacity-60"
            >
              {savingAccount
                ? 'Setting up your account…'
                : role === 'tenant'
                  ? 'Continue with a regular account'
                  : role === 'homeowner' && identityVerified
                    ? 'Switch to a homeowner account'
                    : `Continue as ${selectedOption.label}`}
              {!savingAccount && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:py-12">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white">
        <header className="border-b border-gray-200 px-5 py-6 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Verify your identity</h1>
              <p className="mt-1 text-sm text-gray-600">
                {role === 'homeowner'
                  ? 'Required to post or manage properties.'
                  : 'Required to set up an advertiser account.'}
              </p>
            </div>
            <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700">
              {ROLE_OPTIONS.find((option) => option.value === role)?.label}
            </span>
          </div>
            {!roleLocked && (
              <button type="button" onClick={() => setShowVerificationForm(false)} className="mt-4 text-sm font-medium text-gray-600 underline underline-offset-4 hover:text-gray-900">
                Change account type
              </button>
            )}
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-6 sm:px-8">
            {identityVerified && role === 'homeowner' && (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                Your identity is already verified. Continue to your homeowner account.
              </div>
            )}
            <div>
              <ContinueOnPhone
                verificationType="identity"
                contextId={user?.id}
                metadata={{ role, fullName: form.fullName, phone: form.phone }}
                onComplete={handleMobileComplete}
              />
            </div>

            <button
              type="button"
              aria-expanded={showManualUpload}
              onClick={() => setShowManualUpload((current) => !current)}
              className="text-sm font-semibold text-accent underline underline-offset-4 hover:opacity-80"
            >
              {showManualUpload ? 'Hide device upload' : 'Option 2: Upload from this device instead'}
            </button>

            {showManualUpload && (
              <div className="space-y-5 border-t border-gray-200 pt-5">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  or upload from this device
                </span>
              </div>
            </div>

            {/* ============================================================
                Manual desktop upload (existing flow)
               ============================================================ */}
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full name</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Your full legal name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="876-000-0000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Government ID #</label>
              <input
                type="text"
                value={form.idNumber}
                onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="ID number"
              />
            </div>

            <div className="rounded-xl bg-red-50 p-4 text-sm text-gray-700">
              <p className="font-semibold">Upload photos of your Jamaican Government ID—not a selfie.</p>
              <p className="mt-1">
                Both the front and back are required. Make sure the whole card is in the photo and the text
                is clear and readable. JPG or PNG only, up to 5 MB per image.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3 text-gray-700 font-semibold">
                  <IdCard className="w-5 h-5" />
                  Front of ID <span className="text-xs font-medium text-gray-500">Required</span>
                </div>
                <button
                  type="button"
                  onClick={() => frontInputRef.current?.click()}
                  className="w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-4 text-center hover:bg-gray-100"
                >
                  {previews.front ? (
                    <span className="relative mx-auto mb-3 block h-40 w-full">
                      <Image src={previews.front} alt="Preview of the selected front of your ID" fill unoptimized className="rounded-lg object-contain" />
                    </span>
                  ) : (
                    <Upload className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                  )}
                  <span className="block text-sm font-medium text-gray-700">
                    {frontFile ? 'Front image selected — click to change' : 'Choose photo of front of ID'}
                  </span>
                  {frontFile && <span className="mt-1 block truncate text-xs text-gray-500">{frontFile.name}</span>}
                </button>
                <input ref={frontInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onFileChange(e, 'front')} />
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3 text-gray-700 font-semibold">
                  <IdCard className="w-5 h-5" />
                  Back of ID <span className="text-xs font-medium text-gray-500">Required</span>
                </div>
                <button
                  type="button"
                  onClick={() => backInputRef.current?.click()}
                  className="w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-4 text-center hover:bg-gray-100"
                >
                  {previews.back ? (
                    <span className="relative mx-auto mb-3 block h-40 w-full">
                      <Image src={previews.back} alt="Preview of the selected back of your ID" fill unoptimized className="rounded-lg object-contain" />
                    </span>
                  ) : (
                    <Upload className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                  )}
                  <span className="block text-sm font-medium text-gray-700">
                    {backFile ? 'Back image selected — click to change' : 'Choose photo of back of ID'}
                  </span>
                  {backFile && <span className="mt-1 block truncate text-xs text-gray-500">{backFile.name}</span>}
                </button>
                <input ref={backInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onFileChange(e, 'back')} />
              </div>
            </div>

            <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-gray-700">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                  className="mt-1 h-4 w-4 accent-accent"
                />
                <span>
                  I confirm that this ID belongs to me and that Dosnine may use it for identity verification and platform security. I understand that identity verification is required to post or manage properties and access certain account features.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-accent py-3.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Submitting…' : 'Submit verification'}
            </button>
              </div>
            )}
          </form>
      </section>
    </main>
  );
}

export default function VerifyIdentityPage() {
  const router = useRouter();
  const returnUrl = router.asPath || '/verify';

  return (
    <>
      <SignedIn>
        <VerifyIdentityPageContent />
      </SignedIn>
      <SignedOut>
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
          <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-accent" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Sign in to verify your identity</h1>
            <p className="mt-2 text-sm text-gray-600">
              Sign in or create an account to continue with identity verification.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <SignInButton mode="redirect" redirectUrl="/dashboard">
                <button type="button" className="w-full rounded-xl bg-accent px-5 py-3 font-semibold text-white hover:bg-accent/90">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="redirect" redirectUrl={returnUrl}>
                <button type="button" className="w-full rounded-xl bg-gray-100 px-5 py-3 font-semibold text-gray-800 hover:bg-gray-200">
                  Create account
                </button>
              </SignUpButton>
            </div>
          </section>
        </main>
      </SignedOut>
    </>
  );
}