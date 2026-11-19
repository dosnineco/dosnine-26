DROP FUNCTION IF EXISTS public.complete_paid_property_search_request(uuid, text);
DROP FUNCTION IF EXISTS public.complete_paid_service_request_urgency(uuid, text);
DROP FUNCTION IF EXISTS public.complete_paid_service_request_urgency_boost_batch(uuid, text);
DROP FUNCTION IF EXISTS public.complete_property_boost_order(uuid, text, text);

ALTER TABLE public.agents
  DROP COLUMN IF EXISTS paypal_transaction_id,
  DROP COLUMN IF EXISTS paypal_order_id,
  DROP COLUMN IF EXISTS paypal_order_amount,
  DROP COLUMN IF EXISTS paypal_capture_id;

ALTER TABLE public.sponsor_submissions
  DROP COLUMN IF EXISTS paypal_order_id,
  DROP COLUMN IF EXISTS paypal_capture_id;

ALTER TABLE public.users
  DROP COLUMN IF EXISTS premium_service_request_order_id,
  DROP COLUMN IF EXISTS premium_service_request_order_amount,
  DROP COLUMN IF EXISTS premium_service_request_payment_id,
  DROP COLUMN IF EXISTS extra_listing_order_id,
  DROP COLUMN IF EXISTS extra_listing_order_amount,
  DROP COLUMN IF EXISTS extra_listing_payment_id;

ALTER TABLE public.paid_property_search_requests
  DROP COLUMN IF EXISTS paypal_order_id,
  DROP COLUMN IF EXISTS paypal_capture_id;

ALTER TABLE public.service_request_urgency_payments
  DROP COLUMN IF EXISTS paypal_order_id,
  DROP COLUMN IF EXISTS paypal_capture_id;

ALTER TABLE public.service_request_urgency_boost_batches
  DROP COLUMN IF EXISTS paypal_order_id,
  DROP COLUMN IF EXISTS paypal_capture_id;

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

  RETURN expired_count;
END;
$$;

DROP TABLE IF EXISTS public.property_boost_orders;

CREATE OR REPLACE FUNCTION public.complete_paid_property_search_request(
  search_request_id uuid
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
  SET status = 'paid',
      paid_at = now()
  WHERE id = search_request.id;

  RETURN published_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_paid_property_search_request(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_paid_property_search_request(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_paid_service_request_urgency(
  p_payment_id uuid
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

  IF payment.status = 'paid' THEN
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
      paid_at = now()
  WHERE id = payment.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_paid_service_request_urgency(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_paid_service_request_urgency(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_paid_service_request_urgency_boost_batch(
  p_batch_id uuid
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

  IF boost_batch.status = 'paid' THEN
    RETURN true;
  END IF;

  IF boost_batch.status NOT IN ('awaiting_payment', 'expired') THEN
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
      paid_at = now()
  WHERE id = boost_batch.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_paid_service_request_urgency_boost_batch(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_paid_service_request_urgency_boost_batch(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.approve_bank_transfer_payment(
  p_payment_id uuid,
  p_reviewed_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  payment public.bank_transfer_payments%ROWTYPE;
  property_row public.properties%ROWTYPE;
  application_ids uuid[];
  affected_count integer;
BEGIN
  SELECT *
  INTO payment
  FROM public.bank_transfer_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank transfer payment not found';
  END IF;

  IF payment.status <> 'pending' THEN
    RAISE EXCEPTION 'Bank transfer payment is no longer pending';
  END IF;

  CASE payment.source_type
    WHEN 'premium' THEN
      IF payment.source_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'Premium payment user is invalid';
      END IF;

      UPDATE public.users
      SET premium_service_request = true,
          premium_service_request_expires = GREATEST(
            COALESCE(premium_service_request_expires, now()),
            now()
          ) + interval '30 days'
      WHERE id = payment.source_id::uuid
        AND account_type = 'regular';
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Premium payment user not found';
      END IF;

    WHEN 'property_search' THEN
      PERFORM public.complete_paid_property_search_request(payment.source_id::uuid);

    WHEN 'request_urgency' THEN
      PERFORM public.complete_paid_service_request_urgency(payment.source_id::uuid);

    WHEN 'request_urgency_batch' THEN
      PERFORM public.complete_paid_service_request_urgency_boost_batch(payment.source_id::uuid);

    WHEN 'property_boost' THEN
      IF payment.currency <> 'JMD' OR payment.source_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'Property boost payment details are invalid';
      END IF;

      PERFORM public.expire_property_boosts();

      SELECT *
      INTO property_row
      FROM public.properties
      WHERE id = payment.source_id::uuid
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
        WHERE property_id = property_row.id
          AND status = 'active'
          AND boost_end_date > now()
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
        property_row.id,
        property_row.owner_id,
        'BANK_TRANSFER:' || payment.id::text,
        payment.amount,
        'JMD',
        now(),
        now() + interval '30 days',
        'active',
        'paid',
        coalesce(property_row.is_featured, false)
      );

      UPDATE public.properties
      SET is_featured = true,
          updated_at = now()
      WHERE id = property_row.id;

    WHEN 'agent_request_applications' THEN
      IF COALESCE(payment.source_id, '') = '' THEN
        RAISE EXCEPTION 'Agent application payment references are invalid';
      END IF;
      application_ids := string_to_array(payment.source_id, ',')::uuid[];
      IF cardinality(application_ids) < 1 THEN
        RAISE EXCEPTION 'Agent application payment references are invalid';
      END IF;

      UPDATE public.agent_request_applications
      SET status = 'approved',
          reviewed_at = now(),
          reviewed_by = p_reviewed_by
      WHERE id = ANY(application_ids)
        AND status = 'pending';
      GET DIAGNOSTICS affected_count = ROW_COUNT;
      IF affected_count <> cardinality(application_ids) THEN
        RAISE EXCEPTION 'One or more agent applications are no longer pending';
      END IF;

    ELSE
      RAISE EXCEPTION 'Unsupported bank transfer payment type: %', payment.source_type;
  END CASE;

  UPDATE public.bank_transfer_payments
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = p_reviewed_by::text
  WHERE id = payment.id
    AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.approve_bank_transfer_payment(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_bank_transfer_payment(uuid, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
