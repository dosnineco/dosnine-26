import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { Share2, X } from 'lucide-react';

export default function BuyerRequestAgentSharing({ requestId, canShare }) {
  const { getToken, isLoaded: authLoaded, userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState([]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [consented, setConsented] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadShares = useCallback(async () => {
    if (!authLoaded || !userId) return;
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      const response = await fetch(`/api/buyer/my-requests/${encodeURIComponent(requestId)}/shares`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(response.status === 401
          ? 'Your session has expired. Please sign in again.'
          : payload.error || 'Unable to load sharing options');
      }
      setShares(payload.shares || []);
    } catch (loadError) {
      console.error('Loading buyer request shares failed:', loadError);
      setError(loadError.message || 'Unable to load sharing options');
    } finally {
      setLoading(false);
    }
  }, [authLoaded, getToken, requestId, userId]);

  useEffect(() => {
    if (open && authLoaded) loadShares();
  }, [authLoaded, open, loadShares]);

  const changeShare = async (method, shareId) => {
    setSaving(true);
    try {
      if (!authLoaded || !userId) {
        throw new Error('Please sign in again to update request sharing.');
      }
      const token = await getToken();
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      const body = method === 'POST'
        ? { email: recipientEmail.trim() }
        : { shareId };
      const response = await fetch(`/api/buyer/my-requests/${encodeURIComponent(requestId)}/shares`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(response.status === 401
          ? 'Your session has expired. Please sign in again.'
          : payload.error || 'Unable to update request sharing');
      }
      setConsented(false);
      setRecipientEmail('');
      await loadShares();
      if (payload.alreadyShared) {
        toast.success('This request is already shared with that agent.');
        return;
      }
      if (method === 'POST' && payload.mode === 'account' && payload.emailSent === false) {
        toast.error(payload.emailError || 'Request shared, but the notification email could not be sent.');
        return;
      }
      toast.success(method === 'POST'
        ? payload.mode === 'account'
          ? 'Request shared and agent emailed'
          : 'Seven-day viewing invitation sent'
        : 'Agent access removed');
    } catch (shareError) {
      toast.error(shareError.message || 'Unable to update request sharing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
      >
        <Share2 size={14} />
        {open ? 'Close sharing' : 'Share with an agent'}
      </button>

      {open && (
        <section className="mt-3 rounded-xl bg-white p-4 ring-1 ring-gray-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Share request for viewing</h3>
              <p className="mt-1 text-xs leading-5 text-gray-600">
                Enter the agent’s email address. An existing Dosnine agent account keeps view-only access
                until you remove it. Otherwise, we email a private viewing link that expires in seven days.
                Each request is shared once per agent; repeating the same share will not create another access record or send another email. Sharing does not assign or transfer your request.
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close sharing options"
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>

          {loading ? (
            <p className="mt-3 text-xs text-gray-500">Loading sharing access…</p>
          ) : error ? (
            <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>
          ) : (
            <>
              {canShare ? (
                <>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      required
                      value={recipientEmail}
                      onChange={(event) => setRecipientEmail(event.target.value)}
                      placeholder="Agent email address"
                      aria-label="Agent email address"
                      className="min-w-0 flex-1 rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-900"
                    />
                    <button type="button" disabled={!recipientEmail.trim() || !consented || saving}
                      onClick={() => changeShare('POST')}
                      className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50">
                      {saving ? 'Sending…' : 'Share request'}
                    </button>
                  </div>
                  <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-gray-600">
                    <input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)}
                      className="mt-0.5 accent-accent" />
                    I authorize the agent at this email address to view this request, my readiness assessment,
                    and its supporting documents. This does not assign the request.
                  </label>
                </>
              ) : (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  Sharing is disabled until the linked buyer assessment has consent. You can still remove existing access below.
                </p>
              )}
              {shares.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-700">Agents with view access</h4>
                  {shares.map((share) => (
                    <div key={share.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{share.agent_name || share.agent_email}</span>
                      <span className="text-[10px] font-semibold uppercase text-gray-500">
                        {share.invite_expires_at
                          ? `Invite expires ${new Date(share.invite_expires_at).toLocaleDateString()}`
                          : 'Agent account · view only'}
                      </span>
                      <button type="button" disabled={saving}
                        onClick={() => changeShare('DELETE', share.id)}
                        className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
