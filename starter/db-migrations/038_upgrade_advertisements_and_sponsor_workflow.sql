-- Upgrade advertisements schema and automate sponsor workflow metadata

ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advertiser_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.advertisements
  ALTER COLUMN created_by_clerk_id SET NOT NULL;

ALTER TABLE public.advertisements
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN is_featured SET DEFAULT false,
  ALTER COLUMN impressions SET DEFAULT 0,
  ALTER COLUMN clicks SET DEFAULT 0,
  ALTER COLUMN display_order SET DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'advertisements_category_check'
      AND conrelid = 'public.advertisements'::regclass
  ) THEN
    ALTER TABLE public.advertisements
      ADD CONSTRAINT advertisements_category_check
      CHECK (
        category = ANY (
          ARRAY[
            'home_inspection'::text,
            'legal'::text,
            'architect'::text,
            'mortgage'::text,
            'insurance'::text,
            'valuation'::text,
            'contractor'::text,
            'other'::text
          ]
        )
      );
  END IF;
END $$;

ALTER TABLE public.sponsor_submissions
  ADD COLUMN IF NOT EXISTS created_by_clerk_id TEXT,
  ADD COLUMN IF NOT EXISTS plan_id TEXT,
  ADD COLUMN IF NOT EXISTS plan_name TEXT,
  ADD COLUMN IF NOT EXISTS amount INTEGER,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ads_active ON public.advertisements USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_ads_category ON public.advertisements USING btree (category);
CREATE INDEX IF NOT EXISTS idx_ads_order ON public.advertisements USING btree (display_order);
CREATE INDEX IF NOT EXISTS idx_advertisements_active ON public.advertisements USING btree (is_active) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_advertisements_featured ON public.advertisements USING btree (is_featured) WHERE (is_featured = true);
CREATE INDEX IF NOT EXISTS idx_advertisements_created_at ON public.advertisements USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_advertisements_impressions ON public.advertisements USING btree (impressions DESC);
CREATE INDEX IF NOT EXISTS idx_advertisements_clicks ON public.advertisements USING btree (clicks DESC);
CREATE INDEX IF NOT EXISTS idx_advertisements_advertiser_id ON public.advertisements USING btree (advertiser_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_advertisements_company_email_normalized
ON public.advertisements USING btree (
  lower(TRIM(both FROM company_name)),
  lower(TRIM(both FROM email))
);

CREATE INDEX IF NOT EXISTS idx_sponsor_submissions_clerk_id
ON public.sponsor_submissions USING btree (created_by_clerk_id);

CREATE INDEX IF NOT EXISTS idx_sponsor_submissions_status_submitted
ON public.sponsor_submissions USING btree (status, submitted_at DESC);

CREATE OR REPLACE FUNCTION public.update_ads_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ads_updated_at ON public.advertisements;
CREATE TRIGGER ads_updated_at
BEFORE UPDATE ON public.advertisements
FOR EACH ROW
EXECUTE FUNCTION public.update_ads_updated_at();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_advertisements_updated_at ON public.advertisements;
CREATE TRIGGER update_advertisements_updated_at
BEFORE UPDATE ON public.advertisements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-disable ads that have passed their expiry timestamp
CREATE OR REPLACE FUNCTION public.refresh_expired_advertisements()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public.advertisements
  SET is_active = false,
      updated_at = NOW()
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at <= NOW();

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_sponsor_verified_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    NEW.verified_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sponsor_submissions_set_verified_at ON public.sponsor_submissions;
CREATE TRIGGER sponsor_submissions_set_verified_at
BEFORE UPDATE ON public.sponsor_submissions
FOR EACH ROW
EXECUTE FUNCTION public.set_sponsor_verified_at();
