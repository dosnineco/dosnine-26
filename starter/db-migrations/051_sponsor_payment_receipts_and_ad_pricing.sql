ALTER TABLE public.sponsor_submissions
  ADD COLUMN IF NOT EXISTS payment_receipt_path TEXT,
  ADD COLUMN IF NOT EXISTS payment_receipt_submitted_at TIMESTAMPTZ;

DROP FUNCTION IF EXISTS public.confirm_gumroad_sponsor_payment(UUID, TEXT, TIMESTAMPTZ, TEXT);
DROP INDEX IF EXISTS public.idx_sponsor_submissions_gumroad_sale_id;

ALTER TABLE public.sponsor_submissions
  DROP COLUMN IF EXISTS gumroad_sale_id,
  DROP COLUMN IF EXISTS gumroad_product_permalink;

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
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO public.site_settings (key, value)
VALUES ('ad_plan_prices', '{"14-day":17999,"30-day":52499}'::JSONB)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';

CREATE OR REPLACE FUNCTION public.confirm_bank_transfer_sponsor_payment(
  p_submission_id UUID
)
RETURNS TABLE (submission_status TEXT, scheduled_month DATE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_submission public.sponsor_submissions%ROWTYPE;
  payment_month DATE;
  assigned_month DATE;
  reserved_slots INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('dosnine-sponsor-monthly-capacity'));

  SELECT *
  INTO existing_submission
  FROM public.sponsor_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sponsor submission not found';
  END IF;

  IF existing_submission.payment_status = 'paid' THEN
    RETURN QUERY SELECT existing_submission.status, existing_submission.scheduled_month;
    RETURN;
  END IF;

  IF existing_submission.status = 'rejected' THEN
    RAISE EXCEPTION 'Rejected sponsor submissions cannot be marked paid';
  END IF;

  payment_month := date_trunc(
    'month',
    NOW() AT TIME ZONE 'America/Jamaica'
  )::DATE;
  assigned_month := payment_month;

  LOOP
    SELECT COUNT(*)::INTEGER
    INTO reserved_slots
    FROM public.sponsor_submissions
    WHERE scheduled_month = assigned_month
      AND payment_status = 'paid'
      AND status <> 'rejected';

    EXIT WHEN reserved_slots < 40;
    assigned_month := (assigned_month + INTERVAL '1 month')::DATE;
  END LOOP;

  UPDATE public.sponsor_submissions
  SET payment_status = 'paid',
      paid_at = NOW(),
      scheduled_month = assigned_month,
      status = CASE
        WHEN assigned_month = payment_month THEN 'pending_review'
        ELSE 'waitlisted'
      END
  WHERE id = p_submission_id;

  RETURN QUERY
  SELECT s.status, s.scheduled_month
  FROM public.sponsor_submissions AS s
  WHERE s.id = p_submission_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_bank_transfer_sponsor_payment(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_bank_transfer_sponsor_payment(UUID)
  TO service_role;
