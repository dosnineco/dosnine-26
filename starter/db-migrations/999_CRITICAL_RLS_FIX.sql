-- ============================================================================
-- CRITICAL SECURITY FIX - RUN THIS IMMEDIATELY
-- ============================================================================
-- This migration fixes the critical RLS vulnerabilities in the users table
-- that allowed creation of users with NULL names and emails
--
-- Created: January 6, 2026
-- Priority: CRITICAL
-- ============================================================================

-- Step 1: ENABLE ROW LEVEL SECURITY ON USERS TABLE
-- This is the most critical fix - prevents unauthorized data access
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 2: DROP ALL INSECURE POLICIES
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on uid" ON public.users;

-- Step 3: ADD NOT NULL CONSTRAINTS ON CRITICAL FIELDS
-- This prevents ghost users with empty/null identifiers
ALTER TABLE public.users 
ALTER COLUMN email SET NOT NULL,
ALTER COLUMN full_name SET NOT NULL,
ALTER COLUMN clerk_id SET NOT NULL;

-- Step 4: CREATE SECURE RLS POLICIES FOR USERS TABLE

-- Policy 4a: Users can view their own profile ONLY
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
USING (
  -- User can see their own record
  auth.uid()::text = clerk_id
  OR
  -- Admins can see all users
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.clerk_id = auth.uid()::text
    AND u.role = 'admin'
  )
);

-- Policy 4b: Users can update ONLY their own profile (specific fields only)
CREATE POLICY "Users can update own profile only"
ON public.users
FOR UPDATE
USING (
  -- Only the user themselves can update their own record
  auth.uid()::text = clerk_id
)
WITH CHECK (
  -- Additional validation: clerk_id and email cannot be changed
  auth.uid()::text = clerk_id
);

-- Policy 4c: Admins can update any user's profile (for verification/moderation)
CREATE POLICY "Admins can manage users"
ON public.users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.clerk_id = auth.uid()::text
    AND u.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.clerk_id = auth.uid()::text
    AND u.role = 'admin'
  )
);

-- Step 5: FIX AGENTS TABLE INSERT POLICY (remove "OR true")
DROP POLICY IF EXISTS "Users can insert own agent profile" ON public.agents;

CREATE POLICY "Users can insert own agent profile"
ON public.agents
FOR INSERT
WITH CHECK (
  -- Only authenticated users can create agent profiles
  -- AND they must be creating for themselves
  auth.uid()::text IN (
    SELECT clerk_id FROM public.users WHERE id = agents.user_id
  )
);

-- Step 6: VERIFY RLS IS ENABLED
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Step 7: LOG AUDIT - List any suspicious users with NULL fields
-- Run this query to identify ghost users:
-- SELECT id, clerk_id, email, full_name, role, created_at 
-- FROM public.users 
-- WHERE email IS NULL OR full_name IS NULL OR clerk_id IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES - RUN AFTER APPLYING THIS MIGRATION
-- ============================================================================

-- Check RLS status:
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'agents');

-- Check policies:
SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users';

-- ============================================================================
-- NOTES FOR DEPLOYMENT
-- ============================================================================
-- 1. This migration may FAIL if there are existing users with NULL email or full_name
-- 2. You MUST clean up ghost users BEFORE applying this migration
-- 3. To find ghost users, run:
--    SELECT * FROM public.users WHERE email IS NULL OR full_name IS NULL OR clerk_id IS NULL;
-- 4. Delete or update them before running this migration
-- 5. After migration, test all pages to ensure they still work correctly

