ALTER TABLE public.sponsor_submissions
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS duration_months INTEGER,
  ADD COLUMN IF NOT EXISTS placement_types TEXT[] NOT NULL
    DEFAULT ARRAY['popup', 'display', 'infeed']::TEXT[];

ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS plan_id TEXT,
  ADD COLUMN IF NOT EXISTS plan_name TEXT,
  ADD COLUMN IF NOT EXISTS duration_months INTEGER,
  ADD COLUMN IF NOT EXISTS placement_types TEXT[] NOT NULL
    DEFAULT ARRAY['popup', 'display', 'infeed']::TEXT[];

INSERT INTO public.site_settings (key, value)
VALUES ('ad_plan_prices', '{"pro":90999}'::JSONB)
ON CONFLICT (key) DO UPDATE
SET value = CASE
  WHEN site_settings.value ? 'pro' THEN site_settings.value
  ELSE site_settings.value || EXCLUDED.value
END;

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

  IF COALESCE(approved_submission.duration_months, 0) > 0 THEN
    ad_expiry := NOW() + make_interval(months => approved_submission.duration_months);
  ELSE
    ad_expiry := NOW() + make_interval(days => GREATEST(COALESCE(approved_submission.duration_days, 14), 1));
  END IF;

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
      display_order,
      plan_id,
      plan_name,
      duration_months,
      placement_types
    )
    VALUES (
      COALESCE(approved_submission.title, approved_submission.company_name),
      approved_submission.company_name,
      approved_submission.category,
      approved_submission.description,
      approved_submission.contact_name,
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
      0,
      approved_submission.plan_id,
      approved_submission.plan_name,
      approved_submission.duration_months,
      COALESCE(approved_submission.placement_types, ARRAY['popup', 'display', 'infeed']::TEXT[])
    );
  ELSE
    UPDATE public.advertisements
    SET is_active = TRUE,
        is_featured = COALESCE(approved_submission.is_featured, FALSE),
        expires_at = ad_expiry,
        image_url = COALESCE(approved_submission.image_url, image_url),
        image_urls = COALESCE(approved_submission.image_urls, image_urls),
        advertiser_id = COALESCE(advertiser_uuid, advertiser_id),
        plan_id = approved_submission.plan_id,
        plan_name = approved_submission.plan_name,
        duration_months = approved_submission.duration_months,
        placement_types = COALESCE(approved_submission.placement_types, ARRAY['popup', 'display', 'infeed']::TEXT[])
    WHERE id = ad_uuid;
  END IF;

  UPDATE public.sponsor_submissions
  SET status = 'approved',
      verified_at = NOW()
  WHERE id = p_submission_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
