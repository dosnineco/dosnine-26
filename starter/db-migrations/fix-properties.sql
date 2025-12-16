-- Run this SQL in Supabase SQL Editor to fix property statuses and check data

-- 1. Check current properties
SELECT id, title, status, parish, town, image_urls FROM properties LIMIT 10;

-- 2. Update all NULL or empty status to 'available'
UPDATE properties 
SET status = 'available' 
WHERE status IS NULL OR status = '' OR status NOT IN ('available', 'rented', 'coming_soon');

-- 3. Verify the update
SELECT status, COUNT(*) as count FROM properties GROUP BY status;

-- 4. Check if image_urls column exists and has data
SELECT 
  COUNT(*) as total_properties,
  COUNT(image_urls) as properties_with_images,
  COUNT(CASE WHEN array_length(image_urls, 1) > 0 THEN 1 END) as properties_with_image_data
FROM properties;
