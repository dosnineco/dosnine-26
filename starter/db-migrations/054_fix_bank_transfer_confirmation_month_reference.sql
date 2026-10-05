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
    FROM public.sponsor_submissions AS ss
    WHERE ss.scheduled_month = assigned_month
      AND ss.payment_status = 'paid'
      AND ss.status <> 'rejected';

    EXIT WHEN reserved_slots < 40;
    assigned_month := (assigned_month + INTERVAL '1 month')::DATE;
  END LOOP;

  UPDATE public.sponsor_submissions AS ss
  SET payment_status = 'paid',
      paid_at = NOW(),
      scheduled_month = assigned_month,
      status = CASE
        WHEN assigned_month = payment_month THEN 'pending_review'
        ELSE 'waitlisted'
      END
  WHERE ss.id = p_submission_id;

  RETURN QUERY
  SELECT ss.status, ss.scheduled_month
  FROM public.sponsor_submissions AS ss
  WHERE ss.id = p_submission_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_bank_transfer_sponsor_payment(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_bank_transfer_sponsor_payment(UUID)
  TO service_role;
