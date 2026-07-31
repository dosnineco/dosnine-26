-- 043_add_investment_amount_to_hill_lot_pre_registrations.sql
-- Store the selected investment amount as a numeric value for admin reporting

ALTER TABLE public.hill_lot_pre_registrations
  ADD COLUMN IF NOT EXISTS investment_amount numeric(12,2) NULL;

CREATE INDEX IF NOT EXISTS idx_hill_lot_pre_registrations_investment_amount
  ON public.hill_lot_pre_registrations (investment_amount);
