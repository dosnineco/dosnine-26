ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS payment_receipt_path TEXT,
  ADD COLUMN IF NOT EXISTS payment_receipt_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_receipt_plan TEXT,
  ADD COLUMN IF NOT EXISTS payment_receipt_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS payment_receipt_status TEXT NOT NULL DEFAULT 'none';

ALTER TABLE public.agents
  DROP CONSTRAINT IF EXISTS agents_payment_receipt_status_check;

ALTER TABLE public.agents
  ADD CONSTRAINT agents_payment_receipt_status_check
  CHECK (payment_receipt_status IN ('none', 'pending', 'verified'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agent-payment-receipts',
  'agent-payment-receipts',
  FALSE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_settings'
      AND policyname = 'Public read site settings'
  ) THEN
    CREATE POLICY "Public read site settings" ON public.site_settings
      FOR SELECT TO public USING (true);
  END IF;
END;
$$;

INSERT INTO public.site_settings (key, value)
VALUES ('plan_prices', '{"7-day":1499,"30-day":4999,"90-day":14999,"free":0}'::JSONB)
ON CONFLICT (key) DO UPDATE
SET value = CASE
  WHEN public.site_settings.value = '{"7-day":1500,"30-day":6000,"90-day":15000,"free":0}'::JSONB
    THEN EXCLUDED.value
  ELSE public.site_settings.value
END;

NOTIFY pgrst, 'reload schema';
