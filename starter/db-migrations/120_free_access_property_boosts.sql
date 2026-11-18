ALTER TABLE public.users
  ALTER COLUMN premium_service_request_order_amount TYPE numeric(12, 2)
  USING premium_service_request_order_amount::numeric(12, 2);

INSERT INTO public.site_settings (key, value, updated_at)
VALUES
  ('premium_service_price', '3178.40'::jsonb, NOW()),
  ('property_boost_price', '500'::jsonb, NOW())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;

CREATE TABLE IF NOT EXISTS public.property_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  payment_id text,
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'JMD',
  boost_start_date timestamptz NOT NULL DEFAULT NOW(),
  boost_end_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  last_shown_at timestamptz,
  rotation_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.property_boosts
  ADD COLUMN IF NOT EXISTS boost_source text NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS premium_cycle_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS previously_featured boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.property_boost_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  paypal_order_id text NOT NULL UNIQUE,
  paypal_capture_id text UNIQUE,
  expected_amount_jmd numeric(12, 2) NOT NULL CHECK (expected_amount_jmd > 0),
  status text NOT NULL DEFAULT 'awaiting_payment'
    CHECK (status IN ('awaiting_payment', 'completed', 'expired')),
  expires_at timestamptz NOT NULL,
  property_boost_id uuid REFERENCES public.property_boosts(id),
  created_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.property_boost_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_boosts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_boost_orders FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.property_boosts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.property_boost_orders TO service_role;
GRANT ALL ON public.property_boosts TO service_role;

WITH ranked_active_boosts AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY property_id
      ORDER BY boost_end_date DESC NULLS LAST, created_at DESC NULLS LAST, id
    ) AS position
  FROM public.property_boosts
  WHERE status = 'active'
)
UPDATE public.property_boosts AS boost
SET status = 'expired'
FROM ranked_active_boosts AS ranked
WHERE boost.id = ranked.id
  AND (ranked.position > 1 OR boost.boost_end_date <= NOW());

CREATE UNIQUE INDEX IF NOT EXISTS property_boosts_one_active_per_property
  ON public.property_boosts (property_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS property_boosts_one_included_per_cycle
  ON public.property_boosts (owner_id, premium_cycle_expires_at)
  WHERE boost_source = 'premium_included'
    AND premium_cycle_expires_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS property_boost_orders_one_pending_per_property
  ON public.property_boost_orders (property_id)
  WHERE status = 'awaiting_payment';

CREATE OR REPLACE FUNCTION public.expire_property_boosts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_boost record;
  expired_count integer := 0;
BEGIN
  FOR expired_boost IN
    SELECT boost.id, boost.property_id, boost.previously_featured
    FROM public.property_boosts AS boost
    LEFT JOIN public.properties AS property ON property.id = boost.property_id
    WHERE boost.status = 'active'
      AND (
        boost.boost_end_date <= NOW()
        OR lower(coalesce(property.status, '')) IN ('sold', 'rented', 'leased')
      )
    FOR UPDATE OF boost
  LOOP
    UPDATE public.property_boosts
    SET status = 'expired'
    WHERE id = expired_boost.id;

    IF NOT EXISTS (
      SELECT 1
      FROM public.property_boosts AS other_boost
      WHERE other_boost.property_id = expired_boost.property_id
        AND other_boost.status = 'active'
        AND other_boost.boost_end_date > NOW()
    ) THEN
      UPDATE public.properties
      SET is_featured = expired_boost.previously_featured,
          updated_at = NOW()
      WHERE id = expired_boost.property_id;
    END IF;

    expired_count := expired_count + 1;
  END LOOP;

  UPDATE public.property_boost_orders
  SET status = 'expired'
  WHERE status = 'awaiting_payment'
    AND expires_at <= NOW();

  RETURN expired_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_premium_property_boost(
  p_owner_id uuid,
  p_property_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  premium_expiry timestamptz;
  property_row public.properties%ROWTYPE;
  boost_id uuid;
BEGIN
  PERFORM public.expire_property_boosts();

  SELECT premium_service_request_expires
  INTO premium_expiry
  FROM public.users
  WHERE id = p_owner_id
    AND account_type = 'regular'
    AND premium_service_request = true
    AND premium_service_request_expires > NOW()
  FOR UPDATE;

  IF premium_expiry IS NULL THEN
    RAISE EXCEPTION 'Active Premium access is required for the included boost';
  END IF;

  SELECT *
  INTO property_row
  FROM public.properties
  WHERE id = p_property_id
    AND owner_id = p_owner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found';
  END IF;
  IF lower(coalesce(property_row.status, '')) IN ('sold', 'rented', 'leased') THEN
    RAISE EXCEPTION 'A sold or rented property cannot be boosted';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.property_boosts
    WHERE property_id = p_property_id
      AND status = 'active'
      AND boost_end_date > NOW()
  ) THEN
    RAISE EXCEPTION 'This property already has an active boost';
  END IF;

  INSERT INTO public.property_boosts (
    property_id,
    owner_id,
    payment_id,
    amount,
    currency,
    boost_start_date,
    boost_end_date,
    status,
    boost_source,
    premium_cycle_expires_at,
    previously_featured
  )
  VALUES (
    p_property_id,
    p_owner_id,
    'PREMIUM_INCLUDED:' || gen_random_uuid()::text,
    0,
    'JMD',
    NOW(),
    NOW() + INTERVAL '30 days',
    'active',
    'premium_included',
    premium_expiry,
    coalesce(property_row.is_featured, false)
  )
  RETURNING id INTO boost_id;

  UPDATE public.properties
  SET is_featured = true,
      updated_at = NOW()
  WHERE id = p_property_id;

  RETURN boost_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_property_boost_order(
  p_owner_id uuid,
  p_paypal_order_id text,
  p_paypal_capture_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_row public.property_boost_orders%ROWTYPE;
  property_row public.properties%ROWTYPE;
  boost_id uuid;
BEGIN
  SELECT *
  INTO order_row
  FROM public.property_boost_orders
  WHERE owner_id = p_owner_id
    AND paypal_order_id = p_paypal_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property boost order not found';
  END IF;
  IF order_row.status = 'completed' THEN
    IF order_row.paypal_capture_id = p_paypal_capture_id THEN
      RETURN order_row.property_boost_id;
    END IF;
    RAISE EXCEPTION 'Property boost order has already been completed';
  END IF;
  IF order_row.status <> 'awaiting_payment' OR order_row.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Property boost order has expired';
  END IF;

  PERFORM public.expire_property_boosts();

  SELECT *
  INTO property_row
  FROM public.properties
  WHERE id = order_row.property_id
    AND owner_id = p_owner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found';
  END IF;
  IF lower(coalesce(property_row.status, '')) IN ('sold', 'rented', 'leased') THEN
    RAISE EXCEPTION 'A sold or rented property cannot be boosted';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.property_boosts
    WHERE property_id = order_row.property_id
      AND status = 'active'
      AND boost_end_date > NOW()
  ) THEN
    RAISE EXCEPTION 'This property already has an active boost';
  END IF;

  INSERT INTO public.property_boosts (
    property_id,
    owner_id,
    payment_id,
    amount,
    currency,
    boost_start_date,
    boost_end_date,
    status,
    boost_source,
    previously_featured
  )
  VALUES (
    order_row.property_id,
    p_owner_id,
    p_paypal_capture_id,
    order_row.expected_amount_jmd,
    'JMD',
    NOW(),
    NOW() + INTERVAL '30 days',
    'active',
    'paid',
    coalesce(property_row.is_featured, false)
  )
  RETURNING id INTO boost_id;

  UPDATE public.properties
  SET is_featured = true,
      updated_at = NOW()
  WHERE id = order_row.property_id;

  UPDATE public.property_boost_orders
  SET status = 'completed',
      paypal_capture_id = p_paypal_capture_id,
      property_boost_id = boost_id
  WHERE id = order_row.id;

  RETURN boost_id;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_property_boosts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_premium_property_boost(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_property_boost_order(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_property_boosts() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_premium_property_boost(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_property_boost_order(uuid, text, text) TO service_role;
