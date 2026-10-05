ALTER TABLE public.sponsor_submissions
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_month DATE;

ALTER TABLE public.sponsor_submissions
  DROP CONSTRAINT IF EXISTS sponsor_submissions_status_check;

ALTER TABLE public.sponsor_submissions
  ADD CONSTRAINT sponsor_submissions_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'pending_payment'::TEXT,
        'pending_review'::TEXT,
        'waitlisted'::TEXT,
        'approved'::TEXT,
        'rejected'::TEXT
      ]
    )
  );

ALTER TABLE public.sponsor_submissions
  DROP CONSTRAINT IF EXISTS sponsor_submissions_payment_status_check;

ALTER TABLE public.sponsor_submissions
  ADD CONSTRAINT sponsor_submissions_payment_status_check
  CHECK (payment_status = ANY (ARRAY['unpaid'::TEXT, 'paid'::TEXT]));

CREATE INDEX IF NOT EXISTS idx_sponsor_submissions_scheduled_month
  ON public.sponsor_submissions (scheduled_month, status)
  WHERE payment_status = 'paid';

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

CREATE OR REPLACE FUNCTION public.promote_waitlisted_sponsor_submission(
  p_submission_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month DATE := date_trunc(
    'month',
    NOW() AT TIME ZONE 'America/Jamaica'
  )::DATE;
  queued_submission public.sponsor_submissions%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('dosnine-sponsor-monthly-capacity'));

  SELECT *
  INTO queued_submission
  FROM public.sponsor_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sponsor submission not found';
  END IF;

  IF queued_submission.payment_status = 'paid'
     AND queued_submission.status = 'pending_review' THEN
    RETURN;
  END IF;

  IF queued_submission.payment_status <> 'paid'
     OR queued_submission.status <> 'waitlisted' THEN
    RAISE EXCEPTION 'Only paid waitlisted submissions can be promoted';
  END IF;

  IF queued_submission.scheduled_month > current_month THEN
    RAISE EXCEPTION 'This submission is scheduled for a future month';
  END IF;

  UPDATE public.sponsor_submissions
  SET status = 'pending_review',
      scheduled_month = current_month
  WHERE id = p_submission_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_paid_sponsor_submission(
  p_submission_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  approved_submission public.sponsor_submissions%ROWTYPE;
  current_month DATE := date_trunc(
    'month',
    NOW() AT TIME ZONE 'America/Jamaica'
  )::DATE;
  advertiser_uuid UUID;
  ad_uuid UUID;
  ad_expiry TIMESTAMPTZ;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('dosnine-sponsor-monthly-capacity'));

  SELECT *
  INTO approved_submission
  FROM public.sponsor_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sponsor submission not found';
  END IF;

  IF approved_submission.payment_status = 'paid'
     AND approved_submission.status = 'approved' THEN
    RETURN;
  END IF;

  IF approved_submission.payment_status <> 'paid'
     OR approved_submission.status <> 'pending_review'
     OR approved_submission.scheduled_month > current_month THEN
    RAISE EXCEPTION 'Only paid submissions scheduled for this month can be approved';
  END IF;

  ad_expiry := NOW() + make_interval(days => GREATEST(COALESCE(approved_submission.duration_days, 14), 1));

  SELECT id
  INTO advertiser_uuid
  FROM public.users
  WHERE clerk_id = approved_submission.created_by_clerk_id
  LIMIT 1;

  SELECT id
  INTO ad_uuid
  FROM public.advertisements
  WHERE lower(trim(company_name)) = lower(trim(approved_submission.company_name))
    AND lower(trim(email)) = lower(trim(approved_submission.email))
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF ad_uuid IS NULL THEN
    INSERT INTO public.advertisements (
      title,
      company_name,
      category,
      description,
      contact_name,
      email,
      phone,
      website,
      image_url,
      image_urls,
      is_featured,
      is_active,
      expires_at,
      created_by_clerk_id,
      advertiser_id,
      display_order
    )
    VALUES (
      approved_submission.company_name,
      approved_submission.company_name,
      approved_submission.category,
      approved_submission.description,
      NULL,
      approved_submission.email,
      approved_submission.phone,
      approved_submission.website,
      approved_submission.image_url,
      approved_submission.image_urls,
      COALESCE(approved_submission.is_featured, FALSE),
      TRUE,
      ad_expiry,
      approved_submission.created_by_clerk_id,
      advertiser_uuid,
      0
    );
  ELSE
    UPDATE public.advertisements
    SET is_active = TRUE,
        is_featured = COALESCE(approved_submission.is_featured, FALSE),
        expires_at = ad_expiry,
        image_url = COALESCE(approved_submission.image_url, image_url),
        image_urls = COALESCE(approved_submission.image_urls, image_urls),
        advertiser_id = COALESCE(advertiser_uuid, advertiser_id)
    WHERE id = ad_uuid;
  END IF;

  UPDATE public.sponsor_submissions
  SET status = 'approved',
      verified_at = NOW()
  WHERE id = p_submission_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_bank_transfer_sponsor_payment(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.promote_waitlisted_sponsor_submission(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_paid_sponsor_submission(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_bank_transfer_sponsor_payment(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_waitlisted_sponsor_submission(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_paid_sponsor_submission(UUID) TO service_role;
