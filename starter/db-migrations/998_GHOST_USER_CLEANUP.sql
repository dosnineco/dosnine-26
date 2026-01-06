-- ============================================================================
-- GHOST USER DETECTION AND CLEANUP SCRIPT
-- ============================================================================
-- This script helps identify and fix users with NULL email or full_name
-- Created: January 6, 2026
-- ============================================================================

-- STEP 1: IDENTIFY
-- ============================================================================
-- CLEANUP OPTIONS (Choose ONE approach below)
-- ============================================================================

-- OPTION A: DELETE ALL GHOST USERS (DESTRUCTIVE!)
-- ⚠️  This will delete the user and CASCADE to related records
-- Only use if ghost users have no important data
/*
DELETE FROM public.users
WHERE email IS NULL OR full_name IS NULL OR clerk_id IS NULL;

-- Verify deletion
SELECT COUNT(*) as remaining_ghost_users
FROM public.users
WHERE email IS NULL OR full_name IS NULL;
*/

-- OPTION B: FILL IN MISSING EMAIL AND NAME (RECOMMENDED)
-- This preserves ghost users but makes them valid
-- ✓ Safer approach that maintains data integrity
/*
UPDATE public.users
SET 
  email = COALESCE(
    email, 
    'user-' || LEFT(id::text, 8) || '@' || created_at::text
  ),
  full_name = COALESCE(
    full_name,
    'User ' || LEFT(id::text, 8)
  )
WHERE email IS NULL OR full_name IS NULL;

-- Verify updates
SELECT 
  id,
  email,
  full_name,
  role
FROM public.users
WHERE email LIKE 'user-%@%' OR full_name LIKE 'User %'
LIMIT 5;
*/

-- OPTION C: FIX FAKE CLERK_IDS
-- Some users may have been created with "manual_TIMESTAMP" clerk_ids
-- These need to be converted to real Clerk IDs if possible
/*
-- Find users with fake clerk_ids
SELECT 
  id,
  clerk_id,
  email,
  full_name
FROM public.users
WHERE clerk_id LIKE 'manual_%'
ORDER BY created_at DESC;

-- If you have their real Clerk IDs, update them:
-- UPDATE public.users
-- SET clerk_id = 'clerk_XXXXX'  -- Replace with real Clerk ID
-- WHERE id = '<user-id>';
*/

-- OPTION D: QUARANTINE GHOST USERS (For review)
-- Create a view of ghost users for manual review
CREATE OR REPLACE VIEW public.ghost_users_review AS
SELECT 
  id,
  clerk_id,
  email,
  full_name,
  phone,
  role,
  created_at,
  CASE 
    WHEN email IS NULL THEN '🔴 NO EMAIL'
    WHEN full_name IS NULL THEN '🔴 NO NAME'
    ELSE '⚠️ INCOMPLETE'
  END as status
FROM public.users
WHERE email IS NULL OR full_name IS NULL OR clerk_id IS NULL
ORDER BY created_at DESC;

-- View the quarantined users:
SELECT * FROM public.ghost_users_review;

-- ============================================================================
-- FINAL VERIFICATION (Run after cleanup)
-- ============================================================================

-- This should return 0 rows if cleanup was successful
SELECT COUNT(*) as ghost_users_remaining
FROM public.users
WHERE email IS NULL OR full_name IS NULL OR clerk_id IS NULL;

-- Check that all remaining users have valid data:
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email,
  COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as with_name,
  COUNT(CASE WHEN clerk_id IS NOT NULL THEN 1 END) as with_clerk_id
FROM public.users;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Run STEP 1-3 first to UNDERSTAND what you're dealing with
-- 2. Choose ONE cleanup option (A, B, C, or D)
-- 3. Uncomment the chosen option and run it
-- 4. Run FINAL VERIFICATION to confirm
-- 5. Then run the RLS migration (999_CRITICAL_RLS_FIX.sql)

