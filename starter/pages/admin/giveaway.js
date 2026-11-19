import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { ArrowLeft, Gift, Save, Trophy } from 'lucide-react';

function toLocalDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

async function requestApi(method = 'GET', body, token) {
  const response = await fetch('/api/admin/giveaway', {
    method,
    credentials: 'include',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Giveaway request failed.');
  return payload;
}

export default function AdminGiveawayPage() {
  const { isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [entrants, setEntrants] = useState([]);
  const [form, setForm] = useState({});
  const [selectedWinner, setSelectedWinner] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await requestApi('GET', undefined, await getToken());
      const current = payload.campaign;
      setCampaign(current);
      setEntrants(payload.entrants || []);
      setForm({
        title: current.title || '',
        prize_description: current.prize_description || '',
        opens_at: toLocalDateTime(current.opens_at),
        draw_at: toLocalDateTime(current.draw_at),
        is_open: Boolean(current.is_open),
      });
    } catch (loadError) {
      setError(loadError.message || 'Unable to load giveaway.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isLoaded && user) load();
  }, [isLoaded, user, load]);

  const winner = useMemo(
    () => entrants.find((entrant) => entrant.user_id === selectedWinner),
    [entrants, selectedWinner]
  );
  const drawReady = campaign?.draw_at && new Date(campaign.draw_at).getTime() <= Date.now();

  const saveCampaign = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = await requestApi('PATCH', {
        ...form,
        opens_at: form.opens_at ? new Date(form.opens_at).toISOString() : null,
        draw_at: form.draw_at ? new Date(form.draw_at).toISOString() : null,
      }, await getToken());
      setCampaign(payload.campaign);
      setNotice('Giveaway settings saved.');
      await load();
    } catch (saveError) {
      setError(saveError.message || 'Unable to save giveaway settings.');
    } finally {
      setSaving(false);
    }
  };

  const pickWinner = async () => {
    if (!selectedWinner) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = await requestApi('PATCH', {
        winner_user_id: selectedWinner,
      }, await getToken());
      setCampaign(payload.campaign);
      setNotice('Winner selected and giveaway closed.');
      await load();
    } catch (pickError) {
      setError(pickError.message || 'Unable to select winner.');
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded || loading) {
    return <main className="mx-auto max-w-4xl px-4 py-20 text-center text-gray-600">Loading giveaway controls…</main>;
  }

  return (
    <>
      <Head><title>Giveaway — Admin — Dosnine</title></Head>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Admin dashboard
        </Link>
        <div className="mb-7 mt-4 flex items-start gap-3">
          <Gift className="mt-1 h-7 w-7 text-accent" aria-hidden="true" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Member giveaway</h1>
            <p className="mt-1 text-gray-600">Configure dates and select a qualified member on giveaway day.</p>
          </div>
        </div>

        {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

        <section className="mb-6 rounded-2xl bg-white p-6 ring-1 ring-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Giveaway settings</h2>
          <form onSubmit={saveCampaign} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Title</span>
              <input value={form.title || ''} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} maxLength={120} required className="w-full rounded-xl bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-accent" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Prize description</span>
              <textarea value={form.prize_description || ''} onChange={(event) => setForm((current) => ({ ...current, prize_description: event.target.value }))} maxLength={500} required rows={2} className="w-full rounded-xl bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-accent" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Opening date and time</span>
                <input type="datetime-local" value={form.opens_at || ''} onChange={(event) => setForm((current) => ({ ...current, opens_at: event.target.value }))} required className="w-full rounded-xl bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-accent" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Giveaway date and time</span>
                <input type="datetime-local" value={form.draw_at || ''} onChange={(event) => setForm((current) => ({ ...current, draw_at: event.target.value }))} required className="w-full rounded-xl bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-accent" />
              </label>
            </div>
            <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={Boolean(form.is_open)} onChange={(event) => setForm((current) => ({ ...current, is_open: event.target.checked }))} className="h-4 w-4 rounded accent-[#6E026F]" />
              Open giveaway (eligible members will see it on their dashboard and profile during the configured dates)
            </label>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-white hover:bg-accent/90 disabled:opacity-50">
              <Save className="h-4 w-4" aria-hidden="true" /> {saving ? 'Saving…' : 'Save settings'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 ring-1 ring-gray-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Qualified entrants</h2>
              <p className="mt-1 text-sm text-gray-600">Members with an active Premium plan and completed Level 4 buyer or rental readiness appear here.</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">{entrants.length}</span>
          </div>

          {campaign?.winner_user_id ? (
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-900">
              <Trophy className="h-5 w-5" aria-hidden="true" />
              <p className="text-sm font-semibold">Winner already selected for this giveaway.</p>
            </div>
          ) : entrants.length === 0 ? (
            <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">No eligible entrants yet. Open the giveaway and check again on draw day.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {entrants.map((entrant) => (
                <article key={entrant.user_id} className="rounded-xl bg-gray-50 p-4">
                  <p className="font-semibold text-gray-900">{entrant.full_name || 'Member'}</p>
                  <p className="text-sm text-gray-600">{entrant.email}</p>
                  <p className="mt-2 text-xs text-gray-600">
                    Readiness: {entrant.eligibility.hasLevelFourReadiness ? 'Level 4 complete' : 'Incomplete'}
                  </p>
                  {drawReady && (
                    <button
                      type="button"
                      onClick={() => setSelectedWinner(entrant.user_id)}
                      className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${selectedWinner === entrant.user_id ? 'bg-accent text-white' : 'bg-white text-gray-800 ring-1 ring-gray-200 hover:bg-gray-100'}`}
                    >
                      {selectedWinner === entrant.user_id ? 'Selected' : 'Select this entrant'}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}

          {selectedWinner && winner && drawReady && (
            <div className="mt-5 rounded-xl border border-gray-200 p-4">
              <button type="button" disabled={saving} onClick={pickWinner} className="mt-4 rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Confirm winner'}
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
