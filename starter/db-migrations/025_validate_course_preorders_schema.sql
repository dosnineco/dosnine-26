-- Ensure course_preorders table exists with correct schema
-- Run this in Supabase SQL Editor to validate/create the table

-- Step 1: Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.course_preorders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NULL,
  price_choice text NULL,
  buy_now boolean NOT NULL DEFAULT false,
  discounted_amount integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT course_preorders_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Step 2: Add payment_confirmed column if it doesn't exist (from migration 023)
ALTER TABLE public.course_preorders 
ADD COLUMN IF NOT EXISTS payment_confirmed boolean NOT NULL DEFAULT false;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS course_preorders_email_idx 
ON public.course_preorders USING btree (email) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_course_preorders_payment_confirmed 
ON public.course_preorders (payment_confirmed);

CREATE INDEX IF NOT EXISTS idx_course_preorders_created_at 
ON public.course_preorders (created_at DESC);

-- Step 4: Enable Row Level Security
ALTER TABLE public.course_preorders ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if any
DROP POLICY IF EXISTS "Enable insert for all users" ON public.course_preorders;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.course_preorders;
DROP POLICY IF EXISTS "Enable read for admins" ON public.course_preorders;
DROP POLICY IF EXISTS "Enable update for admins" ON public.course_preorders;
DROP POLICY IF EXISTS "temp_allow_all_read" ON public.course_preorders;

-- Step 6: Create RLS policies

-- Policy 1: Allow anyone (anon and authenticated) to insert signups
CREATE POLICY "Enable insert for all users" 
ON public.course_preorders 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Policy 2: Allow all authenticated users to read (TEMPORARY - for testing)
-- This ensures the admin can see the signups
CREATE POLICY "Enable read for authenticated users" 
ON public.course_preorders 
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Allow authenticated users to update (for admin to mark as paid)
CREATE POLICY "Enable update for authenticated users" 
ON public.course_preorders 
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 7: Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'course_preorders'
ORDER BY ordinal_position;

-- Step 8: Check current row count
SELECT COUNT(*) as total_signups FROM public.course_preorders;

-- Step 9: View all signups
SELECT 
  id,
  name,
  email,
  phone,
  price_choice,
  buy_now,
  discounted_amount,
  payment_confirmed,
  created_at
FROM public.course_preorders
ORDER BY created_at DESC;

-- Step 10: Verify RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'course_preorders';

-- Expected results:
-- ✅ Table should exist with 9 columns (id, name, email, phone, price_choice, buy_now, discounted_amount, payment_confirmed, created_at)
-- ✅ Should show 2 signups
-- ✅ Should have 3 RLS policies (insert for all, select for authenticated, update for authenticated)
