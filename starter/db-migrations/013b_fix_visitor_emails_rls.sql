-- Fix RLS policies for visitor_emails to allow public inserts
-- This completely resets the RLS configuration

-- Drop all existing policies first
DROP POLICY IF EXISTS "Anyone can insert visitor emails" ON public.visitor_emails;
DROP POLICY IF EXISTS "Allow public inserts" ON public.visitor_emails;
DROP POLICY IF EXISTS "Admins can view all" ON public.visitor_emails;
DROP POLICY IF EXISTS "Admins can view all visitor emails" ON public.visitor_emails;
DROP POLICY IF EXISTS "Agents can view relevant leads" ON public.visitor_emails;
DROP POLICY IF EXISTS "Verified agents can view leads" ON public.visitor_emails;

-- Disable RLS to ensure clean slate
ALTER TABLE public.visitor_emails DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.visitor_emails TO anon, authenticated;
GRANT ALL ON SEQUENCE public.visitor_emails_id_seq TO anon, authenticated;

-- Re-enable RLS
ALTER TABLE public.visitor_emails ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow ALL inserts (completely permissive)
CREATE POLICY "visitor_emails_insert_policy"
ON public.visitor_emails
FOR INSERT
WITH CHECK (true);

-- Policy 2: Allow admins to view all
CREATE POLICY "visitor_emails_select_admin"
ON public.visitor_emails
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.clerk_id = (SELECT auth.jwt() ->> 'sub')
    AND users.role = 'admin'
  )
);

-- Policy 3: Allow verified agents to view leads
CREATE POLICY "visitor_emails_select_agents"
ON public.visitor_emails
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agents
    JOIN public.users ON users.id = agents.user_id
    WHERE users.clerk_id = (SELECT auth.jwt() ->> 'sub')
    AND agents.verification_status = 'approved'
  )
);
