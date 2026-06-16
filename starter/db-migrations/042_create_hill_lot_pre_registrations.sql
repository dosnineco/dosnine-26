-- 042_create_hill_lot_pre_registrations.sql
-- Create a dedicated table for The Hill Lot Airbnb pre-registration requests

CREATE TABLE IF NOT EXISTS public.hill_lot_pre_registrations (
  id bigserial NOT NULL,
  full_name text NOT NULL,
  email character varying(255) NOT NULL,
  phone character varying(20) NULL,
  stay_type character varying(50) NULL,
  message text NULL,
  page text NULL,
  source character varying(50) NULL,
  ip_address character varying(45) NULL,
  referrer text NULL,
  user_agent text NULL,
  created_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT hill_lot_pre_registrations_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_hill_lot_pre_registrations_email ON public.hill_lot_pre_registrations USING btree (email) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_hill_lot_pre_registrations_stay_type ON public.hill_lot_pre_registrations USING btree (stay_type) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_hill_lot_pre_registrations_created_at ON public.hill_lot_pre_registrations USING btree (created_at DESC) TABLESPACE pg_default;

ALTER TABLE public.hill_lot_pre_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hill_lot_pre_registrations_insert_policy" ON public.hill_lot_pre_registrations;
DROP POLICY IF EXISTS "hill_lot_pre_registrations_select_admin" ON public.hill_lot_pre_registrations;

CREATE POLICY "hill_lot_pre_registrations_insert_policy"
  ON public.hill_lot_pre_registrations
  FOR INSERT TO public, anon, authenticated
  WITH CHECK (
    full_name IS NOT NULL AND
    full_name != '' AND
    email IS NOT NULL AND
    email != ''
  );

CREATE POLICY "hill_lot_pre_registrations_select_admin"
  ON public.hill_lot_pre_registrations
  FOR SELECT TO authenticated
  USING (is_admin());

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON public.hill_lot_pre_registrations TO anon, authenticated;
GRANT SELECT ON public.hill_lot_pre_registrations TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.hill_lot_pre_registrations_id_seq TO anon, authenticated;
