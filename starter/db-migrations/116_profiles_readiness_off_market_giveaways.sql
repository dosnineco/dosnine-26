ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz,
  ADD COLUMN IF NOT EXISTS premium_service_request_payment_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_unique_premium_payment
  ON public.users (premium_service_request_payment_id)
  WHERE premium_service_request_payment_id IS NOT NULL;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_off_market boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Public can view visible properties" ON public.properties;
DROP POLICY IF EXISTS "Public cannot view off-market properties" ON public.properties;
CREATE POLICY "Public can view visible properties"
ON public.properties
FOR SELECT
TO anon, authenticated
USING (
  COALESCE(status, '') IN ('', 'available', 'active', 'coming_soon')
  AND is_off_market = false
);
CREATE POLICY "Public cannot view off-market properties"
ON public.properties
AS RESTRICTIVE
FOR SELECT
TO anon, authenticated
USING (is_off_market = false);

CREATE INDEX IF NOT EXISTS idx_properties_off_market_status
  ON public.properties (is_off_market, status)
  WHERE is_off_market = true;

CREATE TABLE IF NOT EXISTS public.renter_readiness_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  monthly_rent_budget numeric(12, 2),
  monthly_income numeric(12, 2),
  employment_status text,
  move_in_date date,
  occupants integer,
  has_rental_references boolean NOT NULL DEFAULT false,
  qualification_level integer NOT NULL DEFAULT 1
    CHECK (qualification_level BETWEEN 1 AND 4),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (monthly_rent_budget IS NULL OR monthly_rent_budget >= 0),
  CHECK (monthly_income IS NULL OR monthly_income >= 0),
  CHECK (occupants IS NULL OR occupants BETWEEN 1 AND 30)
);

ALTER TABLE public.renter_readiness_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.renter_readiness_profiles FROM anon, authenticated;
GRANT ALL ON public.renter_readiness_profiles TO service_role;

CREATE TABLE IF NOT EXISTS public.giveaway_campaigns (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title text NOT NULL DEFAULT 'Win a 3-night Airbnb stay',
  prize_description text NOT NULL DEFAULT 'A 3-night Airbnb stay',
  opens_at timestamptz,
  draw_at timestamptz,
  is_open boolean NOT NULL DEFAULT false,
  winner_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  winner_request_id uuid REFERENCES public.service_requests(id) ON DELETE SET NULL,
  winner_selected_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (draw_at IS NULL OR opens_at IS NULL OR draw_at > opens_at)
);

ALTER TABLE public.giveaway_campaigns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.giveaway_campaigns FROM anon, authenticated;
GRANT ALL ON public.giveaway_campaigns TO service_role;
