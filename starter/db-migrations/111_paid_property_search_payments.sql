CREATE TABLE IF NOT EXISTS public.paid_property_search_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('buy', 'rent')),
  property_type text NOT NULL CHECK (property_type IN ('house', 'apartment', 'land', 'commercial', 'other')),
  location text NOT NULL,
  parish text,
  budget_min numeric(14, 2),
  budget_max numeric(14, 2),
  bedrooms integer CHECK (bedrooms IS NULL OR (bedrooms >= 0 AND bedrooms <= 20)),
  description text,
  amount numeric(6, 2) NOT NULL DEFAULT 9.99 CHECK (amount = 9.99),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  terms_accepted_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'awaiting_payment'
    CHECK (status IN ('awaiting_payment', 'paid', 'failed')),
  paypal_order_id text UNIQUE,
  paypal_capture_id text UNIQUE,
  service_request_id uuid UNIQUE REFERENCES public.service_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_paid_property_search_requests_user
  ON public.paid_property_search_requests (user_id, created_at DESC);

ALTER TABLE public.paid_property_search_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.paid_property_search_requests FROM anon, authenticated;
GRANT ALL ON public.paid_property_search_requests TO service_role;

CREATE OR REPLACE FUNCTION public.complete_paid_property_search_request(
  search_request_id uuid,
  payment_capture_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  search_request public.paid_property_search_requests%ROWTYPE;
  created_request_id uuid;
BEGIN
  SELECT *
  INTO search_request
  FROM public.paid_property_search_requests
  WHERE id = search_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paid property search request not found';
  END IF;

  IF search_request.status = 'paid' AND search_request.service_request_id IS NOT NULL THEN
    RETURN search_request.service_request_id;
  END IF;

  IF search_request.status <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'Paid property search request is not awaiting payment';
  END IF;

  INSERT INTO public.service_requests (
    client_user_id,
    client_name,
    client_email,
    client_phone,
    request_type,
    property_type,
    location,
    parish,
    budget_min,
    budget_max,
    bedrooms,
    description,
    urgency,
    status
  ) VALUES (
    search_request.user_id,
    search_request.client_name,
    search_request.client_email,
    search_request.client_phone,
    search_request.request_type,
    search_request.property_type,
    search_request.location,
    search_request.parish,
    search_request.budget_min,
    search_request.budget_max,
    search_request.bedrooms,
    concat(
      'Paid Dosnine Property Search ($9.99 USD). ',
      'Dosnine is not a real estate agent and does not broker or guarantee transactions. ',
      COALESCE(search_request.description, '')
    ),
    'normal',
    'open'
  )
  RETURNING id INTO created_request_id;

  UPDATE public.paid_property_search_requests
  SET
    status = 'paid',
    paypal_capture_id = payment_capture_id,
    service_request_id = created_request_id,
    paid_at = now()
  WHERE id = search_request.id;

  RETURN created_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_paid_property_search_request(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_paid_property_search_request(uuid, text) TO service_role;
