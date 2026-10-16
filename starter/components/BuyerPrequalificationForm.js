import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { CheckCircle2, FileText, Image as ImageIcon, ShieldCheck, Upload } from 'lucide-react';

const PURCHASE_METHODS = [
  ['mortgage', 'Bank or credit union mortgage'],
  ['cash', 'Cash purchase'],
  ['nht', 'NHT financing'],
  ['savings_and_financing', 'Savings + financing'],
  ['still_saving', 'Still saving for a deposit'],
];

const DOCUMENT_TYPES = [
  ['mortgage_prequalification', 'Mortgage prequalification / preapproval'],
  ['mortgage_approval', 'Mortgage approval'],
  ['proof_of_savings', 'Proof of savings'],
  ['proof_of_funds', 'Proof of funds'],
  ['nht_documentation', 'NHT eligibility / financing'],
  ['family_contribution', 'Family contribution'],
  ['self_employed_income', 'Self-employed income'],
  ['bank_confirmation', 'Bank confirmation'],
  ['other', 'Other supporting document'],
];
const DOCUMENT_GUIDANCE = {
  mortgage_prequalification: 'A lender letter showing your prequalification or preapproval.',
  mortgage_approval: 'An approval letter or current financing decision from your lender.',
  proof_of_savings: 'A recent statement showing savings available toward your purchase.',
  proof_of_funds: 'Evidence of funds available for a cash purchase or closing costs.',
  nht_documentation: 'NHT eligibility, benefit, or financing documents.',
  family_contribution: 'Evidence of a contribution you have permission to share.',
  self_employed_income: 'Recent business or income records that help explain your finances.',
  bank_confirmation: 'A bank letter or confirmation related to your purchase financing.',
  other: 'Another relevant document that helps explain your purchase readiness.',
};

const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const inputClass = 'w-full rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-accent';
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700';

function getFileMimeType(file) {
  if (ALLOWED_MIME.includes(file.type)) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  return ({
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    pdf: 'application/pdf',
  })[extension] || '';
}

export default function BuyerPrequalificationForm({
  serviceRequestId,
  initialBuyer = {},
  initialPrequalificationId,
  initialAccessToken,
}) {
  const router = useRouter();
  const initialBuyerName = initialBuyer.buyerName || '';
  const initialBuyerEmail = initialBuyer.buyerEmail || '';
  const initialBuyerPhone = initialBuyer.buyerPhone || '';
  const initialTargetPropertyPrice = initialBuyer.targetPropertyPrice || '';
  const initialServiceRequestId = initialBuyer.serviceRequestId || serviceRequestId;
  const fileInput = useRef(null);
  const [step, setStep] = useState(1);
  const [prequalification, setPrequalification] = useState(null);
  const [accessToken, setAccessToken] = useState('');
  const [documents, setDocuments] = useState([]);
  const [documentType, setDocumentType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [form, setForm] = useState({
    buyerName: '',
    buyerEmail: '',
    buyerPhone: '',
    purchaseMethod: 'mortgage',
    targetPropertyPrice: '',
    monthlyIncome: '',
    depositAvailable: '',
    employmentType: 'employed',
    financingProgress: 'not_applied',
    lenderName: '',
    financingConditions: '',
    consentToShare: false,
  });

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;

    const prefillKey = serviceRequestId
      ? `dosnine:buyer-prequalification:${serviceRequestId}`
      : null;
    let prefill = null;
    if (prefillKey) {
      try {
        prefill = JSON.parse(sessionStorage.getItem(prefillKey) || 'null');
      } catch (error) {
        console.error('Could not read saved buyer prequalification details:', error);
      }
    }
    prefill = {
      ...prefill,
      buyerName: initialBuyerName || prefill?.buyerName || '',
      buyerEmail: initialBuyerEmail || prefill?.buyerEmail || '',
      buyerPhone: initialBuyerPhone || prefill?.buyerPhone || '',
      targetPropertyPrice: initialTargetPropertyPrice || prefill?.targetPropertyPrice || '',
      serviceRequestId: initialServiceRequestId,
      prequalificationId: initialPrequalificationId || prefill?.prequalificationId,
    };
    if (prefill?.serviceRequestId === serviceRequestId) {
      setForm((current) => ({
        ...current,
        buyerName: current.buyerName || prefill.buyerName || '',
        buyerEmail: current.buyerEmail || prefill.buyerEmail || '',
        buyerPhone: current.buyerPhone || prefill.buyerPhone || '',
        targetPropertyPrice: current.targetPropertyPrice || String(prefill.targetPropertyPrice || ''),
      }));
    }

    const queryToken = typeof router.query.accessToken === 'string'
      ? router.query.accessToken
      : '';
    const queryPrequalificationId = typeof router.query.prequalificationId === 'string'
      ? router.query.prequalificationId
      : '';
    const savedId = queryPrequalificationId || initialPrequalificationId || prefill?.prequalificationId;
    const savedToken = queryToken || initialAccessToken || (savedId
      ? sessionStorage.getItem(`dosnine:buyer-prequalification-access:${savedId}`)
      : '');

    if (!savedId || !savedToken) return undefined;

    const loadExistingAssessment = async () => {
      try {
        const params = new URLSearchParams({
          prequalificationId: savedId,
          accessToken: savedToken,
        });
        const response = await fetch(`/api/buyer-prequalification/access?${params}`);
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'This assessment link is no longer available');
        }
        if (cancelled) return;
        const assessment = payload.prequalification;
        setPrequalification(assessment);
        setAccessToken(savedToken);
        sessionStorage.setItem(
          `dosnine:buyer-prequalification-access:${assessment.id}`,
          savedToken
        );
        setDocuments(assessment.documents || []);
        setForm((current) => ({
          ...current,
          buyerName: assessment.buyer_name || current.buyerName,
          buyerEmail: assessment.buyer_email || current.buyerEmail,
          buyerPhone: assessment.buyer_phone || current.buyerPhone,
          purchaseMethod: assessment.purchase_method || current.purchaseMethod,
          targetPropertyPrice: assessment.target_property_price == null ? current.targetPropertyPrice : String(assessment.target_property_price),
          monthlyIncome: assessment.monthly_income == null ? current.monthlyIncome : String(assessment.monthly_income),
          depositAvailable: assessment.deposit_available == null ? current.depositAvailable : String(assessment.deposit_available),
          employmentType: assessment.employment_type || current.employmentType,
          financingProgress: assessment.financing_progress || current.financingProgress,
          lenderName: assessment.lender_name || current.lenderName,
          financingConditions: assessment.financing_conditions || current.financingConditions,
          consentToShare: Boolean(assessment.consent_to_share),
        }));
        setStep(2);
      } catch (error) {
        if (!cancelled) toast.error(error.message || 'Unable to reopen this assessment');
      }
    };

    loadExistingAssessment();
    return () => { cancelled = true; };
  }, [
    router.isReady,
    router.query.accessToken,
    router.query.prequalificationId,
    serviceRequestId,
    initialBuyerName,
    initialBuyerEmail,
    initialBuyerPhone,
    initialTargetPropertyPrice,
    initialServiceRequestId,
    initialPrequalificationId,
    initialAccessToken,
  ]);

  const submitAssessment = async (event) => {
    event.preventDefault();
    if (!form.consentToShare) {
      toast.error('Consent is required to share verified readiness with agents.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/buyer-prequalification/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          ...form,
          targetPropertyPrice: form.targetPropertyPrice || '',
          monthlyIncome: form.monthlyIncome || '',
          depositAvailable: form.depositAvailable || '',
          serviceRequestId: serviceRequestId || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to save your assessment');
      }
      setPrequalification(payload.prequalification);
      setAccessToken(payload.accessToken);
      sessionStorage.setItem(
        `dosnine:buyer-prequalification-access:${payload.prequalification.id}`,
        payload.accessToken
      );
      if (serviceRequestId) {
        sessionStorage.setItem(
          `dosnine:buyer-prequalification:${serviceRequestId}`,
          JSON.stringify({
            serviceRequestId,
            prequalificationId: payload.prequalification.id,
            buyerName: form.buyerName,
            buyerEmail: form.buyerEmail,
            buyerPhone: form.buyerPhone,
            targetPropertyPrice: form.targetPropertyPrice,
          })
        );
      }
      setStep(2);
      toast.success('Assessment saved. You can now add supporting documents.');
      if (!payload.serviceRequestLinked) {
        toast.error('Your assessment was saved, but the email did not match the request, so it was not linked.');
      }
    } catch (error) {
      toast.error(error.message || 'Unable to save your assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const chooseDocument = (type) => {
    setDocumentType(type);
    if (fileInput.current) {
      fileInput.current.value = '';
      fileInput.current.click();
    }
  };

  const uploadDocument = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !prequalification || !documentType) return;
    const mimeType = getFileMimeType(file);
    if (!ALLOWED_MIME.includes(mimeType)) {
      toast.error('Choose a PDF or JPEG, PNG, WebP, or HEIC image.');
      return;
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      toast.error('Files must be between 1 byte and 10 MB.');
      return;
    }

    setUploading(true);
    try {
      const urlResponse = await fetch('/api/buyer-prequalification/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          prequalificationId: prequalification.id,
          accessToken,
          documentType,
          filename: file.name,
          mimeType,
          fileSize: file.size,
        }),
      });
      const urlPayload = await urlResponse.json();
      if (!urlResponse.ok || !urlPayload.success) {
        throw new Error(urlPayload.error || 'Unable to prepare the upload');
      }

      const uploadResponse = await fetch(urlPayload.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error('The file could not be uploaded to secure storage');

      const registerResponse = await fetch('/api/buyer-prequalification/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          prequalificationId: prequalification.id,
          accessToken,
          documentType,
          filePath: urlPayload.path,
          fileName: file.name,
          fileSize: file.size,
          mimeType,
        }),
      });
      const registerPayload = await registerResponse.json();
      if (!registerResponse.ok || !registerPayload.success) {
        throw new Error(registerPayload.error || 'Unable to register the uploaded document');
      }

      setDocuments((current) => [...current, {
        ...registerPayload.document,
        file_name: file.name,
        mime_type: mimeType,
      }]);
      setPrequalification((current) => ({
        ...current,
        qualification_level: registerPayload.levelInfo.level,
        status: registerPayload.levelInfo.status,
      }));
      toast.success('Document uploaded securely.');
    } catch (error) {
      console.error('Buyer document upload failed:', error);
      toast.error(error.message || 'Document upload failed');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  if (complete) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl  p-8 text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-accent" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Assessment submitted</h1>
        <p className="mt-2 text-sm text-gray-600">
          {documents.length
            ? 'Your documents are stored privately and will be reviewed by Dosnine.'
            : 'Your registration is saved at Level 1. Your readiness can be updated after documents are reviewed.'}
        </p>
        <p className="mt-4 text-xs text-gray-500">
          This readiness assessment is not a loan approval or financial advice.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl rounded-2xl  p-5 sm:p-8">
      <h1 className="text-2xl font-bold text-gray-900">Buyer Financial Check</h1>
      <p className="mt-1 text-sm text-gray-600">
        Share your purchase plan and, if available, documents for private verification by Dosnine.
      </p>

      {step === 1 ? (
        <form className="mt-6 space-y-5" onSubmit={submitAssessment}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="buyer-name">Full name *</label>
              <input id="buyer-name" className={inputClass} autoComplete="name" maxLength={120} required
                value={form.buyerName} onChange={(event) => updateField('buyerName', event.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="buyer-email">Email *</label>
              <input id="buyer-email" type="email" className={inputClass} autoComplete="email" maxLength={254} required
                value={form.buyerEmail} onChange={(event) => updateField('buyerEmail', event.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="buyer-phone">Phone *</label>
              <input id="buyer-phone" type="tel" className={inputClass} autoComplete="tel" minLength={7} maxLength={40} required
                value={form.buyerPhone} onChange={(event) => updateField('buyerPhone', event.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="buyer-employment">Employment / income source</label>
              <select id="buyer-employment" className={inputClass} value={form.employmentType}
                onChange={(event) => updateField('employmentType', event.target.value)}>
                <option value="employed">Employed</option>
                <option value="self_employed">Self-employed / business owner</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="purchase-method">How do you plan to purchase?</label>
            <select id="purchase-method" className={inputClass} value={form.purchaseMethod}
              onChange={(event) => updateField('purchaseMethod', event.target.value)}>
              {PURCHASE_METHODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['targetPropertyPrice', 'Target property price (JMD)'],
              ['monthlyIncome', 'Monthly income (JMD)'],
              ['depositAvailable', 'Deposit available (JMD)'],
            ].map(([field, label]) => (
              <div key={field}>
                <label className={labelClass} htmlFor={field}>{label}</label>
                <input id={field} type="number" min="0" step="1" inputMode="numeric" className={inputClass}
                  value={form[field]} onChange={(event) => updateField(field, event.target.value)} />
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="financing-progress">Financing progress</label>
              <select id="financing-progress" className={inputClass} value={form.financingProgress}
                onChange={(event) => updateField('financingProgress', event.target.value)}>
                <option value="not_applied">Not yet applied</option>
                <option value="submitted">Application submitted</option>
                <option value="prequalified">Prequalified / preapproved</option>
                <option value="approved">Approved (with or without conditions)</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="lender-name">Lender (optional)</label>
              <input id="lender-name" className={inputClass} maxLength={160} value={form.lenderName}
                onChange={(event) => updateField('lenderName', event.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="financing-conditions">Financing conditions (optional)</label>
            <textarea id="financing-conditions" rows={3} maxLength={1000} className={inputClass}
              value={form.financingConditions}
              onChange={(event) => updateField('financingConditions', event.target.value)} />
          </div>

          <label className="flex items-start gap-3 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
            <input type="checkbox" className="mt-1 accent-accent" checked={form.consentToShare}
              onChange={(event) => updateField('consentToShare', event.target.checked)} />
            <span>
              <ShieldCheck className="mr-1 inline h-4 w-4 text-accent" />
              I consent to Dosnine reviewing my information and sharing my verified readiness,
              financing progress, verified budget range, and supporting documents with the agent
              assigned to my linked purchase request.
            </span>
          </label>

          <button type="submit" disabled={submitting}
            className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50">
            {submitting ? 'Saving assessment…' : 'Continue to document upload'}
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="rounded-2xl bg-accent/5 p-5">
            <div className="flex items-start gap-3">
             
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-600" /> Submit relevant evidence</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-accent" /> Reviewed by Dosnine</span>
              <span>PDF or image · up to 10 MB each</span>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Supporting documents</h2>
              <p className="mt-1 text-xs text-gray-500">Choose the types that apply to your situation. You do not need to upload every type.</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {documents.length} uploaded
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {DOCUMENT_TYPES.map(([type, label]) => {
              const matchingDocuments = documents.filter((document) => document.document_type === type);
              const hasPending = matchingDocuments.some((document) => document.status === 'pending');
              const hasReviewed = matchingDocuments.some((document) => document.status === 'reviewed');
              const needsReplacement = matchingDocuments.some((document) => document.status === 'rejected');
              const statusLabel = hasPending
                ? 'Under review'
                : needsReplacement
                  ? 'Needs replacement'
                  : hasReviewed
                    ? 'Reviewed'
                    : 'Optional';

              return (
                <div key={type} className="flex min-h-40 flex-col rounded-xl bg-gray-50 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 rounded-lg bg-gray-200 p-2 text-gray-600">
                        <FileText size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800">{label}</h3>
                        <p className="mt-1 text-xs leading-5 text-gray-500">{DOCUMENT_GUIDANCE[type]}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                      hasPending
                        ? 'bg-amber-100 text-amber-800'
                        : needsReplacement
                          ? 'bg-red-100 text-red-700'
                          : hasReviewed
                            ? 'bg-emerald-100 text-emerald-800'
                            : ' text-gray-500'
                    }`}>
                      {statusLabel}
                    </span>
                  </div>
                  {matchingDocuments.length > 0 && (
                    <p className="mt-3 truncate text-xs text-gray-600" title={matchingDocuments[matchingDocuments.length - 1].file_name}>
                      Latest: {matchingDocuments[matchingDocuments.length - 1].file_name}
                    </p>
                  )}
                  <button
                    key={`${type}-upload`}
                    type="button"
                    disabled={uploading}
                    onClick={() => chooseDocument(type)}
                    className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg bg-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-800 transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload size={14} />
                    {needsReplacement ? 'Upload replacement' : matchingDocuments.length ? 'Add another file' : 'Upload document'}
                  </button>
                </div>
              );
            })}
          </div>
          <input ref={fileInput} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            onChange={uploadDocument} />

          {documents.length > 0 && (
            <section className="rounded-xl  p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Uploaded files</h2>
                  <p className="mt-1 text-xs text-gray-500">Your documents are stored privately and reviewed by Dosnine.</p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                  {documents.length} file{documents.length === 1 ? '' : 's'}
                </span>
              </div>
              <ul className="mt-4 space-y-2">
              {documents.map((document) => (
                <li key={document.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 p-3 sm:p-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="shrink-0 rounded-lg bg-gray-200 p-2 text-gray-600">
                      {document.mime_type?.startsWith('image/')
                        ? <ImageIcon size={16} />
                        : <FileText size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800" title={document.file_name}>{document.file_name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{DOCUMENT_TYPES.find(([type]) => type === document.document_type)?.[1] || 'Supporting document'}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                    document.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : document.status === 'reviewed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                  }`}>
                    {(document.status || 'uploaded').replaceAll('_', ' ')}
                  </span>
                  {document.status === 'rejected' && (
                    <button type="button" disabled={uploading} onClick={() => chooseDocument(document.document_type)}
                      className="rounded-lg bg-gray-200 px-3 py-2 text-xs font-semibold text-gray-800 transition hover:bg-gray-300 disabled:opacity-50">
                      Replace
                    </button>
                  )}
                  {document.status === 'rejected' && document.review_notes && (
                    <p className="basis-full rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">Review note: {document.review_notes}</p>
                  )}
                </li>
              ))}
              </ul>
            </section>
          )}

          <div>
            <button type="button" onClick={() => setComplete(true)} disabled={uploading}
              className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50">
              {documents.length ? 'Finish submission' : 'Finish without documents'}
            </button>
          </div>
          {uploading && <p className="text-center text-sm text-gray-500">Uploading securely…</p>}
        </div>
      )}
    </div>
  );
}
