CREATE TABLE IF NOT EXISTS public.service_request_urgency_boost_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_request_ids uuid[] NOT NULL CHECK (cardinality(service_request_ids) > 0),
  urgency text NOT NULL CHECK (urgency IN ('high', 'urgent')),
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  token_hash text NOT NULL CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'awaiting_payment'
    CHECK (status IN ('awaiting_payment', 'paid', 'expired')),
  paypal_order_id text UNIQUE,
  paypal_capture_id text UNIQUE,
  terms_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_service_request_urgency_boost_batches_user
  ON public.service_request_urgency_boost_batches (client_user_id, created_at DESC);

ALTER TABLE public.service_request_urgency_boost_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_request_urgency_boost_batches FROM anon, authenticated;
GRANT ALL ON public.service_request_urgency_boost_batches TO service_role;

CREATE OR REPLACE FUNCTION public.create_service_request_urgency_boost_batch(
  p_client_user_id uuid,
  p_service_request_ids uuid[],
  p_urgency text,
  p_amount numeric,
  p_token_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  batch_id uuid;
  request_count integer;
BEGIN
  IF p_urgency NOT IN ('high', 'urgent')
    OR p_amount <= 0
    OR p_token_hash !~ '^[a-f0-9]{64}$'
    OR cardinality(p_service_request_ids) < 1 THEN
    RAISE EXCEPTION 'Invalid priority boost details';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_client_user_id::text, 0));

  UPDATE public.service_request_urgency_boost_batches
  SET status = 'expired'
  WHERE client_user_id = p_client_user_id
    AND status = 'awaiting_payment'
    AND expires_at <= now();

  SELECT count(*)
  INTO request_count
  FROM public.service_requests
  WHERE id = ANY(p_service_request_ids)
    AND client_user_id = p_client_user_id
    AND COALESCE(urgency, 'normal') IN ('low', 'normal')
    AND status NOT IN ('completed', 'cancelled', 'deleted', 'withdrawn');

  IF request_count <> cardinality(p_service_request_ids) THEN
    RAISE EXCEPTION 'One or more requests are no longer eligible for a boost';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.service_request_urgency_payments
    WHERE service_request_id = ANY(p_service_request_ids)
  ) OR EXISTS (
    SELECT 1
    FROM public.service_request_urgency_boost_batches
    WHERE status = 'awaiting_payment'
      AND service_request_ids && p_service_request_ids
  ) THEN
    RAISE EXCEPTION 'A boost is already pending or has already been purchased for one or more requests';
  END IF;

  INSERT INTO public.service_request_urgency_boost_batches (
    client_user_id,
    service_request_ids,
    urgency,
    amount,
    token_hash
  )
  VALUES (
    p_client_user_id,
    p_service_request_ids,
    p_urgency,
    p_amount,
    p_token_hash
  )
  RETURNING id INTO batch_id;

  RETURN batch_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_service_request_urgency_boost_batch(uuid, uuid[], text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_service_request_urgency_boost_batch(uuid, uuid[], text, numeric, text) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_paid_service_request_urgency_boost_batch(
  p_batch_id uuid,
  p_capture_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  boost_batch public.service_request_urgency_boost_batches%ROWTYPE;
  updated_count integer;
BEGIN
  SELECT *
  INTO boost_batch
  FROM public.service_request_urgency_boost_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request priority boost batch not found';
  END IF;

  IF boost_batch.status = 'paid' AND boost_batch.paypal_capture_id = p_capture_id THEN
    RETURN true;
  END IF;

  IF boost_batch.status <> 'awaiting_payment' OR boost_batch.expires_at <= now() THEN
    RAISE EXCEPTION 'Request priority boost batch is no longer available';
  END IF;

  UPDATE public.service_requests
  SET urgency = boost_batch.urgency
  WHERE id = ANY(boost_batch.service_request_ids)
    AND client_user_id = boost_batch.client_user_id
    AND COALESCE(urgency, 'normal') IN ('low', 'normal')
    AND status NOT IN ('completed', 'cancelled', 'deleted', 'withdrawn');

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> cardinality(boost_batch.service_request_ids) THEN
    RAISE EXCEPTION 'One or more requests are no longer eligible for a boost';
  END IF;

  UPDATE public.service_request_urgency_boost_batches
  SET status = 'paid',
      paypal_capture_id = p_capture_id,
      paid_at = now()
  WHERE id = boost_batch.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_paid_service_request_urgency_boost_batch(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_paid_service_request_urgency_boost_batch(uuid, text) TO service_role;
