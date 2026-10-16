import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ExternalLink, FileText, MapPin, RefreshCw } from 'lucide-react';

export default function AgentSharedBuyerRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/agent/shared-buyer-requests', {
        credentials: 'same-origin',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load shared requests');
      setRequests(payload.requests || []);
    } catch (error) {
      console.error('Loading shared buyer requests failed:', error);
      toast.error(error.message || 'Unable to load shared buyer requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  return (
    <section className="mb-8 rounded-2xl bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Requests shared with you</h2>
          <p className="mt-1 text-xs text-gray-500">Buyer-shared requests are view-only and do not change assignment.</p>
        </div>
        <button type="button" onClick={loadRequests} disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500">Loading shared requests…</p>
      ) : requests.length === 0 ? (
        <p className="rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500">No requests have been shared with you.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {requests.map((request) => (
            <article key={request.id} className="rounded-xl bg-gray-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold capitalize text-gray-900">Buy · {request.property_type}</h3>
                  <p className="mt-1 text-xs text-gray-500">Shared {new Date(request.shared_at).toLocaleDateString()}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-semibold uppercase text-blue-800">View only</span>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-sm text-gray-700">
                <MapPin size={15} className="text-gray-400" /> {request.location}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                Buyer: {request.buyer_prequalification.buyer_name}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Readiness: {request.buyer_prequalification.status?.replaceAll('_', ' ')} · Level {request.buyer_prequalification.qualification_level}
                {request.buyer_prequalification.financing_progress
                  ? ` · ${request.buyer_prequalification.financing_progress.replaceAll('_', ' ')}`
                  : ''}
              </p>
              {request.description && <p className="mt-2 text-sm text-gray-600">{request.description}</p>}

              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-gray-700">
                  Supporting documents ({request.buyer_prequalification.documents.length})
                </p>
                {request.buyer_prequalification.documents.length ? (
                  request.buyer_prequalification.documents.map((document) => (
                    <div key={document.id} className="flex items-center gap-2 rounded-lg bg-white p-2.5">
                      <FileText size={15} className="shrink-0 text-gray-500" />
                      <span className="min-w-0 flex-1 truncate text-xs text-gray-700">{document.file_name}</span>
                      <span className="text-[10px] text-gray-500">{document.status}</span>
                      <a
                        href={`/api/agent/buyer-documents/${encodeURIComponent(document.id)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-2 text-[10px] font-semibold text-gray-700 hover:text-accent"
                      >
                        <ExternalLink size={13} /> Open
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">No documents uploaded yet.</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
