-- Fix service_requests UPDATE to allow admin updates without constraints

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all inserts" ON public.service_requests;
DROP POLICY IF EXISTS "Allow all selects" ON public.service_requests;
DROP POLICY IF EXISTS "Allow all updates" ON public.service_requests;
DROP POLICY IF EXISTS "Allow deletes" ON public.service_requests;

-- Ensure RLS is enabled
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- CREATE PERMISSIVE policies that allow all operations
-- INSERT - Allow anyone to create requests
CREATE POLICY "service_requests_insert_all"
  ON public.service_requests
  FOR INSERT
  WITH CHECK (true);

-- SELECT - Allow viewing all requests
CREATE POLICY "service_requests_select_all"
  ON public.service_requests
  FOR SELECT
  USING (true);

-- UPDATE - Allow updates to any columns except required ones
CREATE POLICY "service_requests_update_all"
  ON public.service_requests
  FOR UPDATE
  USING (true)
  WITH CHECK (
    -- Ensure required fields are not set to NULL during update
    client_name IS NOT NULL
    AND client_email IS NOT NULL
    AND client_phone IS NOT NULL
    AND request_type IS NOT NULL
    AND property_type IS NOT NULL
    AND location IS NOT NULL
  );

-- DELETE - Allow deletes
CREATE POLICY "service_requests_delete_all"
  ON public.service_requests
  FOR DELETE
  USING (true);

-- Grant necessary permissions
GRANT ALL ON public.service_requests TO authenticated, anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
