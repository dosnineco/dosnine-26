-- Create HTV Logo Orders table for starter project
-- Simple public access - no RLS restrictions

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.htv_orders CASCADE;

-- Create table to track HTV logo orders
CREATE TABLE public.htv_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  phone text NOT NULL,
  email text NULL,
  size text NOT NULL,
  color text NOT NULL,
  quantity integer NOT NULL DEFAULT 4,
  delivery_area text NOT NULL,
  rush_order boolean NULL DEFAULT false,
  logo_url text NULL,
  logo_filename text NULL,
  subtotal integer NOT NULL,
  delivery_fee integer NOT NULL,
  total integer NOT NULL,
  status text NULL DEFAULT 'pending'::text,
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT htv_orders_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Disable RLS for simple public access
ALTER TABLE public.htv_orders DISABLE ROW LEVEL SECURITY;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_htv_orders_created_at ON public.htv_orders USING btree (created_at DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_htv_orders_status ON public.htv_orders USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_htv_orders_phone ON public.htv_orders USING btree (phone) TABLESPACE pg_default;

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_htv_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_htv_orders_timestamp ON public.htv_orders;
CREATE TRIGGER update_htv_orders_timestamp
BEFORE UPDATE ON public.htv_orders
FOR EACH ROW
EXECUTE FUNCTION update_htv_orders_updated_at();
