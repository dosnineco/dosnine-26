import { useEffect, useRef, useState, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import {
  Mail,
  Send,
  Save,
  FilePlus,
  Trash2,
  Link as LinkIcon,
  Image as ImageIcon,
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  List,
  Megaphone,
  Users,
  Eye,
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapLink from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import DOMPurify from 'dompurify';

/* ============================================================
 * Module-level helpers
 * ============================================================ */

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20';
const labelClass =
  'block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5';

const RECIPIENT_OPTIONS = [
  {
    value: 'submittedVisitors',
    label: 'All service request leads',
    description: 'All client emails collected from service requests.',
    icon: Users,
  },
  {
    value: 'buyers',
    label: 'Buyers',
    description: 'From service requests with request type buy.',
    icon: Users,
  },
  {
    value: 'sellers',
    label: 'Sellers',
    description: 'From service requests with request type sell.',
    icon: Users,
  },
  {
    value: 'renters',
    label: 'Renters',
    description: 'From service requests with request type rent.',
    icon: Users,
  },
  {
    value: 'subscribedUsers',
    label: 'Opted-in users',
    description: 'Users with newsletter_opted_in enabled.',
    icon: Mail,
  },
  {
    value: 'advertisements',
    label: 'Created ad contacts',
    description: 'Advertisers whose ad records include an email.',
    icon: Megaphone,
  },
  {
    value: 'both',
    label: 'All lists combined',
    description: 'Buyers, sellers, renters, opted-in users, and ad contacts.',
    icon: Users,
  },
];

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/* ----------------------------------------------------------
 * Brand tokens — keep these in sync with your site's look.
 * Email clients don't support CSS variables, so use hex.
 * ---------------------------------------------------------- */
const BRAND = {
  name: 'Dosnine Limited',
  navy: '#0f172a',       // header background
  navyHover: '#1e293b',
  accent: '#2563eb',      // CTA button
  text: '#0f172a',        // body text
  muted: '#475569',       // secondary text
  border: '#e2e8f0',
  soft: '#f8fafc',        // footer background
  pageBg: '#f1f5f9',      // outer background
};

/* ============================================================
 * Build the full email — wraps the editor content in a
 * table-based shell so it renders consistently across Gmail,
 * Apple Mail, Outlook, and Yahoo.
 * ============================================================ */
function buildEmailHtml({ subject, previewText, bodyHtml }) {
  const siteUrl =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) ||
    'https://dosnine.com';
  const year = new Date().getFullYear();

  // Preheader: hidden text that appears beside the subject in the inbox.
  const preheaderText = String(previewText || '').trim();
  const preheader = preheaderText
    ? `<div style="display:none;font-size:1px;color:${BRAND.pageBg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(
        preheaderText
      )}${'&nbsp;&zwnj;'.repeat(60)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no">
  <title>${escapeHtml(subject || BRAND.name)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.pageBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${BRAND.text};-webkit-font-smoothing:antialiased;">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.pageBg};">
    <tr>
      <td align="center" style="padding:32px 12px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${BRAND.border};">

          <!-- ============ HEADER ============ -->
          <tr>
            <td style="background:${BRAND.navy};padding:22px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                    <a href="${siteUrl}" style="color:#ffffff;text-decoration:none;">${BRAND.name}</a>
                  </td>
                  <td align="right" style="font-size:12px;color:rgba(255,255,255,0.7);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                    <a href="${siteUrl}" style="color:rgba(255,255,255,0.85);text-decoration:none;font-weight:600;">Visit site →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ============ BODY ============ -->
          <tr>
            <td style="padding:32px;font-size:16px;line-height:1.65;color:${BRAND.text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- ============ FOOTER ============ -->
          <tr>
            <td style="padding:24px 32px;background:${BRAND.soft};border-top:1px solid ${BRAND.border};font-size:12px;line-height:1.6;color:${BRAND.muted};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              <p style="margin:0 0 10px;">
                You received this email because you signed up or submitted a request on Dosnine.
              </p>
              <p style="margin:0 0 14px;">
                <a href="${siteUrl}/newsletter/unsubscribe" style="color:${BRAND.muted};text-decoration:underline;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="${siteUrl}" style="color:${BRAND.muted};text-decoration:underline;">dosnine.com</a>
              </p>
              <p style="margin:0;color:#94a3b8;">
                © ${year} ${BRAND.name} · Jamaica
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ============================================================
 * Build the ad block — email-safe, no classes, all inline.
 * ============================================================ */
function buildAdvertisementHtml({ advertisement, siteUrl }) {
  const adUrl = `${String(siteUrl).replace(/\/$/, '')}/ads/${advertisement.id}`;
  const imageUrls = Array.isArray(advertisement.image_urls)
    ? advertisement.image_urls
    : [];
  const imageUrl = imageUrls[0] || advertisement.image_url || '';
  const title = escapeHtml(
    advertisement.title || advertisement.company_name || 'Featured advertisement'
  );
  const companyName = escapeHtml(advertisement.company_name || '');
  const category = escapeHtml(
    String(advertisement.category || '').replace(/_/g, ' ')
  );
  const description = escapeHtml(advertisement.description || '');

  const image = imageUrl
    ? `<img src="${escapeHtml(
        imageUrl
      )}" alt="${title}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;outline:none;text-decoration:none;background:#f1f5f9;" />`
    : '';

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
  <tr>
    <td style="border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;background:#ffffff;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${
          image
            ? `<tr><td style="padding:0;">${image}</td></tr>`
            : ''
        }
        <tr>
          <td style="padding:22px 24px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#94a3b8;">
              Sponsored
            </p>
            <h3 style="margin:0 0 6px;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.text};">
              ${title}
            </h3>
            
            ${
              description
                ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.muted};">${description}</p>`
                : ''
            }
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-radius:8px;background:${BRAND.accent};">
                  <a href="${escapeHtml(adUrl)}" target="_blank" rel="noreferrer" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                    View advertisement →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/* ============================================================
 * Page
 * ============================================================ */

export default function AdminNewsletterPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [accessAllowed, setAccessAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [loadingSend, setLoadingSend] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [newsletter, setNewsletter] = useState({
    subject: '',
    previewText: '',
    htmlContent: '',
  });

  const [summary, setSummary] = useState({
    visitorCount: 0,
    optedInCount: 0,
    advertisementCount: 0,
    buyCount: 0,
    sellCount: 0,
    rentCount: 0,
    visitorSample: [],
  });

  const [recipientSource, setRecipientSource] = useState('submittedVisitors');
  const [testEmail, setTestEmail] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [draftId, setDraftId] = useState(null);
  const [sendResult, setSendResult] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [advertisements, setAdvertisements] = useState([]);
  const [selectedAdvertisementId, setSelectedAdvertisementId] = useState('');

  const uploadInputRef = useRef(null);

  const buildAuthHeaders = () => {
    const headers = {};
    if (user?.id) headers['x-clerk-user-id'] = user.id;
    const primaryEmail =
      user?.emailAddresses?.[0]?.emailAddress ||
      user?.primaryEmailAddress?.emailAddress ||
      '';
    if (primaryEmail) headers['x-clerk-user-email'] = primaryEmail;
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    if (fullName) headers['x-clerk-user-name'] = fullName;
    return headers;
  };

  /* ----------------------------------------------------------
   * Editor
   * ---------------------------------------------------------- */
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: false }),
      ImageExtension.configure({ inline: false, allowBase64: false }),
    ],
    content: newsletter.htmlContent || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'min-h-[280px] sm:min-h-[340px] prose prose-sm max-w-full focus:outline-none p-4',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setNewsletter((prev) =>
        prev.htmlContent === html ? prev : { ...prev, htmlContent: html }
      );
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

  /* ----------------------------------------------------------
   * Auth + initial load
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (!isLoaded) return;

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
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    verifyAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoaded]);

  useEffect(() => {
    if (!accessAllowed) return;
    fetchSummary();
    loadAdvertisements();
    loadLocalDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessAllowed]);

  /* ----------------------------------------------------------
   * Data fetchers
   * ---------------------------------------------------------- */
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

  const loadAdvertisements = async () => {
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select(
          'id, title, company_name, category, description, image_url, image_urls, is_active'
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdvertisements(data || []);
    } catch (err) {
      console.error('Advertisement loading error:', err);
      toast.error('Could not load advertisements for the newsletter.');
    }
  };

  /* ----------------------------------------------------------
   * Local drafts
   * ---------------------------------------------------------- */
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
    window.localStorage.setItem(
      'admin-newsletter-drafts',
      JSON.stringify(draftsToSave)
    );
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

      const updatedDrafts = [
        draftPayload,
        ...drafts.filter((draft) => draft.id !== draftPayload.id),
      ];
      setDraftId(draftPayload.id);
      setDrafts(updatedDrafts);
      persistLocalDrafts(updatedDrafts);
      toast.success('Draft saved');
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
    toast.success('Draft deleted');
  };

  const handleNewDraft = () => {
    setDraftId(null);
    setNewsletter({ subject: '', previewText: '', htmlContent: '' });
    setSendResult(null);
    setTestResult(null);
    setLinkUrl('');
    setShowLinkInput(false);
  };

  /* ----------------------------------------------------------
   * Editor toolbar actions
   * ---------------------------------------------------------- */
  const handleAddLink = () => {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
      setShowLinkInput(false);
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: linkUrl.trim(), target: '_blank' })
      .run();
    setShowLinkInput(false);
  };

  const handleToggleLinkInput = () => {
    if (!editor) return;
    const existing = editor.getAttributes('link').href || '';
    setLinkUrl(existing);
    setShowLinkInput((prev) => !prev);
  };

  const insertAdvertisement = () => {
    if (!editor || !selectedAdvertisementId) return;
    const advertisement = advertisements.find(
      (item) => String(item.id) === String(selectedAdvertisementId)
    );
    if (!advertisement) return;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const adHtml = buildAdvertisementHtml({ advertisement, siteUrl });

    editor.chain().focus().insertContent(adHtml).run();
    setSelectedAdvertisementId('');
    toast.success('Advertisement inserted');
  };

  /* ----------------------------------------------------------
   * Image upload
   * ---------------------------------------------------------- */
  const compressImage = (file) =>
    new Promise((resolve, reject) => {
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
          if (!ctx) return reject(new Error('Could not get canvas context'));
          ctx.drawImage(image, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('Image compression failed'));
              resolve(blob);
            },
            file.type || 'image/jpeg',
            0.8
          );
        };
        image.onerror = () => reject(new Error('Failed to load image'));
        image.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });

  const uploadImageToEditor = async (file) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.');
      return;
    }
    try {
      const compressedFile = await compressImage(file);
      const sanitizedFilename = file.name
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9-_.]/g, '');
      const fileName = `newsletter-images/${Date.now()}-${sanitizedFilename}`;
      const { data, error } = await supabase.storage
        .from('property-images')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (error) throw error;
      const { data: publicData } = supabase.storage
        .from('property-images')
        .getPublicUrl(data.path);
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

  const openImageUpload = () => uploadInputRef.current?.click();

  /* ----------------------------------------------------------
   * Sending — wraps content in the email template before send
   * ---------------------------------------------------------- */
  const validateBeforeSend = () => {
    if (!newsletter.subject.trim()) {
      toast.error('Subject is required');
      return false;
    }
    if (!newsletter.htmlContent.trim()) {
      toast.error('Newsletter body is required');
      return false;
    }
    return true;
  };

  const buildWrappedHtml = () => {
    const sanitizedBody = DOMPurify.sanitize(newsletter.htmlContent);
    return buildEmailHtml({
      subject: newsletter.subject,
      previewText: newsletter.previewText,
      bodyHtml: sanitizedBody,
    });
  };

  const handleSendNewsletter = async (event) => {
    event?.preventDefault?.();
    if (!validateBeforeSend()) return;

    setLoadingSend(true);
    setSendResult(null);

    try {
      const wrappedHtml = buildWrappedHtml();
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
          htmlContent: wrappedHtml,
          target: recipientSource,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to send newsletter');
      }

      setSendResult({
        message: `Sent to ${payload.sentCount} recipients. Total matched ${payload.recipientCount}.`,
        truncated: payload.truncated,
      });
      toast.success('Newsletter sent');
      if (payload.truncated) {
        toast('Only the first 100 recipients were included in this send.');
      }
    } catch (err) {
      console.error('Send newsletter error:', err);
      toast.error(err.message || 'Send failed');
    } finally {
      setLoadingSend(false);
      fetchSummary();
    }
  };

  const handleSendTestNewsletter = async (event) => {
    event?.preventDefault?.();
    if (!validateBeforeSend()) return;

    setLoadingSend(true);
    setTestResult(null);

    try {
      const wrappedHtml = buildWrappedHtml();
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
          htmlContent: wrappedHtml,
          email: testEmail || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to send test email');
      }

      setTestResult({ message: `Test email sent to ${payload.email}.` });
      toast.success('Test email sent');
    } catch (err) {
      console.error('Send test email error:', err);
      toast.error(err.message || 'Test send failed');
    } finally {
      setLoadingSend(false);
    }
  };

  /* ----------------------------------------------------------
   * Derived
   * ---------------------------------------------------------- */
  const recipientCount = useMemo(() => {
    switch (recipientSource) {
      case 'subscribedUsers':
        return summary.optedInCount || 0;
      case 'advertisements':
        return summary.advertisementCount || 0;
      case 'buyers':
        return summary.buyCount || 0;
      case 'sellers':
        return summary.sellCount || 0;
      case 'renters':
        return summary.rentCount || 0;
      case 'both':
        return (
          (summary.visitorCount || 0) +
          (summary.optedInCount || 0) +
          (summary.advertisementCount || 0)
        );
      default:
        return summary.visitorCount || 0;
    }
  }, [recipientSource, summary]);

  const activeFormatting = useMemo(() => {
    if (!editor) return [];
    const items = [];
    if (editor.isActive('bold')) items.push('Bold');
    if (editor.isActive('italic')) items.push('Italic');
    if (editor.isActive('strike')) items.push('Strike');
    if (editor.isActive('heading', { level: 2 })) items.push('H2');
    if (editor.isActive('bulletList')) items.push('Bullet');
    if (editor.isActive('link')) items.push('Link');
    return items;
  }, [editor, newsletter.htmlContent]);

  const previewHtml = useMemo(() => {
    if (!showPreview) return '';
    try {
      return buildEmailHtml({
        subject: newsletter.subject,
        previewText: newsletter.previewText,
        bodyHtml: DOMPurify.sanitize(newsletter.htmlContent),
      });
    } catch {
      return '';
    }
  }, [showPreview, newsletter]);

  /* ----------------------------------------------------------
   * Loading / access
   * ---------------------------------------------------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-accent" />
          <p className="mt-4 text-sm text-slate-600">Checking permissions…</p>
        </div>
      </div>
    );
  }

  if (!accessAllowed) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            Admin access required
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            You must be signed in as an admin to manage the newsletter.
          </p>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------
   * Render
   * ---------------------------------------------------------- */
  return (
    <>
      <Head>
        <title>Newsletter Manager — Admin</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Newsletter
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Newsletter Manager
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Compose a message and send it to buyers, sellers, renters, opted-in
              users, or advertisers.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                showPreview
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Eye size={14} />
              {showPreview ? 'Hide preview' : 'Preview email'}
            </button>
            <button
              type="button"
              onClick={handleNewDraft}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <FilePlus size={14} />
              New draft
            </button>
          </div>
        </div>

        {/* Preview banner */}
        {showPreview && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Eye size={14} className="text-slate-500" />
                <p className="text-sm font-semibold text-slate-900">
                  Email preview
                </p>
              </div>
              <p className="text-xs text-slate-500">
                This is how the email will render for recipients
              </p>
            </div>
            <iframe
              title="Email preview"
              srcDoc={previewHtml}
              className="h-[640px] w-full bg-slate-100"
              sandbox=""
            />
          </div>
        )}

        {/* Lead count summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Service request leads
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {summary.visitorCount}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Emails collected from service request submissions.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-600">
              <Eye size={13} />
              Live — refreshes on send
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* LEFT: composer */}
          <div className="space-y-6">
            {/* Compose */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">Compose</h2>

              <div className="mt-5 space-y-4">
                <div>
                  <label className={labelClass}>Subject *</label>
                  <input
                    type="text"
                    value={newsletter.subject}
                    onChange={(e) =>
                      setNewsletter((prev) => ({ ...prev, subject: e.target.value }))
                    }
                    placeholder="Newsletter subject"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Preview text</label>
                  <input
                    type="text"
                    value={newsletter.previewText}
                    onChange={(e) =>
                      setNewsletter((prev) => ({
                        ...prev,
                        previewText: e.target.value,
                      }))
                    }
                    placeholder="Short preview text shown in inbox"
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Appears next to the subject line in most email clients.
                  </p>
                </div>

                {/* Personalization tokens */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Personalization tokens
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['{{first_name}}', '{{last_name}}', '{{parish}}'].map(
                      (token) => (
                        <code
                          key={token}
                          className="rounded-md bg-white px-2 py-1 text-xs font-mono text-slate-700"
                        >
                          {token}
                        </code>
                      )
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Use these in the subject or body. Missing values fall back to a
                    friendly default.
                  </p>
                </div>

                {/* Editor */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className={labelClass}>Body *</label>
                    <span className="text-[11px] text-slate-500">
                      Wrapped in the Dosnine email template on send
                    </span>
                  </div>

                  {/* Toolbar */}
                  <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
                    <ToolbarButton
                      onClick={() => editor?.chain().focus().toggleBold().run()}
                      active={editor?.isActive('bold')}
                      title="Bold"
                    >
                      <Bold size={13} />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={() => editor?.chain().focus().toggleItalic().run()}
                      active={editor?.isActive('italic')}
                      title="Italic"
                    >
                      <Italic size={13} />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={() => editor?.chain().focus().toggleStrike().run()}
                      active={editor?.isActive('strike')}
                      title="Strikethrough"
                    >
                      <Strikethrough size={13} />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={() =>
                        editor?.chain().focus().toggleHeading({ level: 2 }).run()
                      }
                      active={editor?.isActive('heading', { level: 2 })}
                      title="Heading"
                    >
                      <Heading2 size={13} />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={() =>
                        editor?.chain().focus().toggleBulletList().run()
                      }
                      active={editor?.isActive('bulletList')}
                      title="Bullet list"
                    >
                      <List size={13} />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={handleToggleLinkInput}
                      active={editor?.isActive('link')}
                      title="Link"
                    >
                      <LinkIcon size={13} />
                    </ToolbarButton>
                    <ToolbarButton onClick={openImageUpload} title="Insert image">
                      <ImageIcon size={13} />
                    </ToolbarButton>
                  </div>

                  {showLinkInput && (
                    <div className="mb-3 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                      <button
                        type="button"
                        onClick={handleAddLink}
                        className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-accent/90"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLinkInput(false)}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Advertisement inserter */}
                  <div className="mb-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Megaphone size={13} />
                      Insert ad
                    </div>
                    <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                      <div className="relative flex-1">
                        <select
                          value={selectedAdvertisementId}
                          onChange={(e) =>
                            setSelectedAdvertisementId(e.target.value)
                          }
                          className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-accent"
                        >
                          <option value="">Select an advertisement…</option>
                          {advertisements.map((ad) => (
                            <option key={ad.id} value={ad.id}>
                              {ad.title || ad.company_name || 'Advertisement'}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={12}
                          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={insertAdvertisement}
                        disabled={!selectedAdvertisementId}
                        className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        Insert
                      </button>
                    </div>
                  </div>

                  {/* Active formatting */}
                  {activeFormatting.length > 0 && (
                    <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="font-semibold uppercase tracking-wider text-slate-500">
                        Active:
                      </span>
                      {activeFormatting.map((format) => (
                        <span
                          key={format}
                          className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600"
                        >
                          {format}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <EditorContent editor={editor} />
                  </div>

                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>

                {/* Draft controls */}
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={savingDraft}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60"
                  >
                    {savingDraft ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    {savingDraft ? 'Saving…' : 'Save draft'}
                  </button>
                  <button
                    type="button"
                    onClick={handleNewDraft}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <FilePlus size={14} />
                    New
                  </button>
                  {draftId && (
                    <span className="ml-auto truncate font-mono text-[11px] text-slate-400">
                      Draft: {draftId}
                    </span>
                  )}
                </div>

                {/* Unsubscribe info */}
                <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
                  <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
                  <p>
                    Every send is wrapped in the Dosnine email template with a
                    branded header, footer, and unsubscribe link.
                  </p>
                </div>
              </div>
            </section>

            {/* Recipients */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">Recipients</h2>
                <span className="text-xs font-semibold text-slate-500">
                  {recipientCount} matched
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {RECIPIENT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const selected = recipientSource === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                        selected
                          ? 'border-accent bg-accent/5'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="recipientSource"
                        value={option.value}
                        checked={selected}
                        onChange={() => setRecipientSource(option.value)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--accent-color)]"
                      />
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          selected
                            ? 'bg-accent/15 text-accent'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900">
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  This send will reach
                </p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
                  {recipientCount}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {RECIPIENT_OPTIONS.find((o) => o.value === recipientSource)
                    ?.description || ''}
                </p>
              </div>
            </section>
          </div>

          {/* RIGHT: send + drafts */}
          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            {/* Send card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-base font-bold text-slate-900">
                Send newsletter
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Sends a branded HTML email to {recipientCount} recipient
                {recipientCount === 1 ? '' : 's'} with an unsubscribe footer.
              </p>

              <button
                type="button"
                onClick={handleSendNewsletter}
                disabled={
                  loadingSend || !newsletter.subject || !newsletter.htmlContent
                }
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60"
              >
                {loadingSend ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {loadingSend ? 'Sending…' : 'Send newsletter now'}
              </button>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <label className={labelClass}>Send a test first</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={handleSendTestNewsletter}
                  disabled={
                    loadingSend || !newsletter.subject || !newsletter.htmlContent
                  }
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                >
                  {loadingSend ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Mail size={14} />
                  )}
                  Send test email
                </button>
              </div>

              {sendResult && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900">
                  <CheckCircle2
                    size={14}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                  <div>
                    <p className="font-semibold">{sendResult.message}</p>
                    {sendResult.truncated && (
                      <p className="mt-1 text-emerald-800">
                        Note: only the first 100 recipients were included.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {testResult && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3.5 text-xs text-blue-900">
                  <Info size={14} className="mt-0.5 shrink-0 text-blue-600" />
                  <p className="font-semibold">{testResult.message}</p>
                </div>
              )}
            </section>

            {/* Drafts card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Drafts</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                  {drafts.length}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {drafts.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-6 text-center text-xs text-slate-500">
                    No saved drafts yet
                  </p>
                ) : (
                  drafts.map((draft) => {
                    const isActive = draftId === draft.id;
                    return (
                      <div
                        key={draft.id}
                        className={`rounded-lg border p-3 transition ${
                          isActive
                            ? 'border-accent bg-accent/5'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {draft.subject || 'Untitled draft'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Saved{' '}
                          {draft.saved_at
                            ? new Date(draft.saved_at).toLocaleDateString()
                            : '—'}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => loadDraft(draft)}
                            className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-accent/90"
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteDraft(draft.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-3 py-1 text-[11px] font-semibold text-red-700 transition hover:bg-red-50"
                          >
                            <Trash2 size={10} />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ============================================================
 * Sub-components
 * ============================================================ */

function ToolbarButton({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
        active
          ? 'border-accent bg-accent text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}