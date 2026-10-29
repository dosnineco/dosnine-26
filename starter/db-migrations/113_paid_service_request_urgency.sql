INSERT INTO public.site_settings (key, value)
VALUES ('request_urgency_prices', '{"high": 9.99, "urgent": 14.99}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.service_request_urgency_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL UNIQUE REFERENCES public.service_requests(id) ON DELETE CASCADE,
  urgency text NOT NULL CHECK (urgency IN ('high', 'urgent')),
  amount numeric(8, 2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  token_hash text NOT NULL CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'awaiting_payment'
    CHECK (status IN ('awaiting_payment', 'paid')),
  paypal_order_id text UNIQUE,
  paypal_capture_id text UNIQUE,
  terms_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_service_request_urgency_payments_status
  ON public.service_request_urgency_payments (status, created_at DESC);

ALTER TABLE public.service_request_urgency_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_request_urgency_payments FROM anon, authenticated;
GRANT ALL ON public.service_request_urgency_payments TO service_role;

CREATE OR REPLACE FUNCTION public.complete_paid_service_request_urgency(
  p_payment_id uuid,
  p_capture_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  payment public.service_request_urgency_payments%ROWTYPE;
BEGIN
  SELECT *
  INTO payment
  FROM public.service_request_urgency_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service request urgency payment not found';
  END IF;

  IF payment.status = 'paid' AND payment.paypal_capture_id = p_capture_id THEN
    RETURN true;
  END IF;

  IF payment.status <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'Service request urgency payment is not awaiting payment';
  END IF;

  UPDATE public.service_requests
  SET urgency = payment.urgency
  WHERE id = payment.service_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service request for urgency payment not found';
  END IF;

  UPDATE public.service_request_urgency_payments
  SET status = 'paid',
      paypal_capture_id = p_capture_id,
      paid_at = now()
  WHERE id = payment.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_paid_service_request_urgency(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_paid_service_request_urgency(uuid, text) TO service_role;
