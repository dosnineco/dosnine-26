import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { FiMail } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import { PARISHES } from '@/lib/normalizeParish';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill').then((mod) => mod.default), {
  ssr: false,
  loading: () => <div className="py-8 text-center text-sm text-gray-500">Loading editor…</div>,
});

const formatRate = (numerator, denominator) => {
  if (!denominator || denominator === 0) return '0%';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
};

export default function AdminNewsletterPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [accessAllowed, setAccessAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingSend, setLoadingSend] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [newsletter, setNewsletter] = useState({
    subject: '',
    previewText: '',
    htmlContent: '',
  });
  const [summary, setSummary] = useState({ visitorCount: 0, optedInCount: 0, visitorSample: [] });
  const [campaignStats, setCampaignStats] = useState([]);
  const [recipientSource, setRecipientSource] = useState('submittedVisitors');
  const [targetParish, setTargetParish] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [draftId, setDraftId] = useState(null);
  const [sendResult, setSendResult] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const quillRef = useRef(null);

  useEffect(() => {
    if (!isLoaded) return;
    verifyAdmin();
  }, [user, isLoaded]);

  useEffect(() => {
    if (!accessAllowed) return;
    fetchSummary();
    fetchBrevoStats();
    loadLocalDrafts();
  }, [accessAllowed]);

  const verifyAdmin = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/admin/verify-admin');
      const payload = await response.json();
      if (!response.ok || !payload?.isAdmin) {
        router.push('/');
        return;
      }
      setAccessAllowed(true);
    } catch (err) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const loadLocalDrafts = () => {
    if (typeof window === 'undefined') return;

    try {
      const stored = window.localStorage.getItem('admin-newsletter-drafts');
      const parsed = stored ? JSON.parse(stored) : [];
      setDrafts(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
      console.error('Failed to load local drafts:', err);
      setDrafts([]);
    }
  };

  const persistLocalDrafts = (draftsToSave) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('admin-newsletter-drafts', JSON.stringify(draftsToSave));
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/newsletter/summary');
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load newsletter summary');
      }
      setSummary(payload);
    } catch (err) {
      console.error('Newsletter summary error:', err);
    }
  };

  const fetchBrevoStats = async () => {
    try {
      const response = await fetch('/api/newsletter/brevo-stats');
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load Brevo stats');
      }
      setCampaignStats(payload.campaigns || []);
    } catch (err) {
      console.error('Brevo stats error:', err);
    }
  };

  const saveDraft = async () => {
    if (!newsletter.subject.trim() || !newsletter.htmlContent.trim()) {
      toast.error('Subject and body are required to save a draft.');
      return;
    }

    setSavingDraft(true);
    try {
      const draftPayload = {
        id: draftId || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        subject: newsletter.subject,
        preview_text: newsletter.previewText,
        html_content: newsletter.htmlContent,
        saved_at: new Date().toISOString(),
      };

      const updatedDrafts = [draftPayload, ...(drafts.filter((draft) => draft.id !== draftPayload.id))];
      setDraftId(draftPayload.id);
      setDrafts(updatedDrafts);
      persistLocalDrafts(updatedDrafts);

      toast.success('Draft saved successfully.');
    } catch (err) {
      console.error('Draft save error:', err);
      toast.error(err.message || 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const loadDraft = (draft) => {
    setDraftId(draft.id);
    setNewsletter({
      subject: draft.subject || '',
      previewText: draft.preview_text || '',
      htmlContent: draft.html_content || '',
    });
    setSendResult(null);
    setTestResult(null);

    setTimeout(() => {
      const editor = getEditor();
      if (editor) {
        editor.root.innerHTML = draft.html_content || '';
      }
    }, 0);
  };

  const deleteDraft = (id) => {
    if (!confirm('Delete this draft?')) return;
    const updatedDrafts = drafts.filter((draft) => draft.id !== id);
    setDrafts(updatedDrafts);
    persistLocalDrafts(updatedDrafts);
    if (draftId === id) {
      setDraftId(null);
      setNewsletter({ subject: '', previewText: '', htmlContent: '' });
    }
    toast.success('Draft deleted successfully.');
  };

  const handleNewDraft = () => {
    setDraftId(null);
    setNewsletter({ subject: '', previewText: '', htmlContent: '' });
    setSendResult(null);
    setTestResult(null);

    setTimeout(() => {
      const editor = getEditor();
      if (editor) {
        editor.root.innerHTML = '';
      }
    }, 0);
  };

  const getEditor = () => {
    if (!quillRef.current) return null;
    if (typeof quillRef.current.getEditor === 'function') {
      return quillRef.current.getEditor();
    }
    return quillRef.current.editor ?? null;
  };

  const modules = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link'],
        ['clean'],
      ],
    },
  };

  const formats = ['bold', 'italic', 'underline', 'list', 'bullet', 'link'];

  const handleSendNewsletter = async (event) => {
    event.preventDefault();
    if (!newsletter.subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (!newsletter.htmlContent.trim()) {
      toast.error('Newsletter body is required');
      return;
    }

    setLoadingSend(true);
    setSendResult(null);

    try {
      const response = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newsletter.subject,
          previewText: newsletter.previewText,
          htmlContent: newsletter.htmlContent,
          target: recipientSource,
          parish: targetParish || undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to send newsletter');
      }

      setSendResult({
        message: `Newsletter sent to ${payload.sentCount} recipients. Total matched ${payload.recipientCount}.`,
        truncated: payload.truncated,
      });
      toast.success('Newsletter sent successfully');
      if (payload.truncated) {
        toast('Note: only the first 100 recipients were included in this send.');
      }
    } catch (err) {
      console.error('Send newsletter error:', err);
      toast.error(err.message || 'Send failed');
    } finally {
      setLoadingSend(false);
      fetchSummary();
      fetchBrevoStats();
    }
  };

  const handleSendTestNewsletter = async () => {
    if (!newsletter.subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (!newsletter.htmlContent.trim()) {
      toast.error('Newsletter body is required');
      return;
    }

    setLoadingSend(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/newsletter/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newsletter.subject,
          previewText: newsletter.previewText,
          htmlContent: newsletter.htmlContent,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to send test email');
      }

      setTestResult({
        message: `Test email sent to ${payload.email}.`,
      });
      toast.success('Test email sent successfully');
    } catch (err) {
      console.error('Send test email error:', err);
      toast.error(err.message || 'Test send failed');
    } finally {
      setLoadingSend(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto px-4 text-center text-gray-600">Checking permissions...</div>
      </main>
    );
  }

  if (!accessAllowed) {
    return (
      <main className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto px-4 text-center text-red-600">Admin access required.</div>
      </main>
    );
  }

  const recipientCount =
    recipientSource === 'submittedVisitors'
      ? summary.visitorCount
      : recipientSource === 'subscribedUsers'
      ? summary.optedInCount
      : summary.visitorCount + summary.optedInCount;

  return (
    <>
      <Head>
        <title>Newsletter Manager — Admin</title>
      </Head>

      <main className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <AdminLayout />

<div className="bg-white rounded-3xl border border-gray-200 p-8 mt-6">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Newsletter Manager</h1>
                <p className="text-gray-600 mt-2 max-w-2xl">
                  Create a clean newsletter and send it to verified leads and opted-in users. Deliverability tips are shown below to help reduce spam placement.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3 mb-8">
              <div className="bg-gray-50 rounded-3xl p-5 border border-gray-200">
                <p className="text-sm text-gray-500 uppercase tracking-[0.2em] mb-2">Service Request Leads</p>
                <p className="text-4xl font-semibold text-gray-900">{summary.visitorCount}</p>
                <p className="text-sm text-gray-500 mt-2">Emails collected from service request submissions.</p>
              </div>
              <div className="bg-gray-50 rounded-3xl p-5 border border-gray-200">
                <p className="text-sm text-gray-500 uppercase tracking-[0.2em] mb-2">Opted-in Users</p>
                <p className="text-4xl font-semibold text-gray-900">{summary.optedInCount}</p>
                <p className="text-sm text-gray-500 mt-2">Users with newsletter_opted_in set in users table.</p>
              </div>
              <div className="bg-gray-50 rounded-3xl p-5 border border-gray-200">
                <p className="text-sm text-gray-500 uppercase tracking-[0.2em] mb-2">Brevo Campaigns</p>
                <p className="text-4xl font-semibold text-gray-900">{campaignStats.length}</p>
                <p className="text-sm text-gray-500 mt-2">Recent sent campaigns loaded from Brevo.</p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(560px,1fr)_420px]">
              <section className="space-y-6">
                <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Compose Newsletter</h2>

                  <div className="grid gap-4">
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-700">Subject</span>
                      <input
                        value={newsletter.subject}
                        onChange={(event) => setNewsletter((prev) => ({ ...prev, subject: event.target.value }))}
                        placeholder="Newsletter subject"
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900 focus:border-accent focus:outline-none"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-gray-700">Preview text</span>
                      <input
                        value={newsletter.previewText}
                        onChange={(event) => setNewsletter((prev) => ({ ...prev, previewText: event.target.value }))}
                        placeholder="Short preview text for email clients"
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900 focus:border-accent focus:outline-none"
                      />
                    </label>

                    <div className="rounded-3xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700">
                      <p className="font-semibold">Personalization tokens</p>
                      <p className="mt-2">Use these placeholders in subject or body:</p>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><code>{'{{first_name}}'}</code> — first name</li>
                        <li><code>{'{{last_name}}'}</code> — last name</li>
                        <li><code>{'{{parish}}'}</code> — recipient parish</li>
                      </ul>
                      <p className="mt-2 text-xs text-gray-500">If a value is missing, we will fall back to a friendly default.</p>
                    </div>

                    <label className="block">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">Body</span>
                        <span className="text-xs text-gray-500">This will be sent as HTML</span>
                      </div>
                      <div className="rounded-3xl border border-gray-200 bg-white w-full overflow-hidden">
                        <ReactQuill
                          ref={quillRef}
                          className="min-h-[340px] w-full"
                          style={{ minHeight: '340px' }}
                          theme="snow"
                          value={newsletter.htmlContent}
                          onChange={(content) => setNewsletter((prev) => ({ ...prev, htmlContent: content }))}
                          placeholder="Write the newsletter content here..."
                          modules={modules}
                          formats={formats}
                        />
                      </div>
                    </label>

                    <div className="flex flex-wrap gap-3 mt-4">
                      <label className="min-w-[220px] flex-1">
                        <span className="text-sm font-semibold text-gray-700">Target parish</span>
                        <select
                          value={targetParish}
                          onChange={(event) => setTargetParish(event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 focus:border-accent focus:outline-none"
                        >
                          <option value="">All parishes</option>
                          {PARISHES.map((parish) => (
                            <option key={parish} value={parish}>{parish}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <button
                        type="button"
                        onClick={saveDraft}
                        disabled={savingDraft}
                        className="inline-flex items-center justify-center rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
                      >
                        {savingDraft ? 'Saving draft…' : 'Save draft'}
                      </button>
                      <button
                        type="button"
                        onClick={handleNewDraft}
                        className="inline-flex items-center justify-center rounded-3xl bg-gray-200 px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-300"
                      >
                        New draft
                      </button>
                      {draftId && (
                        <span className="text-sm text-gray-500">Loaded draft: {draftId}</span>
                      )}
                    </div>

                    <div className="rounded-3xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700">
                      <p className="font-semibold">Unsubscribe experience</p>
                      <p className="mt-2">Recipients will see an unsubscribe link in the footer when we send the email. The public page lets them opt out with a single email address.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Send options</h2>

                  <div className="grid gap-3">
                    <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 cursor-pointer">
                      <input
                        type="radio"
                        name="recipientSource"
                        value="submittedVisitors"
                        checked={recipientSource === 'submittedVisitors'}
                        onChange={() => setRecipientSource('submittedVisitors')}
                        className="h-4 w-4 text-accent"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">Service Request Leads</div>
                        <div className="text-sm text-gray-500">Send to client emails collected from service_requests.</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 cursor-pointer">
                      <input
                        type="radio"
                        name="recipientSource"
                        value="subscribedUsers"
                        checked={recipientSource === 'subscribedUsers'}
                        onChange={() => setRecipientSource('subscribedUsers')}
                        className="h-4 w-4 text-accent"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">Opted-in Users</div>
                        <div className="text-sm text-gray-500">Send to users with newsletter_opted_in enabled.</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 cursor-pointer">
                      <input
                        type="radio"
                        name="recipientSource"
                        value="both"
                        checked={recipientSource === 'both'}
                        onChange={() => setRecipientSource('both')}
                        className="h-4 w-4 text-accent"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">Both lists</div>
                        <div className="text-sm text-gray-500">Send to all service request clients and opted-in users together.</div>
                      </div>
                    </label>
                  </div>

                  <div className="mt-4 rounded-3xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Selected recipients:</p>
                    <p className="text-2xl font-semibold text-gray-900">{recipientCount}</p>
                    {targetParish ? (
                      <p className="text-sm text-gray-500">Only recipients in {targetParish} will be targeted when sending.</p>
                    ) : (
                      <p className="text-sm text-gray-500">This page uses the service_requests and users tables for newsletter targeting.</p>
                    )}
                  </div>
                </div>
              </section>

              <aside className="space-y-6">
                <div className="rounded-3xl bg-white border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Brevo open-rate dashboard</h2>
                  {campaignStats.length === 0 ? (
                    <p className="text-sm text-gray-500">No sent campaigns found yet or Brevo stats are not available.</p>
                  ) : (
                    <div className="space-y-4">
                      {campaignStats.map((campaign) => (
                        <div key={campaign.id} className="rounded-3xl bg-gray-50 p-4 border border-gray-200">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-semibold text-gray-900">{campaign.name || campaign.subject || 'Campaign'}</p>
                              <p className="text-sm text-gray-500">Sent {campaign.sentDate ? new Date(campaign.sentDate).toLocaleDateString() : 'unknown'}</p>
                            </div>
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">{formatRate(campaign.statistics.uniqueViews, campaign.statistics.delivered)} open rate</span>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-2xl bg-white border border-gray-200 p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Delivered</p>
                              <p className="text-lg font-semibold text-gray-900">{campaign.statistics.delivered ?? 0}</p>
                            </div>
                            <div className="rounded-2xl bg-white border border-gray-200 p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Clicks</p>
                              <p className="text-lg font-semibold text-gray-900">{campaign.statistics.uniqueClicks ?? 0}</p>
                            </div>
                            <div className="rounded-2xl bg-white border border-gray-200 p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Unsubscribes</p>
                              <p className="text-lg font-semibold text-gray-900">{campaign.statistics.unsubscriptions ?? 0}</p>
                            </div>
                            <div className="rounded-2xl bg-white border border-gray-200 p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Clicks Rates</p>
                              <p className="text-lg font-semibold text-gray-900">{formatRate(campaign.statistics.uniqueClicks, campaign.statistics.delivered)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl bg-white border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent visitor samples</h2>
                  <div className="space-y-2 text-sm text-gray-700">
                    {summary.visitorSample.length === 0 ? (
                      <p className="text-gray-500">No submitted visitor emails available.</p>
                    ) : (
                      summary.visitorSample.map((item, index) => (
                        <div key={index} className="rounded-2xl bg-gray-50 border border-gray-200 p-3">
                          <p className="font-medium text-gray-900">{item.email}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Saved drafts</h2>
                    <button
                      type="button"
                      onClick={handleNewDraft}
                      className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                    >
                      New
                    </button>
                  </div>
                  <div className="space-y-3 text-sm text-gray-700">
                    {drafts.length === 0 ? (
                      <p className="text-gray-500">No saved drafts yet. Use Save draft to keep your work.</p>
                    ) : (
                      drafts.map((draft) => (
                        <div key={draft.id} className="rounded-2xl bg-gray-50 border border-gray-200 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-gray-900">{draft.subject || 'Untitled draft'}</p>
                              <p className="text-xs text-gray-500">Saved {new Date(draft.saved_at).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => loadDraft(draft)}
                                className="rounded-2xl bg-accent px-3 py-1 text-xs font-semibold text-white hover:bg-accent/90"
                              >
                                Load
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteDraft(draft.id)}
                                className="rounded-2xl bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </aside>
            </div>

            <div className="mt-6 rounded-3xl border border-gray-200 bg-gray-50 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Send newsletter</h2>
              <p className="text-sm text-gray-600 mb-4">This will send a transactional HTML newsletter to the selected recipient list with an unsubscribe footer.</p>
              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  disabled={loadingSend}
                  onClick={handleSendNewsletter}
                  className="inline-flex items-center justify-center rounded-3xl bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
                >
                  {loadingSend ? 'Sending…' : 'Send newsletter now'}
                </button>
                <button
                  disabled={loadingSend}
                  onClick={handleSendTestNewsletter}
                  className="inline-flex items-center justify-center rounded-3xl bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  <FiMail className="mr-2" />
                  {loadingSend ? 'Sending test…' : 'Send test email to admin'}
                </button>
              </div>

              <div className="rounded-3xl bg-white border border-gray-200 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Email deliverability tips</h3>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
                  <li>Keep subject lines clear and avoid spammy words like "free" or "urgent".</li>
                  <li>Send only to opted-in recipients and avoid purchased or stale mailing lists.</li>
                  <li>Include a visible unsubscribe link and a plain-text fallback when possible.</li>
                  <li>Use a consistent sending address and authenticate with SPF/DKIM/DMARC.</li>
                  <li>Test with a small list first and review Brevo engagement data before broad sends.</li>
                </ul>
              </div>

              {sendResult && (
                <div className="mt-4 rounded-3xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                  {sendResult.message}
                  {sendResult.truncated && <div className="mt-1 text-xs text-gray-700">Note: only the first 100 recipients were included in this send.</div>}
                </div>
              )}
              {testResult && (
                <div className="mt-4 rounded-3xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  {testResult.message}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
