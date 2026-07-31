-- 043_add_investment_amount_to_hill_lot_pre_registrations.sql
-- Store the selected investment amount as a numeric value for admin reporting

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
  investment_amount numeric(12,2) NULL,
  CONSTRAINT hill_lot_pre_registrations_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

ALTER TABLE public.hill_lot_pre_registrations
  ADD COLUMN IF NOT EXISTS investment_amount numeric(12,2) NULL;

CREATE INDEX IF NOT EXISTS idx_hill_lot_pre_registrations_investment_amount
  ON public.hill_lot_pre_registrations USING btree (investment_amount) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_hill_lot_pre_registrations_email
  ON public.hill_lot_pre_registrations USING btree (email) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_hill_lot_pre_registrations_stay_type
  ON public.hill_lot_pre_registrations USING btree (stay_type) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_hill_lot_pre_registrations_created_at
  ON public.hill_lot_pre_registrations USING btree (created_at DESC) TABLESPACE pg_default;
