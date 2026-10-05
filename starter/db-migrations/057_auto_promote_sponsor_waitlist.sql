ALTER TABLE public.sponsor_submissions
  ADD COLUMN IF NOT EXISTS capacity_released_at TIMESTAMPTZ;

ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS sponsor_submission_id UUID
  REFERENCES public.sponsor_submissions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_advertisements_sponsor_submission_id
  ON public.advertisements (sponsor_submission_id);

UPDATE public.advertisements AS ad
SET sponsor_submission_id = (
  SELECT submission.id
  FROM public.sponsor_submissions AS submission
  WHERE submission.payment_status = 'paid'
    AND submission.status = 'approved'
    AND lower(trim(submission.company_name)) = lower(trim(ad.company_name))
    AND lower(trim(submission.email)) = lower(trim(ad.email))
  ORDER BY submission.verified_at DESC NULLS LAST, submission.submitted_at DESC
  LIMIT 1
)
WHERE ad.sponsor_submission_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.sponsor_submissions AS submission
    WHERE submission.payment_status = 'paid'
      AND submission.status = 'approved'
      AND lower(trim(submission.company_name)) = lower(trim(ad.company_name))
      AND lower(trim(submission.email)) = lower(trim(ad.email))
  );

CREATE OR REPLACE FUNCTION public.link_approved_sponsor_ad()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.advertisements AS ad
    SET sponsor_submission_id = NEW.id
    WHERE lower(trim(ad.company_name)) = lower(trim(NEW.company_name))
      AND lower(trim(ad.email)) = lower(trim(NEW.email));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_approved_sponsor_ad ON public.sponsor_submissions;
CREATE TRIGGER link_approved_sponsor_ad
AFTER INSERT OR UPDATE OF status ON public.sponsor_submissions
FOR EACH ROW
EXECUTE FUNCTION public.link_approved_sponsor_ad();

CREATE OR REPLACE FUNCTION public.release_capacity_for_inactive_sponsor_ad()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month DATE := date_trunc(
    'month',
    NOW() AT TIME ZONE 'America/Jamaica'
  )::DATE;
  reserved_slots INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.sponsor_submission_id IS NOT NULL THEN
      UPDATE public.sponsor_submissions
      SET capacity_released_at = COALESCE(capacity_released_at, NOW())
      WHERE id = OLD.sponsor_submission_id
        AND payment_status = 'paid';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.is_active IS TRUE AND NEW.is_active IS FALSE THEN
    IF NEW.sponsor_submission_id IS NOT NULL THEN
      UPDATE public.sponsor_submissions
      SET capacity_released_at = COALESCE(capacity_released_at, NOW())
      WHERE id = NEW.sponsor_submission_id
        AND payment_status = 'paid';
    END IF;
  ELSIF OLD.is_active IS FALSE
        AND NEW.is_active IS TRUE
        AND NEW.sponsor_submission_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('dosnine-sponsor-monthly-capacity'));

    SELECT COUNT(*)::INTEGER
    INTO reserved_slots
    FROM public.sponsor_submissions AS submission
    WHERE submission.scheduled_month = current_month
      AND submission.payment_status = 'paid'
      AND submission.capacity_released_at IS NULL
      AND submission.status <> 'rejected'
      AND submission.id <> NEW.sponsor_submission_id;

    IF reserved_slots >= 40 THEN
      RAISE EXCEPTION 'The current month is full; this ad cannot be reactivated';
    END IF;

    UPDATE public.sponsor_submissions
    SET capacity_released_at = NULL,
        scheduled_month = current_month
    WHERE id = NEW.sponsor_submission_id
      AND payment_status = 'paid'
      AND capacity_released_at IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS release_capacity_for_inactive_sponsor_ad ON public.advertisements;
CREATE TRIGGER release_capacity_for_inactive_sponsor_ad
BEFORE UPDATE OF is_active OR DELETE ON public.advertisements
FOR EACH ROW
EXECUTE FUNCTION public.release_capacity_for_inactive_sponsor_ad();

CREATE OR REPLACE FUNCTION public.promote_available_waitlisted_sponsor_submissions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month DATE := date_trunc(
    'month',
    NOW() AT TIME ZONE 'America/Jamaica'
  )::DATE;
  reserved_slots INTEGER;
  slots_to_fill INTEGER;
  promoted_count INTEGER := 0;
  queued_submission RECORD;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('dosnine-sponsor-monthly-capacity'));

  SELECT COUNT(*)::INTEGER
  INTO reserved_slots
  FROM public.sponsor_submissions AS submission
  WHERE submission.scheduled_month = current_month
    AND submission.payment_status = 'paid'
    AND submission.capacity_released_at IS NULL
    AND submission.status <> 'rejected';

  slots_to_fill := GREATEST(40 - reserved_slots, 0);
  IF slots_to_fill = 0 THEN
    RETURN 0;
  END IF;

  FOR queued_submission IN
    SELECT submission.id
    FROM public.sponsor_submissions AS submission
    WHERE submission.payment_status = 'paid'
      AND submission.status = 'waitlisted'
      AND submission.capacity_released_at IS NULL
    ORDER BY
      submission.scheduled_month ASC NULLS LAST,
      submission.paid_at ASC NULLS LAST,
      submission.submitted_at ASC,
      submission.id ASC
    LIMIT slots_to_fill
    FOR UPDATE OF submission SKIP LOCKED
  LOOP
    UPDATE public.sponsor_submissions AS submission
    SET status = 'pending_review',
        scheduled_month = current_month
    WHERE submission.id = queued_submission.id;
    promoted_count := promoted_count + 1;
  END LOOP;

  RETURN promoted_count;
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
  PERFORM public.promote_available_waitlisted_sponsor_submissions();

  SELECT *
  INTO queued_submission
  FROM public.sponsor_submissions
  WHERE id = p_submission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sponsor submission not found';
  END IF;

  IF queued_submission.payment_status = 'paid'
     AND queued_submission.status = 'pending_review'
     AND queued_submission.scheduled_month = current_month THEN
    RETURN;
  END IF;

  IF queued_submission.payment_status <> 'paid'
     OR queued_submission.status <> 'waitlisted' THEN
    RAISE EXCEPTION 'Only paid waitlisted submissions can be promoted';
  END IF;

  RAISE EXCEPTION 'No available monthly slot for this submission yet; it remains waitlisted in queue order';
END;
$$;

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
    PERFORM public.promote_available_waitlisted_sponsor_submissions();
    RETURN QUERY
    SELECT submission.status, submission.scheduled_month
    FROM public.sponsor_submissions AS submission
    WHERE submission.id = p_submission_id;
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
    FROM public.sponsor_submissions AS submission
    WHERE submission.scheduled_month = assigned_month
      AND submission.payment_status = 'paid'
      AND submission.capacity_released_at IS NULL
      AND submission.status <> 'rejected';

    EXIT WHEN reserved_slots < 40;
    assigned_month := (assigned_month + INTERVAL '1 month')::DATE;
  END LOOP;

  UPDATE public.sponsor_submissions AS submission
  SET payment_status = 'paid',
      paid_at = NOW(),
      scheduled_month = assigned_month,
      capacity_released_at = NULL,
      status = CASE
        WHEN assigned_month = payment_month THEN 'pending_review'
        ELSE 'waitlisted'
      END
  WHERE submission.id = p_submission_id;

  PERFORM public.promote_available_waitlisted_sponsor_submissions();

  RETURN QUERY
  SELECT submission.status, submission.scheduled_month
  FROM public.sponsor_submissions AS submission
  WHERE submission.id = p_submission_id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_available_waitlisted_sponsor_submissions()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.promote_waitlisted_sponsor_submission(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_bank_transfer_sponsor_payment(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_approved_sponsor_ad()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_capacity_for_inactive_sponsor_ad()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.promote_available_waitlisted_sponsor_submissions()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_waitlisted_sponsor_submission(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_bank_transfer_sponsor_payment(UUID)
  TO service_role;

NOTIFY pgrst, 'reload schema';
