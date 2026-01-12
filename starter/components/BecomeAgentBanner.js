import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Info } from 'lucide-react';

export default function BecomeAgentBanner() {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <section className="mb-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 md:px-7 md:py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            
            <div className="sm:text-left text-center ">
              <h2 className="text-lg md:text-xl font-semibold text-amber-900">Become An Agent</h2>
            
              <p className="text-sm text-amber-900/80 mt-2">
                294 active client requests waiting to be assigned. Join our agents and start claiming qualified leads today.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 md:gap-3">
            <Link href="/agent/signup" className="btn-primary inline-flex items-center gap-1">
              Signup as Agent <ArrowRight className="h-4 w-4" />
            </Link>
       
          </div>
        </div>

        {showDetails && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-amber-900/80">
                Your monthly contribution helps maintain and improve the platform — servers, new features, and customer support.
              </p>
              <ul className="text-sm text-amber-900/85 list-disc pl-5 space-y-1">
                <li>Due Date: 1st of each month</li>
                <li>No contribution = No request assignments for that month</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">What’s included</p>
              <ul className="text-sm text-amber-900/85 list-disc pl-5 space-y-1">
                <li>Access to all client requests (buy, rent, sell, lease)</li>
                <li>Direct client contact information</li>
                <li>Help generate leads</li>
                <li>Unlimited property postings</li>
                <li>Real‑time request notifications</li>
                <li>Client dashboard and messaging</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
