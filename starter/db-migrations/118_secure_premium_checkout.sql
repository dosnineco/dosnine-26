ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS premium_service_request_order_id TEXT,
  ADD COLUMN IF NOT EXISTS premium_service_request_order_amount INTEGER,
  ADD COLUMN IF NOT EXISTS extra_listing_order_id TEXT,
  ADD COLUMN IF NOT EXISTS extra_listing_order_amount INTEGER,
  ADD COLUMN IF NOT EXISTS extra_listing_payment_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_premium_service_request_order_id_unique
  ON public.users (premium_service_request_order_id)
  WHERE premium_service_request_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_extra_listing_order_id_unique
  ON public.users (extra_listing_order_id)
  WHERE extra_listing_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_extra_listing_payment_id_unique
  ON public.users (extra_listing_payment_id)
  WHERE extra_listing_payment_id IS NOT NULL;

UPDATE public.site_settings
SET value = jsonb_set(value, '{30-day}', '5175'::jsonb),
    updated_at = NOW()
WHERE key = 'plan_prices'
  AND value->>'30-day' = '4999';

INSERT INTO public.site_settings (key, value, updated_at)
VALUES
  ('premium_service_price', '4900'::jsonb, NOW()),
  ('extra_listing_price', '1500'::jsonb, NOW()),
  ('paid_property_search_prices', '{"USD":9.99,"JMD":2500}'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;
