ALTER TABLE public.sponsor_submissions
  ADD COLUMN IF NOT EXISTS paypal_order_id text,
  ADD COLUMN IF NOT EXISTS paypal_capture_id text;

CREATE UNIQUE INDEX IF NOT EXISTS sponsor_submissions_paypal_capture_id_unique
  ON public.sponsor_submissions (paypal_capture_id)
  WHERE paypal_capture_id IS NOT NULL;
