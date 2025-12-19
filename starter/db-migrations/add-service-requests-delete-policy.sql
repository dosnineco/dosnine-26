-- Add DELETE policy for service_requests table
-- This allows admins (and other authenticated users) to delete service requests

-- Drop existing DELETE policy if it exists
DROP POLICY IF EXISTS "Allow all deletes" ON public.service_requests;
DROP POLICY IF EXISTS "Allow deletes" ON public.service_requests;

-- Create permissive DELETE policy
CREATE POLICY "Allow all deletes"
  ON public.service_requests
  FOR DELETE
  TO public
  USING (true);

-- Verify all policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'service_requests'
ORDER BY cmd;
