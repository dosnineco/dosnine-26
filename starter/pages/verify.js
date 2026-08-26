import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CheckCircle2, ShieldCheck, Upload, IdCard } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'homeowner', label: 'Homeowner' },
  { value: 'agent', label: 'Agent' },
];

export default function VerifyIdentityPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState('homeowner');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: '',
    idNumber: '',
    consent: false,
  });
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [agentIdFile, setAgentIdFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const agentIdInputRef = useRef(null);

  useEffect(() => {
    if (!isLoaded) return;

    const selectedRole = String(router.query.role || 'homeowner').toLowerCase();
    if (ROLE_OPTIONS.some((option) => option.value === selectedRole)) {
      setRole(selectedRole);
    }

    const loadProfile = async () => {
      try {
        const { data } = await axios.get('/api/user/profile');
        const isVerified = Boolean(data?.identity_verified || data?.id_verification_status === 'approved');
        if (isVerified) {
          if (typeof window !== 'undefined' && user?.id) {
            window.localStorage.removeItem(`verification_pending_${user.id}`);
          }
          router.replace('/agent/dashboard');
          return;
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
  }, [isLoaded, router]);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({ ...prev, fullName: user.fullName || prev.fullName }));
    }
  }, [user]);

  const onFileChange = (event, side) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast.error('Please upload a JPG or PNG image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Each file must be under 5MB');
      return;
    }

    if (side === 'front') setFrontFile(file);
    if (side === 'back') setBackFile(file);
    if (side === 'agentId') setAgentIdFile(file);
  };

  const buildAuthHeaders = () => {
    const headers = {};
    if (user?.id) headers['x-clerk-user-id'] = user.id;
    const primaryEmail = user?.emailAddresses?.[0]?.emailAddress || user?.primaryEmailAddress?.emailAddress || '';
    if (primaryEmail) headers['x-clerk-user-email'] = primaryEmail;
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    if (fullName) headers['x-clerk-user-name'] = fullName;
    return headers;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    if (!user?.id) {
      toast.error('Please sign in before continuing');
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
    if (role === 'agent' && !agentIdFile) {
      toast.error('Please upload your agent license or agent ID');
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
      if (role === 'agent' && agentIdFile) {
        payload.append('agentIdFile', agentIdFile);
      }

      const response = await axios.post('/api/user/verify', payload, {
        headers: { 'Content-Type': 'multipart/form-data', ...buildAuthHeaders() },
        withCredentials: true,
      });

      toast.dismiss(toastId);
      if (response.data?.success) {
        toast.success('ID verification submitted successfully');
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

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-accent px-6 py-8 text-white">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-7 h-7" />
              <h1 className="text-3xl font-bold">Verify your identity</h1>
            </div>
            <p className="text-white/90 text-sm">Every user must submit a Jamaican ID before using the platform.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">I am joining as</label>
              <div className="grid grid-cols-2 gap-3">
                {ROLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRole(option.value)}
                    className={`rounded-xl border px-4 py-3 text-left font-medium transition ${
                      role === option.value
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Jamaican ID number</label>
              <input
                type="text"
                value={form.idNumber}
                onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="ID number"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3 text-gray-700 font-semibold">
                  <IdCard className="w-5 h-5" />
                  Front of ID
                </div>
                <div
                  onClick={() => frontInputRef.current?.click()}
                  className="cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-4 text-center hover:bg-gray-100"
                >
                  <Upload className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">{frontFile ? frontFile.name : 'Upload front image'}</p>
                </div>
                <input ref={frontInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onFileChange(e, 'front')} />
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3 text-gray-700 font-semibold">
                  <IdCard className="w-5 h-5" />
                  Back of ID
                </div>
                <div
                  onClick={() => backInputRef.current?.click()}
                  className="cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-4 text-center hover:bg-gray-100"
                >
                  <Upload className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">{backFile ? backFile.name : 'Upload back image'}</p>
                </div>
                <input ref={backInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onFileChange(e, 'back')} />
              </div>
            </div>

            {role === 'agent' && (
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3 text-gray-700 font-semibold">
                  <IdCard className="w-5 h-5" />
                  Agent License / Agent ID
                </div>
                <p className="text-xs text-gray-500 mb-3">Upload your real estate agent license or agency-issued ID.</p>
                <div
                  onClick={() => agentIdInputRef.current?.click()}
                  className="cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-4 text-center hover:bg-gray-100"
                >
                  <Upload className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">{agentIdFile ? agentIdFile.name : 'Upload agent ID'}</p>
                </div>
                <input ref={agentIdInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onFileChange(e, 'agentId')} />
              </div>
            )}

            <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-gray-700">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                  className="mt-1 h-4 w-4 accent-accent"
                />
                <span>
                  I confirm that this ID belongs to me and that Dosnine may use it for identity verification and platform security. I understand that my account must be verified before I can interact with listings, requests, or agent tools.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition"
            >
              {loading ? 'Submitting…' : 'Submit verification'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
