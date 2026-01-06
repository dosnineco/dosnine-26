-- Fix for RLS blocking anonymous form submissions
-- This allows anonymous users to submit service requests and visitor emails

-- Enable RLS on service_requests if not already enabled
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert their own service requests
CREATE POLICY "Allow anonymous to create service requests"
ON service_requests FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated users to see their own service requests
CREATE POLICY "Users can view own service requests"
ON service_requests FOR SELECT
TO authenticated
USING (
  client_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.clerk_id = auth.jwt()->>'sub'
    AND users.role = 'admin'
  )
);

-- Allow admins to view all service requests
CREATE POLICY "Admins can view all service requests"
ON service_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.clerk_id = auth.jwt()->>'sub'
    AND users.role = 'admin'
  )
);

-- Enable RLS on visitor_emails if not already enabled
ALTER TABLE visitor_emails ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert visitor emails
CREATE POLICY "Allow anonymous to create visitor emails"
ON visitor_emails FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated users to view visitor emails (admins only via service role)
-- Anonymous can't read, only insert
CREATE POLICY "Admins can view visitor emails"
ON visitor_emails FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.clerk_id = auth.jwt()->>'sub'
    AND users.role = 'admin'
  )
);

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('service_requests', 'visitor_emails');
