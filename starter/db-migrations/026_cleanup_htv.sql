-- Clean up any existing HTV orders table and policies, then recreate
-- Run this if you get conflicts from previous migration attempts

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Allow public inserts on htv_orders" ON public.htv_orders;
DROP POLICY IF EXISTS "Allow public reads on htv_orders" ON public.htv_orders;
DROP POLICY IF EXISTS "Allow admin reads" ON public.htv_orders;
DROP POLICY IF EXISTS "Allow admin updates" ON public.htv_orders;
DROP POLICY IF EXISTS "Allow admin deletes" ON public.htv_orders;

-- Drop the table if it exists
DROP TABLE IF EXISTS public.htv_orders CASCADE;

-- Drop storage policies
DROP POLICY IF EXISTS "Allow public uploads to htv-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from htv-logos" ON storage.objects;

-- Now run the main migration (026_create_htv_orders.sql)
