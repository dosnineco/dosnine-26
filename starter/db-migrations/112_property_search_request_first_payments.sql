ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS parish text;

ALTER TABLE public.service_requests
  DROP CONSTRAINT IF EXISTS service_requests_status_check;

ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_status_check CHECK (
    status = ANY (ARRAY[
      'open'::text,
      'assigned'::text,
      'in_progress'::text,
      'completed'::text,
      'withdrawn'::text,
      'cancelled'::text,
      'pending_payment'::text
    ])
  );

ALTER TABLE public.paid_property_search_requests
  DROP CONSTRAINT IF EXISTS paid_property_search_requests_amount_check,
  DROP CONSTRAINT IF EXISTS paid_property_search_requests_currency_check;

ALTER TABLE public.paid_property_search_requests
  ALTER COLUMN amount TYPE numeric(10, 2),
  ALTER COLUMN currency SET DEFAULT 'USD';

ALTER TABLE public.paid_property_search_requests
  ADD CONSTRAINT paid_property_search_requests_amount_currency_check CHECK (
    (currency = 'USD' AND amount = 9.99)
    OR (currency = 'JMD' AND amount = 2500.00)
  ),
  ADD CONSTRAINT paid_property_search_requests_currency_check CHECK (currency IN ('USD', 'JMD'));

CREATE OR REPLACE FUNCTION public.create_pending_paid_property_search_request(
  p_user_id uuid,
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_request_type text,
  p_property_type text,
  p_location text,
  p_parish text,
  p_budget_min numeric,
  p_budget_max numeric,
  p_bedrooms integer,
  p_description text,
  p_currency text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  created_request_id uuid;
  created_payment_request_id uuid;
  request_amount numeric(10, 2);
BEGIN
  IF p_currency = 'USD' THEN
    request_amount := 9.99;
  ELSIF p_currency = 'JMD' THEN
    request_amount := 2500.00;
  ELSE
    RAISE EXCEPTION 'Unsupported property search payment currency';
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
    status,
    is_contacted
  ) VALUES (
    p_user_id,
    p_client_name,
    p_client_email,
    p_client_phone,
    p_request_type,
    p_property_type,
    p_location,
    p_parish,
    p_budget_min,
    p_budget_max,
    p_bedrooms,
    concat(
      'Dosnine property search request. Payment is required before the request is published. ',
      'Dosnine is not a real estate agent or broker. ',
      COALESCE(p_description, '')
    ),
    'normal',
    'pending_payment',
    true
  )
  RETURNING id INTO created_request_id;

  INSERT INTO public.paid_property_search_requests (
    user_id,
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
    amount,
    currency,
    terms_accepted_at,
    service_request_id
  ) VALUES (
    p_user_id,
    p_client_name,
    p_client_email,
    p_client_phone,
    p_request_type,
    p_property_type,
    p_location,
    p_parish,
    p_budget_min,
    p_budget_max,
    p_bedrooms,
    p_description,
    request_amount,
    p_currency,
    now(),
    created_request_id
  )
  RETURNING id INTO created_payment_request_id;

  RETURN jsonb_build_object(
    'payment_request_id', created_payment_request_id,
    'service_request_id', created_request_id
  );
END;
$$;

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
  published_request_id uuid;
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

  IF search_request.status <> 'awaiting_payment' OR search_request.service_request_id IS NULL THEN
    RAISE EXCEPTION 'Paid property search request is not awaiting payment';
  END IF;

  UPDATE public.service_requests
  SET status = 'open'
  WHERE id = search_request.service_request_id
    AND client_user_id = search_request.user_id
    AND status = 'pending_payment'
  RETURNING id INTO published_request_id;

  IF published_request_id IS NULL THEN
    RAISE EXCEPTION 'Property request is not awaiting payment';
  END IF;

  UPDATE public.paid_property_search_requests
  SET
    status = 'paid',
    paypal_capture_id = payment_capture_id,
    paid_at = now()
  WHERE id = search_request.id;

  RETURN published_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_pending_paid_property_search_request(
  uuid, text, text, text, text, text, text, text, numeric, numeric, integer, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_paid_property_search_request(
  uuid, text, text, text, text, text, text, text, numeric, numeric, integer, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.complete_paid_property_search_request(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_paid_property_search_request(uuid, text) TO service_role;
