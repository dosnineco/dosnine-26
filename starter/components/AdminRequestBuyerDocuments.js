import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ExternalLink, FileText, Image as ImageIcon, XCircle } from 'lucide-react';

export default function AdminRequestBuyerDocuments({ prequalification, onUpdated }) {
  const { getToken, isLoaded: authLoaded, userId } = useAuth();
  const [documents, setDocuments] = useState(prequalification?.documents || []);

  if (!prequalification) return null;

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
      throw new Error(payload.error || 'Unable to update buyer document');
    }
    return payload;
  };

  const rejectDocument = async (document) => {
    const notes = window.prompt('Reason for rejecting this document:');
    if (notes === null) return;
    if (!notes.trim()) {
      toast.error('Add a reason when rejecting a document.');
      return;
    }

    try {
      const payload = await sendAction({
        action: 'verify-document',
        documentId: document.id,
        approved: false,
        notes: notes.trim(),
      });
      setDocuments((current) => current.map((item) => item.id === document.id
        ? { ...item, status: 'rejected', review_notes: notes.trim() }
        : item));
      if (payload.emailSent === false) {
        toast.error(payload.error || 'Document rejected, but the resubmission email could not be sent');
      } else {
        toast.success('Document rejected and resubmission instructions emailed');
      }
      onUpdated?.();
    } catch (error) {
      toast.error(error.message || 'Unable to reject document');
    }
  };

  return (
    <section className="mt-4 rounded-xl bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Buyer financial readiness</h4>
          <p className="mt-0.5 text-xs text-slate-600">
            {prequalification.buyer_name} · {prequalification.status?.replaceAll('_', ' ')} · Level {prequalification.qualification_level}
          </p>
        </div>
        <Link
          href="/admin/buyer-prequalifications"
          className="text-xs font-semibold text-accent hover:underline"
        >
          Full assessment
        </Link>
      </div>
      {documents.length ? (
        <ul className="mt-3 space-y-2">
          {documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-3">
              {document.mime_type?.startsWith('image/')
                ? <ImageIcon size={15} className="text-slate-500" />
                : <FileText size={15} className="text-slate-500" />}
              <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                {document.file_name} <span className="text-xs text-slate-500">· {document.status}</span>
              </span>
              <a
                href={`/api/admin/buyer-prequalifications/document/${encodeURIComponent(document.id)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-accent"
                aria-label={`Open ${document.file_name} in a new tab`}
              >
                <ExternalLink size={15} />
                Open in new tab
              </a>
              {document.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => rejectDocument(document)}
                  className="rounded-lg bg-slate-50 p-2 text-red-700 hover:bg-red-50"
                  aria-label={`Reject ${document.file_name}`}
                >
                  <XCircle size={15} />
                </button>
              )}
              {document.review_notes && (
                <p className="basis-full text-xs text-red-700">Review note: {document.review_notes}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">No supporting documents uploaded.</p>
      )}
    </section>
  );
}
