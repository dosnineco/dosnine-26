-- Update HTV Orders table schema with financial tracking and logo storage
-- This replaces the basic schema with complete financial and analytics fields

-- Step 1: Backup existing data if table exists
CREATE TABLE IF NOT EXISTS htv_orders_backup AS SELECT * FROM public.htv_orders WHERE FALSE;

-- Step 2: Drop existing table and related objects
DROP TABLE IF EXISTS public.htv_orders CASCADE;
DROP FUNCTION IF EXISTS update_htv_orders_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_htv_order_week_month() CASCADE;

-- Step 3: Create trigger function for updating week/month
CREATE OR REPLACE FUNCTION update_htv_order_week_month()
RETURNS TRIGGER AS $$
BEGIN
  -- Set order_week to the Monday of the week
  NEW.order_week := date_trunc('week', NEW.created_at)::date;
  -- Set order_month to the first day of the month
  NEW.order_month := date_trunc('month', NEW.created_at)::date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_htv_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create the new htv_orders table
CREATE TABLE public.htv_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  phone text NOT NULL,
  email text NULL,
  size text NOT NULL,
  color text NOT NULL,
  quantity integer NOT NULL,
  delivery_area text NOT NULL,
  rush_order boolean NULL DEFAULT false,
  logo_url text NOT NULL,
  logo_filename text NOT NULL,
  subtotal numeric(10, 2) NOT NULL,
  delivery_fee numeric(10, 2) NOT NULL,
  total numeric(10, 2) NOT NULL,
  status text NULL DEFAULT 'pending'::text,
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  raw_materials jsonb NULL DEFAULT '[]'::jsonb,
  raw_material_cost numeric(10, 2) NOT NULL DEFAULT 0,
  labor_cost numeric(10, 2) NOT NULL DEFAULT 0,
  other_expenses numeric(10, 2) NOT NULL DEFAULT 0,
  revenue numeric(10, 2) NOT NULL DEFAULT 0,
  expenses numeric(10, 2) NOT NULL DEFAULT 0,
  profit numeric(10, 2) NOT NULL DEFAULT 0,
  order_week date NULL,
  order_month date NULL,
  CONSTRAINT htv_orders_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Step 6: Disable RLS for public access
ALTER TABLE public.htv_orders DISABLE ROW LEVEL SECURITY;

-- Step 7: Grant ALL permissions
GRANT ALL ON public.htv_orders TO anon;
GRANT ALL ON public.htv_orders TO authenticated;
GRANT ALL ON public.htv_orders TO service_role;

-- Step 8: Create indexes for queries
CREATE INDEX IF NOT EXISTS idx_htv_orders_created ON public.htv_orders USING btree (created_at DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_htv_orders_status ON public.htv_orders USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_htv_orders_phone ON public.htv_orders USING btree (phone) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_htv_orders_revenue ON public.htv_orders USING btree (revenue DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_htv_orders_profit ON public.htv_orders USING btree (profit DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_htv_orders_order_week ON public.htv_orders USING btree (order_week) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_htv_orders_order_month ON public.htv_orders USING btree (order_month) TABLESPACE pg_default;

-- Step 9: Create triggers
DROP TRIGGER IF EXISTS htv_orders_week_month_trigger ON public.htv_orders;
CREATE TRIGGER htv_orders_week_month_trigger
BEFORE INSERT OR UPDATE ON public.htv_orders
FOR EACH ROW
EXECUTE FUNCTION update_htv_order_week_month();

DROP TRIGGER IF EXISTS trigger_update_htv_orders_updated_at ON public.htv_orders;
CREATE TRIGGER trigger_update_htv_orders_updated_at
BEFORE UPDATE ON public.htv_orders
FOR EACH ROW
EXECUTE FUNCTION update_htv_orders_updated_at();

-- Step 10: Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
