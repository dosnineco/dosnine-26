-- QUICK FIX for Course Preorders Not Showing in Admin Dashboard
-- Run this in your Supabase SQL Editor

-- Step 1: Check if data exists
SELECT COUNT(*) as total_signups FROM course_preorders;
-- Expected: Should show 2

-- Step 2: Check current RLS status
SELECT 
  tablename, 
  rowsecurity AS "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'course_preorders';

-- Step 3: Check existing policies
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd AS command,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'course_preorders';

-- Step 4: Check if you are an admin
-- Replace 'your-clerk-user-id' with your actual Clerk ID (from Clerk dashboard)
SELECT clerk_id, email, full_name, role 
FROM users 
WHERE role = 'admin';
-- If your user doesn't appear, you need to set yourself as admin

-- Step 5: TEMPORARY FIX - Allow all authenticated users to read
-- This will let you see if RLS is the issue
-- ⚠️ Only for testing! Remove this policy after confirming the issue
DROP POLICY IF EXISTS "temp_allow_all_read" ON course_preorders;
CREATE POLICY "temp_allow_all_read" 
ON course_preorders 
FOR SELECT 
TO authenticated
USING (true);

-- Now go back to your admin dashboard and refresh
-- If you see the 2 signups, then RLS was the issue

-- Step 6: If it worked, now set yourself as admin
-- Replace 'your-clerk-user-id' with your Clerk ID
-- UPDATE users 
-- SET role = 'admin' 
-- WHERE clerk_id = 'your-clerk-user-id';

-- Step 7: After setting admin, apply proper policies
-- Run the full migration: 024_fix_course_preorders_rls.sql
