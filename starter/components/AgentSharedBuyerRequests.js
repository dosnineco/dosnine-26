import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ExternalLink,
  FileText,
  MapPin,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

export default function AgentSharedBuyerRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/agent/shared-buyer-requests', {
        credentials: 'same-origin',
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || 'Unable to load shared requests');
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
    <section className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* ---- Header (clickable to collapse) ---- */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="shared-buyer-requests-panel"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-gray-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <ChevronDown
            size={18}
            className={`shrink-0 text-gray-500 transition-transform duration-200 ${
              open ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Requests shared with you
              </h2>
              {!loading && requests.length > 0 && (
                <span className="rounded-full bg-[#2373F4]/10 px-2 py-0.5 text-[11px] font-bold text-[#2373F4]">
                  {requests.length}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              Buyer-shared requests are view-only and do not change assignment.
            </p>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              loadRequests();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={loading ? 'animate-spin' : ''}
            />
            Refresh
          </button>
        </div>
      </button>

      {/* ---- Collapsible body ---- */}
      {open && (
        <div
          id="shared-buyer-requests-panel"
          className="border-t border-gray-100 px-5 pb-5 pt-4"
        >
          {loading ? (
            <p className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center text-sm text-gray-500">
              Loading shared requests…
            </p>
          ) : requests.length === 0 ? (
            <p className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center text-sm text-gray-500">
              No requests have been shared with you.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {requests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  {/* ---- Header ---- */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold capitalize text-gray-900">
                        Buy · {request.property_type}
                      </h3>
                      <p className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700">
                        <span className="font-semibold text-gray-900">
                          Shared
                        </span>
                        {new Date(request.shared_at).toLocaleDateString(
                          undefined,
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }
                        )}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#2373F4]/10 px-2.5 py-1 text-[10px] font-semibold uppercase text-[#2373F4]">
                      View only
                    </span>
                  </div>

                  {/* ---- Location ---- */}
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-gray-700">
                    <MapPin size={15} className="text-gray-400" />{' '}
                    {request.location}
                  </p>

                  {/* ---- Buyer + contact ---- */}
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Buyer
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {request.buyer_prequalification.buyer_name}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                      {request.buyer_prequalification.buyer_email && (
                        <a
                          className="hover:text-[#2373F4]"
                          href={`mailto:${request.buyer_prequalification.buyer_email}`}
                        >
                          {request.buyer_prequalification.buyer_email}
                        </a>
                      )}
                      {request.buyer_prequalification.buyer_phone && (
                        <a
                          className="hover:text-[#2373F4]"
                          href={`tel:${request.buyer_prequalification.buyer_phone}`}
                        >
                          {request.buyer_prequalification.buyer_phone}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* ---- Details grid ---- */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 sm:grid-cols-3">
                    {request.budget_min != null && (
                      <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Budget min
                        </p>
                        <p className="mt-0.5 font-semibold text-gray-900">
                          J${Number(request.budget_min).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {request.budget_max != null && (
                      <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Budget max
                        </p>
                        <p className="mt-0.5 font-semibold text-gray-900">
                          J${Number(request.budget_max).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {request.bedrooms != null && (
                      <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Bedrooms
                        </p>
                        <p className="mt-0.5 font-semibold text-gray-900">
                          {request.bedrooms}
                        </p>
                      </div>
                    )}
                    {request.bathrooms != null && (
                      <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Bathrooms
                        </p>
                        <p className="mt-0.5 font-semibold text-gray-900">
                          {request.bathrooms}
                        </p>
                      </div>
                    )}
                    {request.buyer_prequalification.purchase_method && (
                      <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Purchase method
                        </p>
                        <p className="mt-0.5 font-semibold capitalize text-gray-900">
                          {request.buyer_prequalification.purchase_method.replaceAll(
                            '_',
                            ' '
                          )}
                        </p>
                      </div>
                    )}
                    {request.buyer_prequalification.target_property_price !=
                      null && (
                      <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Target price
                        </p>
                        <p className="mt-0.5 font-semibold text-gray-900">
                          J$
                          {Number(
                            request.buyer_prequalification
                              .target_property_price
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {request.buyer_prequalification.monthly_income != null && (
                      <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Monthly income
                        </p>
                        <p className="mt-0.5 font-semibold text-gray-900">
                          J$
                          {Number(
                            request.buyer_prequalification.monthly_income
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {request.buyer_prequalification.deposit_available !=
                      null && (
                      <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Deposit available
                        </p>
                        <p className="mt-0.5 font-semibold text-gray-900">
                          J$
                          {Number(
                            request.buyer_prequalification.deposit_available
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {request.buyer_prequalification.lender_name && (
                      <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Lender
                        </p>
                        <p className="mt-0.5 font-semibold text-gray-900">
                          {request.buyer_prequalification.lender_name}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ---- Readiness ---- */}
                  <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Readiness
                    </p>
                    <p className="mt-0.5 text-xs text-gray-800">
                      <span className="font-semibold capitalize">
                        {request.buyer_prequalification.status?.replaceAll(
                          '_',
                          ' '
                        ) || '—'}
                      </span>
                      <span className="mx-1.5 text-gray-300">·</span>
                      Level{' '}
                      {request.buyer_prequalification.qualification_level}
                      {request.buyer_prequalification.financing_progress ? (
                        <>
                          <span className="mx-1.5 text-gray-300">·</span>
                          <span className="capitalize">
                            {request.buyer_prequalification.financing_progress.replaceAll(
                              '_',
                              ' '
                            )}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>

                  {request.description && (
                    <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      {request.description}
                    </p>
                  )}

                  {/* ---- Supporting documents ---- */}
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Supporting documents (
                      {request.buyer_prequalification.documents.length})
                    </p>
                    {request.buyer_prequalification.documents.length ? (
                      <div className="space-y-2">
                        {request.buyer_prequalification.documents.map(
                          (document) => (
                            <div
                              key={document.id}
                              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2.5"
                            >
                              <FileText
                                size={15}
                                className="shrink-0 text-gray-500"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-gray-900">
                                  {document.file_name}
                                </p>
                                <p className="text-[10px] capitalize text-gray-500">
                                  {document.status}
                                </p>
                              </div>
                              <a
                                href={`/api/agent/buyer-documents/${encodeURIComponent(
                                  document.id
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-gray-700 hover:text-[#2373F4]"
                              >
                                <ExternalLink size={12} /> Open
                              </a>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed border-gray-300 bg-white py-3 text-center text-xs text-gray-500">
                        No documents uploaded yet.
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}