-- Fix RLS policies for course_preorders table
-- This allows the API to insert and admins to read

-- Enable RLS if not already enabled
ALTER TABLE course_preorders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable insert for all users" ON course_preorders;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON course_preorders;
DROP POLICY IF EXISTS "Enable all for admins" ON course_preorders;

-- Policy 1: Allow anyone to insert (for course signups)
CREATE POLICY "Enable insert for all users" 
ON course_preorders 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Policy 2: Allow admins to read all signups
-- Note: This requires a function to check if user is admin
CREATE POLICY "Enable read for admins" 
ON course_preorders 
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.clerk_id = auth.jwt() ->> 'sub' 
    AND users.role = 'admin'
  )
);

-- Policy 3: Allow admins to update (for payment confirmation)
CREATE POLICY "Enable update for admins" 
ON course_preorders 
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.clerk_id = auth.jwt() ->> 'sub' 
    AND users.role = 'admin'
  )
);

-- Alternative: If the admin check doesn't work, temporarily allow all authenticated users to read
-- Uncomment this if needed for testing:
-- DROP POLICY IF EXISTS "Enable read for admins" ON course_preorders;
-- CREATE POLICY "Enable read for authenticated users" 
-- ON course_preorders 
-- FOR SELECT
-- TO authenticated
-- USING (true);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'course_preorders';
