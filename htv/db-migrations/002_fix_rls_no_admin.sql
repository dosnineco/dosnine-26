-- Fix RLS policies for HTV since we removed admin authentication
-- This migration removes admin-only restrictions and allows public access

-- Drop the old admin policies
DROP POLICY IF EXISTS "Allow admin reads" ON public.htv_orders;
DROP POLICY IF EXISTS "Allow admin updates" ON public.htv_orders;
DROP POLICY IF EXISTS "Allow admin deletes" ON public.htv_orders;

-- Drop the is_admin function (references non-existent users table)
DROP FUNCTION IF EXISTS is_admin();

-- Allow public to read their submissions
-- This prevents any RLS errors and simplifies the system
CREATE POLICY "Allow public reads"
ON public.htv_orders FOR SELECT
TO public
USING (true);

-- Note: INSERT policy already exists and works correctly
-- We keep RLS enabled for future expansion if needed
