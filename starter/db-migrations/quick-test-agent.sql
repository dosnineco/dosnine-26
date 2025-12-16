-- QUICK FIX: Check and create test data

-- Step 1: Check current state
SELECT 'Total agents:' as info, COUNT(*)::text as value FROM public.agents
UNION ALL
SELECT 'Total users:', COUNT(*)::text FROM public.users
UNION ALL
SELECT 'Admin users:', COUNT(*)::text FROM public.users WHERE role = 'admin';

-- Step 2: Show any existing agents
SELECT 
  a.id,
  a.business_name,
  a.verification_status,
  u.email as user_email,
  u.full_name as user_name
FROM public.agents a
LEFT JOIN public.users u ON u.id = a.user_id;

-- Step 3: If no agents, create a test one
-- Replace 'YOUR_EMAIL@EXAMPLE.COM' with your actual email
INSERT INTO public.agents (
  user_id,
  business_name,
  years_experience,
  license_number,
  specializations,
  service_areas,
  about_me,
  deals_closed_count,
  verification_status,
  data_sharing_consent
)
SELECT 
  u.id,
  'Test Real Estate Agency',
  5,
  'RE-12345-TEST',
  ARRAY['Residential', 'Commercial', 'Luxury'],
  'Kingston, St. Andrew, Montego Bay',
  'Experienced real estate agent with 5+ years in the industry',
  25,
  'pending',
  true
FROM public.users u
WHERE u.email = 'YOUR_EMAIL@EXAMPLE.COM'  -- ← CHANGE THIS!
AND NOT EXISTS (
  SELECT 1 FROM public.agents WHERE user_id = u.id
)
LIMIT 1;

-- Step 4: Verify insertion
SELECT 
  'Test agent created:' as result,
  COUNT(*)::text as count
FROM public.agents;

-- Step 5: Show all agents with user data (this is what the API queries)
SELECT 
  a.id as agent_id,
  a.business_name,
  a.years_experience,
  a.license_number,
  a.verification_status,
  a.verification_submitted_at,
  a.created_at,
  json_build_object(
    'id', u.id,
    'email', u.email,
    'full_name', u.full_name,
    'phone', u.phone,
    'clerk_id', u.clerk_id
  ) as user
FROM public.agents a
JOIN public.users u ON u.id = a.user_id
ORDER BY a.verification_submitted_at DESC;
