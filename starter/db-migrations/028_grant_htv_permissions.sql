-- Ensure htv_orders table is exposed to PostgREST API
-- Run this in Supabase SQL Editor

-- Check current schema
SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename = 'htv_orders';

-- Grant permissions to anon role (PostgREST uses this)
GRANT ALL ON public.htv_orders TO anon;
GRANT ALL ON public.htv_orders TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant sequence permissions if needed
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify permissions
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'htv_orders';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Permissions granted and schema cache notified to reload' as status;
