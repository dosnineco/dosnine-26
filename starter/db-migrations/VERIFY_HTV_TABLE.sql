-- Quick verification that htv_orders table exists and is accessible
-- Run this in Supabase SQL Editor to verify setup

-- Check if table exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name = 'htv_orders';

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'htv_orders'
ORDER BY ordinal_position;

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'htv_orders';

-- Try a test insert (will be cleaned up after)
INSERT INTO public.htv_orders (
  business_name,
  phone,
  size,
  color,
  quantity,
  delivery_area,
  rush_order,
  subtotal,
  delivery_fee,
  total
) VALUES (
  'Test Business',
  '876-123-4567',
  'medium',
  'black',
  4,
  'halfWayTree',
  false,
  4800,
  0,
  4800
) RETURNING id, business_name, created_at;

-- Check the inserted row
SELECT COUNT(*) as total_orders FROM public.htv_orders;

-- Clean up test data
DELETE FROM public.htv_orders WHERE business_name = 'Test Business';

-- Final verification
SELECT 'Setup complete! Table exists and is accessible.' as status;
