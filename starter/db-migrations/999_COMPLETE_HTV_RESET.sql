-- COMPLETE RESET: Drop everything and recreate fresh
-- Run this ENTIRE script in Supabase SQL Editor

-- Step 1: Drop existing table and related objects
DROP TABLE IF EXISTS public.htv_orders CASCADE;
DROP FUNCTION IF EXISTS update_htv_orders_updated_at() CASCADE;

-- Step 2: Create the table
CREATE TABLE public.htv_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  phone text NOT NULL,
  email text,
  size text NOT NULL,
  color text NOT NULL,
  quantity integer NOT NULL DEFAULT 4,
  delivery_area text NOT NULL,
  rush_order boolean DEFAULT false,
  logo_url text,
  logo_filename text,
  subtotal integer NOT NULL,
  delivery_fee integer NOT NULL,
  total integer NOT NULL,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 3: Disable RLS completely
ALTER TABLE public.htv_orders DISABLE ROW LEVEL SECURITY;

-- Step 4: Grant ALL permissions to public roles
GRANT ALL ON public.htv_orders TO anon;
GRANT ALL ON public.htv_orders TO authenticated;
GRANT ALL ON public.htv_orders TO service_role;

-- Step 5: Grant schema access
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 6: Create indexes
CREATE INDEX idx_htv_orders_created_at ON public.htv_orders(created_at DESC);
CREATE INDEX idx_htv_orders_status ON public.htv_orders(status);
CREATE INDEX idx_htv_orders_phone ON public.htv_orders(phone);

-- Step 7: Create update trigger function
CREATE OR REPLACE FUNCTION update_htv_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger
CREATE TRIGGER update_htv_orders_timestamp
BEFORE UPDATE ON public.htv_orders
FOR EACH ROW
EXECUTE FUNCTION update_htv_orders_updated_at();

-- Step 9: Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Step 10: Test insert
INSERT INTO public.htv_orders (
  business_name,
  phone,
  size,
  color,
  quantity,
  delivery_area,
  subtotal,
  delivery_fee,
  total
) VALUES (
  'Test Order',
  '876-123-4567',
  'medium',
  'black',
  4,
  'halfWayTree',
  4800,
  0,
  4800
) RETURNING *;

-- Step 11: Verify the test worked
SELECT COUNT(*) as test_count FROM public.htv_orders WHERE business_name = 'Test Order';

-- Step 12: Clean up test
DELETE FROM public.htv_orders WHERE business_name = 'Test Order';

-- Step 13: Final verification
SELECT 
  'SUCCESS: Table created, permissions granted, and accessible!' as status,
  tablename,
  schemaname,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'htv_orders';
