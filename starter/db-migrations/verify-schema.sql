-- Run this in Supabase SQL Editor to verify your schema and data

-- 1. Check properties table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'properties'
ORDER BY ordinal_position;

-- 2. Count total properties
SELECT COUNT(*) as total_properties FROM properties;

-- 3. Check properties with images
SELECT 
    id,
    title,
    status,
    image_urls,
    CASE 
        WHEN image_urls IS NOT NULL AND array_length(image_urls, 1) > 0 THEN 'Has image_urls'
        ELSE 'No image_urls'
    END as image_status
FROM properties
LIMIT 5;

-- 4. Update any properties without status to 'available'
UPDATE properties 
SET status = 'available' 
WHERE status IS NULL OR status = '';

-- 5. Verify the update
SELECT status, COUNT(*) as count
FROM properties
GROUP BY status;
