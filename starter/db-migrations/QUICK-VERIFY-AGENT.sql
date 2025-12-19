-- QUICK FIX: Mark your user as a verified agent
-- Copy and run each section in your Supabase SQL Editor

-- =====================================================
-- STEP 1: Check if column exists and add if needed
-- =====================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified_agent BOOLEAN DEFAULT false;


-- =====================================================
-- STEP 2: Find YOUR user ID (the one who owns properties)
-- =====================================================
SELECT 
    u.id as user_id,
    u.email,
    u.clerk_id,
    u.is_verified_agent as currently_verified,
    COUNT(p.id) as total_properties
FROM users u
LEFT JOIN properties p ON p.owner_id = u.id
GROUP BY u.id, u.email, u.clerk_id, u.is_verified_agent
HAVING COUNT(p.id) > 0
ORDER BY total_properties DESC;

-- You should see your user in the results above
-- Copy the user_id from the results


-- =====================================================
-- STEP 3: Mark YOUR user as verified 
-- REPLACE 'your-user-id-here' with the actual ID from Step 2
-- =====================================================
UPDATE users 
SET is_verified_agent = true 
WHERE id = 'your-user-id-here';

-- OR if you know your email, use this instead:
-- UPDATE users SET is_verified_agent = true WHERE email = 'your@email.com';


-- =====================================================
-- STEP 4: Verify it worked
-- =====================================================
SELECT 
    u.id,
    u.email,
    u.is_verified_agent,
    COUNT(p.id) as properties
FROM users u
LEFT JOIN properties p ON p.owner_id = u.id
WHERE u.is_verified_agent = true
GROUP BY u.id, u.email, u.is_verified_agent;

-- You should now see your user with is_verified_agent = true


-- =====================================================
-- STEP 5: Check your specific property
-- Replace 'Russell's Heights' with your property title
-- =====================================================
SELECT 
    p.title,
    p.slug,
    p.owner_id,
    u.email as owner_email,
    u.is_verified_agent
FROM properties p
JOIN users u ON p.owner_id = u.id
WHERE p.title LIKE '%Russell%'
LIMIT 5;


-- =====================================================
-- QUICK TEST: Mark ALL property owners as verified (optional)
-- Uncomment the lines below to run this
-- =====================================================
/*
UPDATE users 
SET is_verified_agent = true 
WHERE id IN (
    SELECT DISTINCT owner_id 
    FROM properties 
    WHERE owner_id IS NOT NULL
);

-- Check how many were updated
SELECT COUNT(*) as verified_agents FROM users WHERE is_verified_agent = true;
*/
