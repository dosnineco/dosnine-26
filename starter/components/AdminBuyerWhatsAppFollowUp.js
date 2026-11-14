import { ImageDown, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const DASHBOARD_URL = 'https://dosnine.com/dashboard';

const formatBudget = (value) => `J$${Number(value).toLocaleString('en-JM')}`;

const getRequestFields = (request) => {
  const propertyDetails = [
    request.property_type,
    request.bedrooms != null ? `${request.bedrooms} bedroom${request.bedrooms === 1 ? '' : 's'}` : null,
    request.bathrooms != null ? `${request.bathrooms} bathroom${request.bathrooms === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' | ');
  const hasBudgetMin = request.budget_min != null && request.budget_min !== '';
  const hasBudgetMax = request.budget_max != null && request.budget_max !== '';
  const budget = hasBudgetMin && hasBudgetMax
    ? `${formatBudget(request.budget_min)} - ${formatBudget(request.budget_max)}`
    : hasBudgetMin
      ? `From ${formatBudget(request.budget_min)}`
      : hasBudgetMax
        ? `Up to ${formatBudget(request.budget_max)}`
        : 'Not specified';

  return [
    { label: 'PROPERTY', value: propertyDetails || 'Not specified' },
    { label: 'LOCATION', value: request.location || 'Not specified' },
    { label: 'BUDGET', value: budget },
    ...(request.description
      ? [{
        label: 'PREFERENCES',
        value: `${request.description.slice(0, 150)}${request.description.length > 150 ? '...' : ''}`,
      }]
      : []),
  ];
};

const getFollowUpText = (name, needsAccount, requestFields) => {
  const nextStep = needsAccount
    ? 'Create a free account or log in, then complete your buyer profile and upload supporting documents.'
    : 'Log in to your dashboard and upload supporting documents to complete your buyer profile.';

  const requestSummary = requestFields
    .map(({ label, value }) => `${label}: ${value}`)
    .join('\n');

  return `Hi ${name}, this is Dosnine Limited. We are following up on your property request:\n${requestSummary}\n\nWe noticed you have not uploaded supporting documents yet. ${nextStep} This can improve your chances of finding properties that fit your budget. Complete your buyer profile: ${DASHBOARD_URL}`;
};

const drawWrappedText = (context, text, x, y, maxWidth, lineHeight) => {
  let line = '';
  const words = text.split(/\s+/);

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      context.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = candidate;
    }
  });

  if (line) {
    context.fillText(line, x, y);
    y += lineHeight;
  }

  return y;
};

const downloadFollowUpImage = (name, nextStep, requestFields) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1600;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create the follow-up image.');

  context.fillStyle = '#f1f5f9';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#111827';
  context.fillRect(0, 0, canvas.width, 260);

  context.fillStyle = '#ffffff';
  context.font = '700 52px Arial, sans-serif';
  context.fillText('Dosnine Limited', 86, 105);
  context.fillStyle = '#fca5a5';
  context.font = '600 30px Arial, sans-serif';
  context.fillText('dosnine.com', 90, 165);

  context.fillStyle = '#ffffff';
  context.fillRect(64, 210, 952, 1320);

  context.fillStyle = '#111827';
  context.font = '600 36px Arial, sans-serif';
  context.fillText(`Hi ${name},`, 118, 325);

  context.font = '700 56px Arial, sans-serif';
  context.fillText("Let's improve your chances", 118, 415);
  context.fillText('of finding the right property.', 118, 485);

  context.fillStyle = '#dc2626';
  context.font = '700 24px Arial, sans-serif';
  context.fillText('YOUR PROPERTY REQUEST', 118, 555);

  let infoY = 610;
  requestFields.forEach(({ label, value }) => {
    context.fillStyle = '#64748b';
    context.font = '700 20px Arial, sans-serif';
    context.fillText(label, 118, infoY);
    context.fillStyle = '#1e293b';
    context.font = '30px Arial, sans-serif';
    infoY = drawWrappedText(context, value, 118, infoY + 38, 844, 38) + 18;
  });

  context.fillStyle = '#475569';
  context.font = '28px Arial, sans-serif';
  context.fillText('NEXT STEP', 118, infoY + 14);
  const bodyEnd = drawWrappedText(
    context,
    `${nextStep} This helps us understand your budget and find properties that fit.`,
    118,
    infoY + 58,
    844,
    42
  );

  const actionY = Math.max(1340, bodyEnd + 30);
  context.fillStyle = '#dc2626';
  context.fillRect(118, actionY, 844, 120);
  context.fillStyle = '#ffffff';
  context.font = '700 32px Arial, sans-serif';
  context.fillText('Complete your buyer profile', 158, actionY + 52);
  context.font = '26px Arial, sans-serif';
  context.fillText('dosnine.com/dashboard', 158, actionY + 92);

  context.fillStyle = '#64748b';
  context.font = '24px Arial, sans-serif';
  context.fillText('Dosnine Limited | dosnine.com', 118, 1570);

  const link = document.createElement('a');
  link.download = `dosnine-buyer-follow-up-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'client'}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

export default function AdminBuyerWhatsAppFollowUp({ request, formatWhatsAppNumber }) {
  const hasDocuments = request.buyer_prequalification?.documents?.length > 0;
  if (request.request_type !== 'buy' || hasDocuments) return null;

  const name = request.client_name?.trim().split(/\s+/)[0] || 'there';
  const needsAccount = !request.buyer_prequalification;
  const nextStep = needsAccount
    ? 'Create a free account or log in, then complete your buyer profile and upload supporting documents.'
    : 'Log in to your dashboard and upload supporting documents to complete your buyer profile.';
  const requestFields = getRequestFields(request);
  const phone = formatWhatsAppNumber(request.client_phone);
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(
    getFollowUpText(name, needsAccount, requestFields)
  )}`;

  const handleDownload = () => {
    try {
      downloadFollowUpImage(name, nextStep, requestFields);
      toast.success('Follow-up image downloaded. Attach it in WhatsApp.');
    } catch (error) {
      console.error('Failed to create buyer follow-up image:', error);
      toast.error(error.message || 'Unable to create the follow-up image.');
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3">
      <p className="mr-auto text-xs text-amber-900">
        No supporting documents uploaded. Encourage the buyer to complete their profile.
      </p>
      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        <ImageDown size={14} />
        Download image
      </button>
      <a
        href={phone ? whatsappUrl : undefined}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!phone}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition ${
          phone
            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
            : 'pointer-events-none bg-slate-200 text-slate-500'
        }`}
      >
        <MessageCircle size={14} />
        Message on WhatsApp
      </a>
    </div>
  );
}
