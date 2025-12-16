-- Run this in Supabase SQL Editor to check your properties
-- This will help debug why properties aren't showing

-- Check if properties table exists and has data
SELECT 
  id, 
  title, 
  status, 
  parish, 
  price,
  image_urls,
  created_at
FROM properties
ORDER BY created_at DESC
LIMIT 10;

-- Check distinct statuses
SELECT DISTINCT status, COUNT(*) as count
FROM properties
GROUP BY status;

-- Check if any properties are available
SELECT COUNT(*) as available_count
FROM properties
WHERE status = 'available';
