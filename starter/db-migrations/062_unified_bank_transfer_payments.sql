CREATE TABLE IF NOT EXISTS public.bank_transfer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_id TEXT,
  payer_name TEXT,
  payer_email TEXT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'JMD',
  reference_ids TEXT[] DEFAULT '{}',
  receipt_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_bank_transfer_payments_submitted
  ON public.bank_transfer_payments (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transfer_payments_status
  ON public.bank_transfer_payments (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transfer_payments_source
  ON public.bank_transfer_payments (source_type, source_id);

ALTER TABLE public.bank_transfer_payments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.bank_transfer_payments TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-receipts',
  'payment-receipts',
  FALSE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

NOTIFY pgrst, 'reload schema';
