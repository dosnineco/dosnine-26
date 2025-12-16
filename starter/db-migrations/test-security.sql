-- Security Test Suite
-- Run these queries to verify admin security is working

-- TEST 1: Verify agents table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'agents'
) as agents_table_exists;
-- Expected: true

-- TEST 2: Verify RLS is enabled on agents table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'agents';
-- Expected: rowsecurity = true

-- TEST 3: Check RLS policies on agents table
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'agents'
ORDER BY policyname;
-- Expected: 5 policies (view own, insert own, update own, admin view all, admin update)

-- TEST 4: Verify storage policies for agent-documents bucket
SELECT 
  name as policy_name,
  definition
FROM storage.policies
WHERE bucket_id = 'agent-documents'
ORDER BY name;
-- Expected: 3 policies (upload, admin view, admin delete)

-- TEST 5: Check admin user exists
SELECT 
  COUNT(*) as admin_count,
  STRING_AGG(email, ', ') as admin_emails
FROM public.users
WHERE role = 'admin';
-- Expected: At least 1 admin with your email

-- TEST 6: Verify user_type column exists and has correct values
SELECT 
  user_type,
  COUNT(*) as count
FROM public.users
GROUP BY user_type;
-- Expected: Shows 'landlord', 'agent', or NULL

-- TEST 7: Check if any agents exist
SELECT 
  COUNT(*) as total_agents,
  SUM(CASE WHEN verification_status = 'pending' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN verification_status = 'approved' THEN 1 ELSE 0 END) as approved,
  SUM(CASE WHEN verification_status = 'rejected' THEN 1 ELSE 0 END) as rejected
FROM public.agents;
-- Expected: Shows agent counts by status

-- TEST 8: Verify agents_with_users view exists
SELECT COUNT(*) as view_exists
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name = 'agents_with_users';
-- Expected: 1

-- TEST 9: Check storage bucket exists
SELECT 
  id as bucket_id,
  name as bucket_name,
  public as is_public
FROM storage.buckets
WHERE id = 'agent-documents';
-- Expected: 1 row, is_public = false

-- TEST 10: Verify no duplicate policies (common error)
SELECT 
  policyname,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'agents'
GROUP BY policyname
HAVING COUNT(*) > 1;
-- Expected: No rows (no duplicates)

-- ==============================================
-- SECURITY VALIDATION SUMMARY
-- ==============================================
-- If all tests pass:
-- ✅ Agents table created
-- ✅ RLS enabled
-- ✅ Policies in place
-- ✅ Storage secured
-- ✅ Admin user set
-- ✅ Ready for production!
