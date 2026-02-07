-- Test if htv_orders table and storage is working correctly
-- Run this after the main migration to verify everything is set up

-- Test 1: Check if table exists and is accessible
SELECT 'Table exists and is accessible' as test_1;
SELECT * FROM public.htv_orders LIMIT 1;

-- Test 2: Check if we can insert
INSERT INTO public.htv_orders (
  business_name,
  phone,
  email,
  size,
  color,
  quantity,
  delivery_area,
  rush_order,
  logo_url,
  logo_filename,
  subtotal,
  delivery_fee,
  total,
  status
) VALUES (
  'Test Business',
  '876-123-4567',
  'test@test.com',
  'medium',
  'black',
  4,
  'halfWayTree',
  false,
  'https://test.com/logo.png',
  'test-logo.png',
  4800,
  0,
  4800,
  'pending'
) RETURNING id, business_name, created_at;

-- Test 3: Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'htv_orders';

-- Test 4: Check storage bucket
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'htv-logos';

-- Test 5: Check storage policies
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%htv-logos%';

-- Clean up test data
DELETE FROM public.htv_orders WHERE business_name = 'Test Business';
