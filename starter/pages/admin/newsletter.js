import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { FiMail } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import DOMPurify from 'dompurify';

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
  const [summary, setSummary] = useState({ visitorCount: 0, optedInCount: 0, advertisementCount: 0, buyCount: 0, sellCount: 0, rentCount: 0, visitorSample: [] });
  const [recipientSource, setRecipientSource] = useState('submittedVisitors');
  const [targetParish, setTargetParish] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [draftId, setDraftId] = useState(null);
  const [sendResult, setSendResult] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const uploadInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      ImageExtension.configure({ inline: false, allowBase64: false }),
    ],
    content: newsletter.htmlContent || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'min-h-[340px] prose prose-sm sm:prose lg:prose-lg max-w-full focus:outline-none p-4',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setNewsletter((prev) => {
        if (prev.htmlContent === html) return prev;
        return { ...prev, htmlContent: html };
      });
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (newsletter.htmlContent !== currentHtml) {
      if (newsletter.htmlContent) {
        editor.commands.setContent(newsletter.htmlContent, false);
      } else {
        editor.commands.clearContent();
      }
    }
  }, [editor, newsletter.htmlContent]);

  useEffect(() => {
    if (!isLoaded) return;
    verifyAdmin();
  }, [user, isLoaded]);

  useEffect(() => {
    if (!accessAllowed) return;
    fetchSummary();
    loadLocalDrafts();
  }, [accessAllowed]);

  const verifyAdmin = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/admin/verify-admin', {
        headers: buildAuthHeaders(),
        credentials: 'include',
      });
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

  const buildAuthHeaders = () => {
    const headers = {};
    if (user?.id) headers['x-clerk-user-id'] = user.id;
    const primaryEmail = user?.emailAddresses?.[0]?.emailAddress || user?.primaryEmailAddress?.emailAddress || '';
    if (primaryEmail) headers['x-clerk-user-email'] = primaryEmail;
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    if (fullName) headers['x-clerk-user-name'] = fullName;
    return headers;
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/newsletter/summary', {
        headers: buildAuthHeaders(),
        credentials: 'include',
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load newsletter summary');
      }
      setSummary(payload);
    } catch (err) {
      console.error('Newsletter summary error:', err);
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
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const handleAddLink = () => {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
      setShowLinkInput(false);
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.trim(), target: '_blank' }).run();
    setShowLinkInput(false);
  };

  const handleToggleLinkInput = () => {
    if (!editor) return;
    const existing = editor.getAttributes('link').href || '';
    setLinkUrl(existing);
    setShowLinkInput((prev) => !prev);
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const maxDimension = 1200;
          let { width, height } = image;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          ctx.drawImage(image, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Image compression failed'));
                return;
              }
              resolve(blob);
            },
            file.type || 'image/jpeg',
            0.8
          );
        };
        image.onerror = () => reject(new Error('Failed to load image for compression'));
        image.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  };

  const uploadImageToEditor = async (file) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.');
      return;
    }

    try {
      const compressedFile = await compressImage(file);
      const sanitizedFilename = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_.]/g, '');
      const fileName = `newsletter-images/${Date.now()}-${sanitizedFilename}`;
      const { data, error } = await supabase.storage.from('property-images').upload(fileName, compressedFile, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

      if (error) throw error;
      const { data: publicData } = supabase.storage.from('property-images').getPublicUrl(data.path);
      const publicUrl = publicData?.publicUrl || publicData?.publicURL || '';

      if (editor && publicUrl) {
        editor.chain().focus().setImage({ src: publicUrl }).run();
        setNewsletter((prev) => ({ ...prev, htmlContent: editor.getHTML() }));
      }
    } catch (err) {
      console.error('Image upload error:', err);
      toast.error(err?.message || 'Failed to upload image');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    event.target.value = '';
    await uploadImageToEditor(file);
  };

  const openImageUpload = () => {
    uploadInputRef.current?.click();
  };

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
      const sanitizedHtml = DOMPurify.sanitize(newsletter.htmlContent);
      const response = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          subject: newsletter.subject,
          previewText: newsletter.previewText,
          htmlContent: sanitizedHtml,
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
      const sanitizedHtml = DOMPurify.sanitize(newsletter.htmlContent);
      const response = await fetch('/api/newsletter/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          subject: newsletter.subject,
          previewText: newsletter.previewText,
          htmlContent: sanitizedHtml,
          email: testEmail || undefined,
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
    recipientSource === 'subscribedUsers'
      ? summary.optedInCount || 0
      : recipientSource === 'advertisements'
      ? summary.advertisementCount || 0
      : recipientSource === 'buyers'
      ? summary.buyCount || 0
      : recipientSource === 'sellers'
      ? summary.sellCount || 0
      : recipientSource === 'renters'
      ? summary.rentCount || 0
      : recipientSource === 'both'
      ? (summary.visitorCount || 0) + (summary.optedInCount || 0) + (summary.advertisementCount || 0)
      : summary.visitorCount || 0;

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
                  Create a message and send it to buyers, sellers, renters, opted-in users, or advertisers whose ads were just created.
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-1 mb-8">
              <div className="bg-gray-50 rounded-3xl p-5 border border-gray-200">
                <p className="text-sm text-gray-500 uppercase tracking-[0.2em] mb-2">Service Request Leads</p>
                <p className="text-4xl font-semibold text-gray-900">{summary.visitorCount}</p>
                <p className="text-sm text-gray-500 mt-2">Emails collected from service request submissions.</p>
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
                      <div className="mb-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => editor?.chain().focus().toggleBold().run()}
                          className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${editor?.isActive('bold') ? 'border-accent bg-accent text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                        >
                          Bold
                        </button>
                        <button
                          type="button"
                          onClick={() => editor?.chain().focus().toggleItalic().run()}
                          className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${editor?.isActive('italic') ? 'border-accent bg-accent text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                        >
                          Italic
                        </button>
                        <button
                          type="button"
                          onClick={() => editor?.chain().focus().toggleStrike().run()}
                          className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${editor?.isActive('strike') ? 'border-accent bg-accent text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                        >
                          Strike
                        </button>
                        <button
                          type="button"
                          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                          className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${editor?.isActive('heading', { level: 2 }) ? 'border-accent bg-accent text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                        >
                          H2
                        </button>
                        <button
                          type="button"
                          onClick={() => editor?.chain().focus().toggleBulletList().run()}
                          className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${editor?.isActive('bulletList') ? 'border-accent bg-accent text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                        >
                          Bullet
                        </button>
                        <button
                          type="button"
                          onClick={handleToggleLinkInput}
                          className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${editor?.isActive('link') ? 'border-accent bg-accent text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                        >
                          {editor?.isActive('link') ? 'Edit link' : 'Add link'}
                        </button>
                        <button
                          type="button"
                          onClick={openImageUpload}
                          className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          Image
                        </button>
                      </div>
                      {showLinkInput && (
                        <div className="mb-3 flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-3">
                          <input
                            type="url"
                            value={linkUrl}
                            onChange={(event) => setLinkUrl(event.target.value)}
                            placeholder="https://example.com"
                            className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-accent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleAddLink}
                            className="rounded-2xl border border-accent bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent/90"
                          >
                            Apply
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowLinkInput(false)}
                            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      <div className="mb-3 flex flex-wrap gap-2 text-xs text-gray-600">
                        <span className="font-semibold">Active formatting:</span>
                        {[
                          editor?.isActive('bold') && 'Bold',
                          editor?.isActive('italic') && 'Italic',
                          editor?.isActive('strike') && 'Strike',
                          editor?.isActive('heading', { level: 2 }) && 'H2',
                          editor?.isActive('bulletList') && 'Bullet',
                          editor?.isActive('link') && 'Link',
                        ]
                          .filter(Boolean)
                          .map((format) => (
                            <span key={format} className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700">
                              {format}
                            </span>
                          ))}
                        {[
                          editor?.isActive('bold'),
                          editor?.isActive('italic'),
                          editor?.isActive('strike'),
                          editor?.isActive('heading', { level: 2 }),
                          editor?.isActive('bulletList'),
                          editor?.isActive('link'),
                        ].some(Boolean) ? null : <span className="text-gray-500">None</span>}
                      </div>
                      <div className="rounded-3xl border border-gray-200 bg-white w-full overflow-hidden">
                        <EditorContent editor={editor} />
                      </div>
                      <input
                        ref={uploadInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>

                    {/* Target parish removed — newsletter sends to all recipients */}

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
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="font-semibold text-gray-900">Recipient list</div>
                      <div className="mt-3 grid gap-2">
                        <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 cursor-pointer">
                          <input
                            type="radio"
                            name="recipientSource"
                            value="buyers"
                            checked={recipientSource === 'buyers'}
                            onChange={() => setRecipientSource('buyers')}
                            className="h-4 w-4 text-accent"
                          />
                          <div>
                            <div className="font-semibold text-gray-900">Buyers</div>
                            <div className="text-sm text-gray-500">Send to buyers from service requests with request type buy.</div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 cursor-pointer">
                          <input
                            type="radio"
                            name="recipientSource"
                            value="sellers"
                            checked={recipientSource === 'sellers'}
                            onChange={() => setRecipientSource('sellers')}
                            className="h-4 w-4 text-accent"
                          />
                          <div>
                            <div className="font-semibold text-gray-900">Sellers</div>
                            <div className="text-sm text-gray-500">Send to sellers from service requests with request type sell.</div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 cursor-pointer">
                          <input
                            type="radio"
                            name="recipientSource"
                            value="renters"
                            checked={recipientSource === 'renters'}
                            onChange={() => setRecipientSource('renters')}
                            className="h-4 w-4 text-accent"
                          />
                          <div>
                            <div className="font-semibold text-gray-900">Renters</div>
                            <div className="text-sm text-gray-500">Send to renters from service requests with request type rent.</div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 cursor-pointer">
                          <input
                            type="radio"
                            name="recipientSource"
                            value="submittedVisitors"
                            checked={recipientSource === 'submittedVisitors'}
                            onChange={() => setRecipientSource('submittedVisitors')}
                            className="h-4 w-4 text-accent"
                          />
                          <div>
                            <div className="font-semibold text-gray-900">All service request leads</div>
                            <div className="text-sm text-gray-500">Send to all client emails collected from service requests.</div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 cursor-pointer">
                          <input
                            type="radio"
                            name="recipientSource"
                            value="subscribedUsers"
                            checked={recipientSource === 'subscribedUsers'}
                            onChange={() => setRecipientSource('subscribedUsers')}
                            className="h-4 w-4 text-accent"
                          />
                          <div>
                            <div className="font-semibold text-gray-900">Opted-in users</div>
                            <div className="text-sm text-gray-500">Send to users with newsletter_opted_in enabled.</div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 cursor-pointer">
                          <input
                            type="radio"
                            name="recipientSource"
                            value="advertisements"
                            checked={recipientSource === 'advertisements'}
                            onChange={() => setRecipientSource('advertisements')}
                            className="h-4 w-4 text-accent"
                          />
                          <div>
                            <div className="font-semibold text-gray-900">Created ad contacts</div>
                            <div className="text-sm text-gray-500">Send to advertisers whose ad records were created and include an email address.</div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 cursor-pointer">
                          <input
                            type="radio"
                            name="recipientSource"
                            value="both"
                            checked={recipientSource === 'both'}
                            onChange={() => setRecipientSource('both')}
                            className="h-4 w-4 text-accent"
                          />
                          <div>
                            <div className="font-semibold text-gray-900">All lists</div>
                            <div className="text-sm text-gray-500">Send to buyers, sellers, renters, opted-in users, and created ad contacts together.</div>
                          </div>
                        </label>
                      </div>
                    </div>

                  </div>

                  <div className="mt-4 rounded-3xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Selected recipients:</p>
                    <p className="text-2xl font-semibold text-gray-900">{recipientCount}</p>
                    {targetParish ? (
                      <p className="text-sm text-gray-500">Only recipients in {targetParish} will be targeted when sending.</p>
                    ) : (
                      <p className="text-sm text-gray-500">This send uses {recipientSource === 'subscribedUsers' ? 'the opted-in users list' : recipientSource === 'advertisements' ? 'the created ad contacts list' : recipientSource === 'buyers' ? 'the buyer request list' : recipientSource === 'sellers' ? 'the seller request list' : recipientSource === 'renters' ? 'the renter request list' : recipientSource === 'both' ? 'all recipient lists' : 'the selected service request leads list'}.</p>
                    )}
                  </div>
                </div>
              </section>

              <aside className="space-y-6">
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
                <div className="flex items-center gap-3">
                  <input
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-accent focus:outline-none"
                  />
                  <button
                    disabled={loadingSend}
                    onClick={handleSendTestNewsletter}
                    className="inline-flex items-center justify-center rounded-3xl bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    <FiMail className="mr-2" />
                    {loadingSend ? 'Sending test…' : 'Send test email'}
                  </button>
                </div>
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
