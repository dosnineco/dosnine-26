CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  preview_text text NOT NULL DEFAULT '',
  html_content text NOT NULL,
  target text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'completed')),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.newsletter_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  email text NOT NULL,
  recipient_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE (campaign_id, email)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_campaign_recipients_pending
  ON public.newsletter_campaign_recipients (created_at, id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_newsletter_campaign_recipients_campaign
  ON public.newsletter_campaign_recipients (campaign_id, status);

CREATE TABLE IF NOT EXISTS public.newsletter_daily_send_quota (
  quota_date date PRIMARY KEY,
  reserved_count integer NOT NULL DEFAULT 0
    CHECK (reserved_count >= 0 AND reserved_count <= 300)
);

ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_daily_send_quota ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.newsletter_campaigns FROM anon, authenticated;
REVOKE ALL ON public.newsletter_campaign_recipients FROM anon, authenticated;
REVOKE ALL ON public.newsletter_daily_send_quota FROM anon, authenticated;
GRANT ALL ON public.newsletter_campaigns TO service_role;
GRANT ALL ON public.newsletter_campaign_recipients TO service_role;
GRANT ALL ON public.newsletter_daily_send_quota TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_newsletter_daily_send_slots(requested_slots integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_count integer;
  granted_count integer;
  utc_date date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  INSERT INTO public.newsletter_daily_send_quota (quota_date, reserved_count)
  VALUES (utc_date, 0)
  ON CONFLICT (quota_date) DO NOTHING;

  SELECT reserved_count
  INTO current_count
  FROM public.newsletter_daily_send_quota
  WHERE quota_date = utc_date
  FOR UPDATE;

  granted_count := LEAST(
    GREATEST(COALESCE(requested_slots, 0), 0),
    GREATEST(300 - current_count, 0)
  );

  UPDATE public.newsletter_daily_send_quota
  SET reserved_count = current_count + granted_count
  WHERE quota_date = utc_date;

  RETURN granted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_newsletter_daily_send_slots(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_newsletter_daily_send_slots(integer) TO service_role;
