import { CheckCircle } from 'lucide-react';

export default function VerifiedBadge({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div 
      className={`inline-flex items-center gap-1 ${className}`}
      title="Verified Agent"
    >
      <CheckCircle 
        className={`${sizes[size]} text-accent fill-accent`}
        strokeWidth={2}
      />
      <span className="text-xs font-medium text-accent">Verified</span>
    </div>
  );
}
