-- Quick Admin Setup Script
-- Run this in Supabase SQL Editor to make yourself admin

-- STEP 1: Make yourself admin (CHANGE EMAIL!)
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'YOUR-EMAIL@EXAMPLE.COM';  -- ← CHANGE THIS TO YOUR EMAIL!

-- STEP 2: Verify admin was set
SELECT 
  id,
  email,
  full_name,
  role,
  user_type,
  created_at
FROM public.users 
WHERE role = 'admin';

-- Expected result: Should show your user with role = 'admin'

-- STEP 3: Check current agent verification queue
SELECT 
  COUNT(*) as pending_agents
FROM public.agents
WHERE verification_status = 'pending';

-- STEP 4: View all pending agents (if any)
SELECT 
  a.id as agent_id,
  a.business_name,
  a.verification_status,
  a.verification_submitted_at,
  u.email,
  u.full_name,
  u.phone
FROM public.agents a
JOIN public.users u ON u.id = a.user_id
WHERE a.verification_status = 'pending'
ORDER BY a.verification_submitted_at DESC;

-- Now you can access the admin dashboard at:
-- http://localhost:3002/admin/agents
