-- Check and Fix Service Requests Setup
-- Run this to verify and fix database for property agent requests

-- =====================================================
-- STEP 1: Check if service_requests table exists
-- =====================================================
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'service_requests'
) as table_exists;


-- =====================================================
-- STEP 2: Check current RLS policies
-- =====================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'service_requests';


-- =====================================================
-- STEP 3: Grant permissions if needed
-- =====================================================
GRANT ALL ON public.service_requests TO authenticated, anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;


-- =====================================================
-- STEP 4: Ensure RLS policies allow inserts
-- =====================================================
-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can create requests" ON public.service_requests;
DROP POLICY IF EXISTS "Users can view requests" ON public.service_requests;
DROP POLICY IF EXISTS "Users can update requests" ON public.service_requests;

-- Create permissive INSERT policy
CREATE POLICY "Allow all inserts"
  ON public.service_requests
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create permissive SELECT policy
CREATE POLICY "Allow all selects"
  ON public.service_requests
  FOR SELECT
  TO public
  USING (true);

-- Create permissive UPDATE policy
CREATE POLICY "Allow all updates"
  ON public.service_requests
  FOR UPDATE
  TO public
  USING (true);


-- =====================================================
-- STEP 5: Check if agent_notifications table exists
-- =====================================================
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'agent_notifications'
) as agent_notifications_exists;


-- =====================================================
-- STEP 6: Create agent_notifications if it doesn't exist
-- =====================================================
CREATE TABLE IF NOT EXISTS public.agent_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID NOT NULL,
    service_request_id UUID REFERENCES public.service_requests(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_agent_notifications_agent_id ON public.agent_notifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_is_read ON public.agent_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_service_request_id ON public.agent_notifications(service_request_id);

-- Enable RLS
ALTER TABLE public.agent_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for agent_notifications
DROP POLICY IF EXISTS "Allow all agent notification inserts" ON public.agent_notifications;
CREATE POLICY "Allow all agent notification inserts"
  ON public.agent_notifications
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all agent notification selects" ON public.agent_notifications;
CREATE POLICY "Allow all agent notification selects"
  ON public.agent_notifications
  FOR SELECT
  TO public
  USING (true);

-- Grant permissions
GRANT ALL ON public.agent_notifications TO authenticated, anon;


-- =====================================================
-- STEP 7: Test insert to verify it works
-- =====================================================
-- Uncomment to test (replace with actual data):
/*
INSERT INTO public.service_requests (
    client_name,
    client_email,
    client_phone,
    request_type,
    property_type,
    location,
    budget_min,
    budget_max,
    bedrooms,
    bathrooms,
    description,
    urgency,
    status
) VALUES (
    'Test User',
    'test@example.com',
    '876-555-0123',
    'rent',
    'house',
    'Kingston',
    100000,
    200000,
    2,
    1,
    'Test request',
    'normal',
    'open'
) RETURNING *;
*/


-- =====================================================
-- STEP 8: View recent service requests
-- =====================================================
SELECT 
    id,
    client_name,
    client_email,
    request_type,
    location,
    status,
    assigned_agent_id,
    created_at
FROM public.service_requests
ORDER BY created_at DESC
LIMIT 10;


-- =====================================================
-- STEP 9: Check agents table
-- =====================================================
SELECT 
    a.id as agent_id,
    a.user_id,
    u.email,
    u.agent_is_verified,
    a.verification_status,
    COUNT(p.id) as property_count
FROM agents a
LEFT JOIN users u ON u.id = a.user_id
LEFT JOIN properties p ON p.owner_id = a.user_id
GROUP BY a.id, a.user_id, u.email, u.agent_is_verified, a.verification_status
ORDER BY property_count DESC;
