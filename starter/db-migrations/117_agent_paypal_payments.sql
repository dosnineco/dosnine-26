ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS paypal_order_id text,
  ADD COLUMN IF NOT EXISTS paypal_order_amount integer,
  ADD COLUMN IF NOT EXISTS paypal_capture_id text;

CREATE UNIQUE INDEX IF NOT EXISTS agents_paypal_capture_id_unique
  ON public.agents (paypal_capture_id)
  WHERE paypal_capture_id IS NOT NULL;
