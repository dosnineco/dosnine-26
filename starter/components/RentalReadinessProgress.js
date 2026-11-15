import { ShieldCheck } from 'lucide-react';
import { RENTAL_READINESS_LEVELS } from '../lib/renterReadiness';

export default function RentalReadinessProgress({ level = 1 }) {
  const currentLevel = Math.min(4, Math.max(1, Number(level) || 1));
  const current = RENTAL_READINESS_LEVELS[currentLevel - 1];

  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-700">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          Rental readiness
        </span>
        <span className="text-xs font-semibold text-gray-600">Level {currentLevel} of 4</span>
      </div>
      <div
        className="mt-2.5 flex gap-1.5"
        role="progressbar"
        aria-label="Rental readiness progress"
        aria-valuemin={1}
        aria-valuemax={4}
        aria-valuenow={currentLevel}
      >
        {RENTAL_READINESS_LEVELS.map((step) => (
          <div
            key={step.number}
            className={`h-1.5 flex-1 rounded-full ${
              step.number < currentLevel
                ? 'bg-emerald-500'
                : step.number === currentLevel
                  ? 'bg-accent'
                  : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-sm font-semibold text-gray-800">
        {current.label}
        <span className="ml-1.5 font-normal text-gray-500">· {current.hint}</span>
      </p>
    </div>
  );
}
