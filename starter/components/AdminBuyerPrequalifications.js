import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Shield,
  XCircle,
} from 'lucide-react';

const levelLabels = {
  1: 'Buyer registered',
  2: 'Documents submitted',
  3: 'Financially verified',
  4: 'Financing confirmed',
};

const money = (value) => value == null || value === ''
  ? '—'
  : `J$${Number(value).toLocaleString()}`;

export default function AdminBuyerPrequalifications() {
  const { getToken, isLoaded: authLoaded, userId } = useAuth();
  const [prequalifications, setPrequalifications] = useState([]);
  const [status, setStatus] = useState('all');
  const [level, setLevel] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [budgets, setBudgets] = useState({});

  const loadPrequalifications = useCallback(async () => {
    if (!authLoaded) return;
    if (!userId) {
      setLoadError('Sign in again to manage buyer assessments.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({ status, level });
      const token = await getToken();
      if (!token) throw new Error('Your admin session has expired. Please sign in again.');
      const response = await fetch(`/api/admin/buyer-prequalifications?${params}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to load buyer assessments');
      }
      setPrequalifications(payload.prequalifications || []);
    } catch (error) {
      console.error('Buyer prequalification list failed:', error);
      setLoadError(error.message || 'Unable to load buyer assessments');
      toast.error(error.message || 'Unable to load buyer assessments');
    } finally {
      setLoading(false);
    }
  }, [status, level, authLoaded, userId, getToken]);

  useEffect(() => {
    if (!authLoaded) return;
    loadPrequalifications();
  }, [authLoaded, loadPrequalifications]);

  const sendAction = async (body) => {
    if (!authLoaded || !userId) throw new Error('Session expired. Please sign in again.');
    const token = await getToken();
    if (!token) throw new Error('Your admin session has expired. Please sign in again.');
    const response = await fetch('/api/admin/buyer-prequalifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || 'Unable to update assessment');
    }
    return payload;
  };

  const reviewDocument = async (document, approved) => {
    const notes = window.prompt(
      approved ? 'Optional review note:' : 'Reason for rejecting this document:',
      ''
    );
    if (notes === null) return;
    if (!approved && !notes.trim()) {
      toast.error('Add a reason when rejecting a document.');
      return;
    }

    try {
      const payload = await sendAction({
        action: 'verify-document',
        documentId: document.id,
        approved,
        notes: notes.trim(),
      });
      if (!approved && payload.emailSent === false) {
        toast.error(payload.error || 'Document rejected, but the resubmission email could not be sent');
      } else {
        toast.success(approved ? 'Document verified' : 'Document rejected and buyer notified');
      }
      await loadPrequalifications();
    } catch (error) {
      toast.error(error.message || 'Unable to review document');
    }
  };

  const setVerification = async (prequalification, nextLevel, nextStatus) => {
    const values = budgets[prequalification.id] || {};
    const min = values.min === '' || values.min == null ? null : Number(values.min);
    const max = values.max === '' || values.max == null ? null : Number(values.max);
    if ((min != null && !Number.isFinite(min)) || (max != null && !Number.isFinite(max))) {
      toast.error('Enter valid verified budget amounts.');
      return;
    }
    if (min != null && max != null && min > max) {
      toast.error('The minimum budget cannot exceed the maximum.');
      return;
    }
    if (nextStatus === 'confirmed' &&
      !window.confirm('Confirm that financing has been approved and evidence reviewed?')) return;

    try {
      const result = await sendAction({
        action: 'set-verification',
        prequalificationId: prequalification.id,
        status: nextStatus,
        level: nextLevel,
        verifiedBudgetMin: min,
        verifiedBudgetMax: max,
        notes: values.notes || '',
      });
      if (result.emailSent === false) {
        toast.error(result.emailError || 'Buyer readiness updated, but the approval email could not be sent.');
      } else {
        toast.success('Buyer readiness updated');
      }
      await loadPrequalifications();
    } catch (error) {
      toast.error(error.message || 'Unable to update verification');
    }
  };

  const rejectPrequalification = async (prequalification) => {
    const notes = window.prompt('Reason for rejecting this assessment:');
    if (notes === null) return;
    try {
      await sendAction({
        action: 'set-verification',
        prequalificationId: prequalification.id,
        status: 'rejected',
        level: 1,
        notes: notes.trim(),
      });
      toast.success('Assessment rejected');
      await loadPrequalifications();
    } catch (error) {
      toast.error(error.message || 'Unable to reject assessment');
    }
  };

  return (
    <div className="space-y-5 ">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buyer prequalifications</h1>
          <p className="mt-1 text-sm text-gray-700">Review financial readiness and private supporting documents.</p>
        </div>
        <button type="button" onClick={loadPrequalifications} disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-2xl bg-white p-4 sm:p-5">
        <label className="flex min-w-[190px] flex-1 flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-700 sm:flex-none">
          Status
          <span className="relative">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-300 bg-white py-2.5 pl-3.5 pr-10 text-sm font-medium normal-case tracking-normal text-gray-900 transition hover:border-gray-400 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-100"
            >
              {['all', 'registered', 'under_review', 'verified', 'confirmed', 'rejected', 'expired']
                .map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}
            </select>
            <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-600" />
          </span>
        </label>
        <label className="flex min-w-[190px] flex-1 flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-700 sm:flex-none">
          Level
          <span className="relative">
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-300 bg-white py-2.5 pl-3.5 pr-10 text-sm font-medium normal-case tracking-normal text-gray-900 transition hover:border-gray-400 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-100"
            >
              <option value="all">All levels</option>
              {[1, 2, 3, 4].map((value) => <option key={value} value={value}>Level {value}</option>)}
            </select>
            <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-600" />
          </span>
        </label>
        <span className="ml-auto self-center rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-800">
          {prequalifications.length} submission{prequalifications.length === 1 ? '' : 's'}
        </span>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white p-10 text-center text-sm text-gray-700">Loading assessments…</div>
      ) : loadError ? (
        <div role="alert" className="rounded-xl bg-red-50 p-6 text-sm text-red-700">
          Buyer assessments could not be loaded: {loadError}
        </div>
      ) : prequalifications.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center text-sm text-gray-700">No buyer assessments found.</div>
      ) : (
        <div className="space-y-4">
          {prequalifications.map((item) => (
            <details key={item.id} className="group rounded-2xl bg-white p-5">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-800 [&::-webkit-details-marker]:hidden">
                <span className="font-bold text-gray-900">{item.buyer_name}</span>
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800">
                  Level {item.qualification_level}: {levelLabels[item.qualification_level]}
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-800">
                  {item.status.replace('_', ' ')}
                </span>
                <span className="ml-auto text-xs font-medium text-gray-700">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
                <span className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-gray-700 sm:pl-1">
                  <span>{item.purchase_method.replaceAll('_', ' ')}</span>
                  <span>Target: {money(item.target_property_price)}</span>
                  <span>{item.documents?.length || 0} document{item.documents?.length === 1 ? '' : 's'}</span>
                  <ChevronDown size={15} className="ml-auto transition-transform group-open:rotate-180" />
                </span>
              </summary>

              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="grid gap-2 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-3">
                  <p>Email: <strong className="break-all text-gray-800">{item.buyer_email}</strong></p>
                  <p>Phone: <strong className="text-gray-800">{item.buyer_phone}</strong></p>
                  <p>Purchase method: <strong className="text-gray-800">{item.purchase_method.replaceAll('_', ' ')}</strong></p>
                  <p>Target price: <strong className="text-gray-800">{money(item.target_property_price)}</strong></p>
                  <p>Monthly income: <strong className="text-gray-800">{money(item.monthly_income)}</strong></p>
                  <p>Deposit: <strong className="text-gray-800">{money(item.deposit_available)}</strong></p>
                  <p>Financing progress: <strong className="text-gray-800">{item.financing_progress || '—'}</strong></p>
                  <p>Lender: <strong className="text-gray-800">{item.lender_name || '—'}</strong></p>
                  <p>Share consent: <strong className="text-gray-800">{item.consent_to_share ? 'Granted' : 'Not granted'}</strong></p>
                  {item.service_request_id && <p className="sm:col-span-2 lg:col-span-3">Request: <strong className="break-all text-gray-800">{item.service_request_id}</strong></p>}
                  {item.financing_conditions && <p className="sm:col-span-2 lg:col-span-3">Conditions: {item.financing_conditions}</p>}
                  {item.verification_notes && <p className="sm:col-span-2 lg:col-span-3">Review notes: {item.verification_notes}</p>}
                </div>
              </div>

              <div className="mt-5 border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-800">Documents ({item.documents?.length || 0})</h3>
                {item.documents?.length ? (
                  <div className="mt-2 space-y-2">
                    {item.documents.map((document) => (
                      <div key={document.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-3">
                        {document.mime_type?.startsWith('image/')
                          ? <ImageIcon size={16} className="text-gray-700" />
                          : <FileText size={16} className="text-gray-700" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800">{document.file_name}</p>
                          <p className="text-xs text-gray-700">
                            {document.document_type.replaceAll('_', ' ')} · {document.status}
                            {document.review_notes ? ` · ${document.review_notes}` : ''}
                          </p>
                        </div>
                        <a
                          href={`/api/admin/buyer-prequalifications/document/${encodeURIComponent(document.id)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:text-red-800"
                          aria-label={`Open ${document.file_name} in a new tab`}
                        >
                          <ExternalLink size={15} />
                          Open in new tab
                        </a>
                        {document.status === 'pending' && (
                          <>
                            <button type="button" onClick={() => reviewDocument(document, true)}
                              className="rounded-lg bg-white p-2 text-emerald-700 hover:bg-emerald-50" aria-label="Approve document">
                              <CheckCircle2 size={16} />
                            </button>
                            <button type="button" onClick={() => reviewDocument(document, false)}
                              className="rounded-lg bg-white p-2 text-red-700 hover:bg-red-50" aria-label="Reject document">
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-700">No supporting documents uploaded.</p>
                )}
              </div>

              <div className="mt-5 grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs font-semibold text-gray-700">
                  Verified budget minimum (JMD)
                  <input type="number" min="0" step="1"
                    value={budgets[item.id]?.min ?? item.verified_budget_min ?? ''}
                    onChange={(event) => setBudgets((current) => ({
                      ...current,
                      [item.id]: { ...current[item.id], min: event.target.value },
                    }))}
                    className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm text-gray-900" />
                </label>
                <label className="text-xs font-semibold text-gray-700">
                  Verified budget maximum (JMD)
                  <input type="number" min="0" step="1"
                    value={budgets[item.id]?.max ?? item.verified_budget_max ?? ''}
                    onChange={(event) => setBudgets((current) => ({
                      ...current,
                      [item.id]: { ...current[item.id], max: event.target.value },
                    }))}
                    className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm text-gray-900" />
                </label>
                <label className="text-xs font-semibold text-gray-700 sm:col-span-2">
                  Verification note
                  <input maxLength={2000} value={budgets[item.id]?.notes ?? ''}
                    onChange={(event) => setBudgets((current) => ({
                      ...current,
                      [item.id]: { ...current[item.id], notes: event.target.value },
                    }))}
                    className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm text-gray-900" />
                </label>
                <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
                  <button type="button" onClick={() => setVerification(item, 3, 'verified')}
                    className="rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                    <Shield size={13} className="mr-1 inline" /> Mark Level 3 verified
                  </button>
                  <button type="button" onClick={() => setVerification(item, 4, 'confirmed')}
                    className="rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                    <CheckCircle2 size={13} className="mr-1 inline" /> Confirm Level 4
                  </button>
                  <button type="button" onClick={() => rejectPrequalification(item)}
                    className="ml-auto rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
                    <AlertCircle size={13} className="mr-1 inline" /> Reject assessment
                  </button>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
