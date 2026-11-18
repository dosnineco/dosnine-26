import Link from 'next/link';

const WHATSAPP_NUMBER = '18763369045';

export default function BankTransferOption({ service, amountJmd, reference }) {
  const amount = Number(amountJmd);
  const amountText = Number.isFinite(amount) && amount > 0
    ? `JMD ${amount.toLocaleString('en-JM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'the displayed amount';
  const message = [
    'Hello Dosnine Team, I would like to pay by bank transfer.',
    `Service: ${service}.`,
    `Amount: ${amountText}.`,
    reference ? `Reference: ${reference}.` : '',
    'Please send the bank transfer instructions. I understand the service will activate after the transfer is verified.',
  ].filter(Boolean).join(' ');
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <div className="mt-4 rounded-xl bg-gray-50 p-4 text-center">
      <p className="text-sm font-semibold text-gray-800">Prefer bank transfer?</p>
      <Link
        href={href}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-accent ring-1 ring-gray-200 hover:bg-gray-100"
      >
        Request bank transfer instructions
      </Link>
      <p className="mt-2 text-xs text-gray-500">We verify the transfer before activating the service.</p>
    </div>
  );
}
