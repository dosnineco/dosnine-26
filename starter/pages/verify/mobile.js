import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  IdCard,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { PARISHES } from '@/lib/normalizeParish';
import { SPECIALIZATIONS } from '@/lib/agentOptions';

export default function VerifyMobilePage() {
  const router = useRouter();
  const { t: tokenParam } = router.query;

  const [state, setState] = useState('code'); // code | loading | ready | invalid | expired | completed | submitting
  const [session, setSession] = useState(null);
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [details, setDetails] = useState({ fullName: '', phone: '', idNumber: '', consent: false });
  const [agentDetails, setAgentDetails] = useState({
    email: '',
    businessName: '',
    yearsExperience: '',
    dealsClosedCount: '',
    specializations: [],
    licenseNumber: '',
    serviceAreas: [],
    aboutMe: '',
    agreeToTerms: false,
    dataConsent: false,
  });
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [registrationFile, setRegistrationFile] = useState(null);
  const [uploadedPaths, setUploadedPaths] = useState({
    front: '',
    back: '',
    license: '',
    registration: '',
  });
  const [submitStep, setSubmitStep] = useState('');

  useEffect(() => {
    if (!session?.metadata) return;
    setDetails((current) => ({
      ...current,
      fullName: current.fullName || session.metadata.fullName || '',
      phone: current.phone || session.metadata.phone || '',
    }));
    setAgentDetails((current) => ({
      ...current,
      email: current.email || session.metadata.email || '',
      businessName: current.businessName || session.metadata.businessName || '',
      yearsExperience: current.yearsExperience || String(session.metadata.yearsExperience ?? ''),
      dealsClosedCount: current.dealsClosedCount || String(session.metadata.dealsClosedCount ?? '0'),
      specializations: current.specializations.length
        ? current.specializations
        : Array.isArray(session.metadata.specializations)
          ? session.metadata.specializations
          : [],
      licenseNumber: current.licenseNumber || session.metadata.licenseNumber || '',
      serviceAreas: current.serviceAreas.length
        ? current.serviceAreas
        : Array.isArray(session.metadata.serviceAreas)
          ? session.metadata.serviceAreas
          : [],
      aboutMe: current.aboutMe || session.metadata.aboutMe || '',
    }));
  }, [session]);

  /* --- If a token was passed in the URL, load it directly --- */
  useEffect(() => {
    if (!router.isReady) return;
    if (typeof tokenParam !== 'string' || !tokenParam) return;

    (async () => {
      setState('loading');
      try {
        const res = await fetch(
          `/api/verification/sessions/${encodeURIComponent(tokenParam)}`
        );
        const payload = await res.json();

        if (res.status === 410) return setState('expired');
        if (res.status === 404) return setState('invalid');
        if (!res.ok) return setState('invalid');
        if (payload.alreadyCompleted) return setState('completed');

        setSession(payload.session);
        setToken(tokenParam);
        setState('ready');
      } catch (err) {
        console.error('Token load failed:', err);
        setState('invalid');
      }
    })();
  }, [router.isReady, tokenParam]);

  /* --- Code submission --- */
  const submitCode = async (e) => {
    e?.preventDefault?.();
    const digits = code.replace(/\D/g, '');
    if (digits.length !== 6) {
      setError('Enter the full 6-digit code');
      return;
    }

    setError('');
    setState('loading');

    try {
      const res = await fetch('/api/verification/sessions/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: digits }),
      });
      const payload = await res.json();

      if (res.status === 404) {
        setState('code');
        setError(payload.error || 'Invalid or expired code.');
        return;
      }
      if (res.status === 410) return setState('expired');
      if (res.status === 429) {
        setState('code');
        setError(payload.error || 'Too many attempts. Wait a few minutes.');
        return;
      }
      if (!res.ok || !payload.success) {
        setState('code');
        setError(payload.error || 'Could not verify code.');
        return;
      }

      setSession(payload.session);
      setToken(payload.token);
      setState('ready');
    } catch (err) {
      console.error('Redeem failed:', err);
      setState('code');
      setError('Something went wrong. Try again.');
    }
  };

  /* --- Finish on phone --- */
  const chooseFile = (side, file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Documents must be JPG or PNG images.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Each ID photo must be 5 MB or smaller.');
      return;
    }

    setError('');
    setUploadedPaths((current) => ({ ...current, [side]: '' }));
    if (side === 'front') setFrontFile(file);
    if (side === 'back') setBackFile(file);
    if (side === 'license') setLicenseFile(file);
    if (side === 'registration') setRegistrationFile(file);
  };

  const uploadPhoto = async (side, file) => {
    const response = await fetch('/api/user/verify/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: token,
        side,
        mimeType: file.type,
        fileSize: file.size,
      }),
    });
    const upload = await response.json();
    if (!response.ok || !upload.success) {
      throw new Error(upload.error || `Unable to prepare the ${side} ID photo.`);
    }

    const { error: uploadError } = await supabase.storage
      .from('agent-documents')
      .uploadToSignedUrl(upload.path, upload.uploadToken, file, {
        contentType: file.type,
        upsert: true,
      });
    if (uploadError) throw new Error(`Could not upload ${side}: ${uploadError.message}`);
    return upload.path;
  };

  const finish = async (event) => {
    event.preventDefault();
    if ((!frontFile && !uploadedPaths.front) || (!backFile && !uploadedPaths.back)) {
      setError('Upload both sides of your Jamaican ID.');
      return;
    }
    if (!details.consent) {
      setError('Confirm consent to identity verification.');
      return;
    }
    const isAgentApplication = session?.metadata?.role === 'agent';
    if (
      isAgentApplication &&
      (!agentDetails.businessName.trim() ||
        agentDetails.yearsExperience === '' ||
        agentDetails.specializations.length === 0 ||
        agentDetails.serviceAreas.length === 0 ||
        (!licenseFile && !uploadedPaths.license) ||
        !agentDetails.agreeToTerms ||
        !agentDetails.dataConsent)
    ) {
      setError('Complete the required agent application details and consents.');
      return;
    }
    setState('submitting');
    try {
      const uploaded = { ...uploadedPaths };
      if (!uploaded.front) {
        setSubmitStep('Uploading front of ID…');
        uploaded.front = await uploadPhoto('front', frontFile);
        setUploadedPaths((current) => ({ ...current, front: uploaded.front }));
      }
      if (!uploaded.back) {
        setSubmitStep('Uploading back of ID…');
        uploaded.back = await uploadPhoto('back', backFile);
        setUploadedPaths((current) => ({ ...current, back: uploaded.back }));
      }
      if (isAgentApplication && !uploaded.license) {
        setSubmitStep('Uploading agent license…');
        uploaded.license = await uploadPhoto('license', licenseFile);
        setUploadedPaths((current) => ({ ...current, license: uploaded.license }));
      }
      if (isAgentApplication && registrationFile && !uploaded.registration) {
        setSubmitStep('Uploading business registration…');
        uploaded.registration = await uploadPhoto('registration', registrationFile);
        setUploadedPaths((current) => ({ ...current, registration: uploaded.registration }));
      }

      if (isAgentApplication) {
        setSubmitStep('Submitting agent application…');
        const agentResponse = await fetch('/api/agents/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionToken: token,
            fullName: details.fullName,
            email: agentDetails.email,
            phone: details.phone,
            businessName: agentDetails.businessName,
            yearsExperience: Number(agentDetails.yearsExperience),
            dealsClosedCount: Number(agentDetails.dealsClosedCount) || 0,
            specializations: agentDetails.specializations,
            licenseNumber: agentDetails.licenseNumber,
            serviceAreas: agentDetails.serviceAreas,
            aboutMe: agentDetails.aboutMe,
            dataConsent: agentDetails.dataConsent,
            agreeToTerms: agentDetails.agreeToTerms,
            licenseFileUrl: uploaded.license,
            registrationFileUrl: uploaded.registration || null,
            jamaicanIdNumber: details.idNumber,
            verificationFrontUrl: uploaded.front,
            verificationBackUrl: uploaded.back,
            identityConsent: details.consent,
          }),
        });
        const agentPayload = await agentResponse.json();
        if (!agentResponse.ok || !agentPayload.success) {
          throw new Error(agentPayload.error || 'Failed to submit agent application.');
        }
      }

      setSubmitStep('Finishing signup…');
      const formData = new FormData();
      formData.append('sessionToken', token);
      formData.append('role', session?.metadata?.role || 'homeowner');
      formData.append('fullName', details.fullName);
      formData.append('phone', details.phone);
      formData.append('idNumber', details.idNumber);
      formData.append('consent', String(details.consent));
      formData.append('frontPath', uploaded.front);
      formData.append('backPath', uploaded.back);
      const res = await fetch('/api/user/verify', { method: 'POST', body: formData });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error || 'Failed to submit identity documents.');
      toast.success('Identity documents submitted for review.');
      setState('completed');
    } catch (err) {
      setError(err.message || 'Failed to finish signup. Your uploaded photo(s) are saved; try again.');
      toast.error(err.message || 'Failed to finish');
      setState('ready');
    } finally {
      setSubmitStep('');
    }
  };

  /* ---------- Render ---------- */

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-accent" size={26} />
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <Screen
        icon={<AlertCircle className="text-red-500" size={36} />}
        title="This link is not valid"
        body="Ask the desktop to generate a new code."
      />
    );
  }

  if (state === 'expired') {
    return (
      <Screen
        icon={<AlertCircle className="text-red-500" size={36} />}
        title="This code has expired"
        body="Ask the desktop for a new code."
      />
    );
  }

  if (state === 'completed') {
    return (
      <Screen
        icon={<CheckCircle2 className="text-emerald-600" size={36} />}
        title="Signup submitted for review"
        body={session?.metadata?.role === 'agent'
          ? 'Your agent application and identity documents were submitted. We will review your application and identity before verified features are available.'
          : 'Your account details and ID photos were submitted. We will review your identity before verified features are available.'}
      />
    );
  }

  /* --- Code entry --- */
  if (state === 'code') {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-accent">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Enter your code
                </p>
                <p className="text-xs text-gray-600">
                  Find the 6-digit code on your computer
                </p>
              </div>
            </div>

            <form onSubmit={submitCode} className="mt-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                value={code}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                  const spaced = digits.replace(/(\d{3})(\d{1,3})/, '$1 $2');
                  setCode(spaced);
                  if (error) setError('');
                }}
                placeholder="123 456"
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-4 text-center font-mono text-2xl font-bold tracking-[0.2em] text-gray-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />

              {error && (
                <p role="alert" className="mt-2 text-xs font-medium text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={code.replace(/\D/g, '').length !== 6}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                Continue <ArrowRight size={14} />
              </button>
            </form>

            <p className="mt-4 text-center text-[11px] text-gray-500">
              The code expires in 30 minutes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* --- Ready / submitting --- */
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-accent">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Continue verification
              </p>
              <p className="text-xs text-gray-600">
                {session?.verification_type} verification
              </p>
            </div>
          </div>

          <form onSubmit={finish} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Full legal name
              <input required value={details.fullName} onChange={(event) => setDetails({ ...details, fullName: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5" />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Phone number
              <input required type="tel" value={details.phone} onChange={(event) => setDetails({ ...details, phone: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5" />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Jamaican ID number
              <input required value={details.idNumber} onChange={(event) => setDetails({ ...details, idNumber: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5" />
            </label>
            {session?.metadata?.role === 'agent' && (
              <section className="space-y-4 border-t border-gray-200 pt-4">
                <h2 className="text-base font-semibold text-gray-900">Agent application</h2>
                <label className="block text-sm font-medium text-gray-700">
                  Email address
                  <input type="email" value={agentDetails.email} readOnly className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-100 px-3 py-2.5" />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Business name *
                  <input required value={agentDetails.businessName} onChange={(event) => setAgentDetails({ ...agentDetails, businessName: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Years of experience *
                    <input required type="number" min="0" max="80" value={agentDetails.yearsExperience} onChange={(event) => setAgentDetails({ ...agentDetails, yearsExperience: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Deals closed
                    <input type="number" min="0" max="999" value={agentDetails.dealsClosedCount} onChange={(event) => setAgentDetails({ ...agentDetails, dealsClosedCount: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                  </label>
                </div>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-gray-700">Specializations *</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {SPECIALIZATIONS.map((specialization) => (
                      <label key={specialization} className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={agentDetails.specializations.includes(specialization)}
                          onChange={(event) => setAgentDetails((current) => ({
                            ...current,
                            specializations: event.target.checked
                              ? [...current.specializations, specialization]
                              : current.specializations.filter((item) => item !== specialization),
                          }))}
                        />
                        {specialization}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block text-sm font-medium text-gray-700">
                  Real estate license number
                  <input value={agentDetails.licenseNumber} onChange={(event) => setAgentDetails({ ...agentDetails, licenseNumber: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                </label>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-gray-700">Service areas (parishes) *</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {PARISHES.map((parish) => (
                      <label key={parish} className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={agentDetails.serviceAreas.includes(parish)}
                          onChange={(event) => setAgentDetails((current) => ({
                            ...current,
                            serviceAreas: event.target.checked
                              ? [...current.serviceAreas, parish]
                              : current.serviceAreas.filter((item) => item !== parish),
                          }))}
                        />
                        {parish}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block text-sm font-medium text-gray-700">
                  About you
                  <textarea rows={3} value={agentDetails.aboutMe} onChange={(event) => setAgentDetails({ ...agentDetails, aboutMe: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                </label>
              </section>
            )}
            {[
              { side: 'front', label: 'Front of ID', file: frontFile, uploaded: uploadedPaths.front },
              { side: 'back', label: 'Back of ID', file: backFile, uploaded: uploadedPaths.back },
              ...(session?.metadata?.role === 'agent'
                ? [
                    { side: 'license', label: 'Real estate agent license *', file: licenseFile, uploaded: uploadedPaths.license },
                    { side: 'registration', label: 'Business registration (optional)', file: registrationFile, uploaded: uploadedPaths.registration },
                  ]
                : []),
            ].map(({ side, label, file, uploaded }) => (
              <label key={side} className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-700">
                {file || uploaded ? <IdCard size={18} /> : <Upload size={18} />}
                <span className="min-w-0 flex-1 truncate">
                  {uploaded ? `${label.replace(' *', '')} uploaded` : file?.name || `Add ${label.toLowerCase()}`}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  capture="environment"
                  className="sr-only"
                  onChange={(event) => chooseFile(side, event.target.files?.[0])}
                />
              </label>
            ))}
            {session?.metadata?.role === 'agent' && (
              <>
                <label className="flex items-start gap-3 rounded-xl bg-blue-50 p-3 text-xs text-gray-700">
                  <input type="checkbox" checked={agentDetails.agreeToTerms} onChange={(event) => setAgentDetails({ ...agentDetails, agreeToTerms: event.target.checked })} className="mt-0.5" />
                  <span>I agree to the <a className="font-semibold text-accent underline" href="/terms-of-service" target="_blank" rel="noreferrer">Agent Terms and Conditions</a>.</span>
                </label>
                <label className="flex items-start gap-3 rounded-xl bg-blue-50 p-3 text-xs text-gray-700">
                  <input type="checkbox" checked={agentDetails.dataConsent} onChange={(event) => setAgentDetails({ ...agentDetails, dataConsent: event.target.checked })} className="mt-0.5" />
                  <span>I consent to sharing my contact and business details with clients requesting agent services.</span>
                </label>
              </>
            )}
            <label className="flex items-start gap-3 rounded-xl bg-red-50 p-3 text-xs text-gray-700">
              <input type="checkbox" checked={details.consent} onChange={(event) => setDetails({ ...details, consent: event.target.checked })} className="mt-0.5" />
              <span>I confirm this ID is mine and consent to identity verification.</span>
            </label>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={state === 'submitting'} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
              {state === 'submitting' ? <Loader2 size={14} className="animate-spin" /> : null}
              {state === 'submitting' ? submitStep || 'Submitting…' : 'Finish signup'}
            </button>
          </form>
          <p className="mt-3 text-center text-xs text-gray-500">
            Your desktop will update automatically after the documents are saved.
          </p>
        </div>
      </div>
    </div>
  );
}

/* Small helper for full-screen states */
function Screen({ icon, title, body }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-5 text-center">
      {icon}
      <p className="mt-3 font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-600">{body}</p>
    </div>
  );
}