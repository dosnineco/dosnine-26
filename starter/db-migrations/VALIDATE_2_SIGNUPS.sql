-- VALIDATION QUERY: Run this in Supabase SQL Editor to verify your 2 signups
-- This confirms the exact table schema and data

-- Query 1: Check table exists and structure
SELECT 
  table_schema,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'course_preorders') as column_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'course_preorders';

-- Expected: Should return 1 row with column_count = 9

-- Query 2: Show all columns
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'course_preorders'
ORDER BY ordinal_position;

-- Expected columns:
-- 1. id (uuid)
-- 2. name (text)
-- 3. email (text)
-- 4. phone (text, nullable)
-- 5. price_choice (text, nullable)
-- 6. buy_now (boolean)
-- 7. discounted_amount (integer)
-- 8. created_at (timestamp with time zone)
-- 9. payment_confirmed (boolean) -- Added by migration 023

-- Query 3: Count total signups
SELECT COUNT(*) as total_signups 
FROM public.course_preorders;

-- Expected: 2

-- Query 4: Fetch the 2 signups with specific columns
SELECT 
  id,
  name,
  email,
  phone,
  price_choice,
  buy_now,
  discounted_amount,
  payment_confirmed,
  created_at,
  -- Calculate days since signup
  EXTRACT(EPOCH FROM (NOW() - created_at))/86400 as days_ago
FROM public.course_preorders
ORDER BY created_at DESC;

-- Expected: 2 rows with all signup details

-- Query 5: Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'course_preorders';

-- Expected: rls_enabled = true

-- Query 6: View RLS policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'course_preorders';

-- Expected: At least 2-3 policies (INSERT, SELECT, UPDATE)

-- Query 7: Check indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'course_preorders';

-- Expected: 
-- - course_preorders_pkey (primary key on id)
-- - course_preorders_email_idx (btree on email)
-- - idx_course_preorders_payment_confirmed
-- - idx_course_preorders_created_at

-- Query 8: Get summary statistics
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN payment_confirmed = true THEN 1 END) as paid,
  COUNT(CASE WHEN payment_confirmed = false THEN 1 END) as unpaid,
  SUM(CASE WHEN payment_confirmed = true THEN discounted_amount ELSE 0 END) as revenue_paid,
  SUM(CASE WHEN payment_confirmed = false THEN discounted_amount ELSE 0 END) as revenue_potential,
  SUM(discounted_amount) as revenue_total
FROM public.course_preorders;

-- This will show you the exact stats for your dashboard

-- ✅ If all queries run successfully, your table is properly configured!
-- ✅ If Query 3 shows 2, your signups are definitely in the database
-- ❌ If Query 4 returns 0 rows but Query 3 shows 2, RLS is blocking access
