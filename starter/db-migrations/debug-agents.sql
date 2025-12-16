-- Debug: Check agents table and insert test data

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'agents'
) as table_exists;

-- 2. Count agents
SELECT COUNT(*) as total_agents FROM public.agents;

-- 3. Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'agents';

-- 4. List all RLS policies on agents table
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'agents';

-- 5. Check if you have any users in users table
SELECT 
  id,
  email,
  full_name,
  role,
  user_type,
  clerk_id
FROM public.users
LIMIT 5;

-- 6. If no agents exist, let's create a test agent
-- First, find a user (change the email to match your user)
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Get first user or create one
  SELECT id INTO test_user_id FROM public.users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No users found! Please create a user first.';
  ELSE
    -- Check if agent already exists for this user
    IF NOT EXISTS (SELECT 1 FROM public.agents WHERE user_id = test_user_id) THEN
      -- Insert test agent
      INSERT INTO public.agents (
        user_id,
        business_name,
        years_experience,
        license_number,
        specializations,
        service_areas,
        about_me,
        deals_closed_count,
        verification_status
      ) VALUES (
        test_user_id,
        'Test Real Estate Agency',
        5,
        'RE-12345',
        ARRAY['Residential', 'Commercial'],
        'Kingston, St. Andrew, Montego Bay',
        'Experienced real estate agent specializing in luxury properties',
        25,
        'pending'
      );
      RAISE NOTICE 'Test agent created successfully!';
    ELSE
      RAISE NOTICE 'Agent already exists for this user';
    END IF;
  END IF;
END $$;

-- 7. Verify agents now exist
SELECT 
  a.id,
  a.business_name,
  a.verification_status,
  a.years_experience,
  u.email,
  u.full_name
FROM public.agents a
JOIN public.users u ON u.id = a.user_id;

-- 8. Check storage bucket
SELECT 
  id,
  name,
  public
FROM storage.buckets
WHERE id = 'agent-documents';

-- 9. If RLS is blocking, temporarily disable it for testing
-- UNCOMMENT ONLY FOR TESTING, RE-ENABLE AFTER!
-- ALTER TABLE public.agents DISABLE ROW LEVEL SECURITY;

-- 10. To re-enable RLS after testing:
-- ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
