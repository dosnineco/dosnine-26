-- Business expense tracking for HTV (rent, utilities, supplies, etc.), independent of orders
CREATE TABLE IF NOT EXISTS public.htv_expenses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  description text NOT NULL,
  category text DEFAULT 'general',
  amount numeric(10,2) DEFAULT 0 NOT NULL,
  expense_date date DEFAULT CURRENT_DATE NOT NULL,
  expense_month date,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT htv_expenses_pkey PRIMARY KEY (id)
);

ALTER TABLE public.htv_expenses DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_htv_expenses_expense_month ON public.htv_expenses USING btree (expense_month DESC);
CREATE INDEX IF NOT EXISTS idx_htv_expenses_expense_date ON public.htv_expenses USING btree (expense_date DESC);

GRANT ALL ON public.htv_expenses TO authenticated;
GRANT ALL ON public.htv_expenses TO service_role;

-- Keep expense_month in sync with expense_date for month-based filtering/reporting
CREATE OR REPLACE FUNCTION set_htv_expense_month()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expense_month := date_trunc('month', NEW.expense_date)::date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS htv_expenses_month_trigger ON public.htv_expenses;
CREATE TRIGGER htv_expenses_month_trigger
BEFORE INSERT OR UPDATE ON public.htv_expenses
FOR EACH ROW
EXECUTE FUNCTION set_htv_expense_month();
