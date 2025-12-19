-- Quick script to check and mark verified agents
-- Run this in your Supabase SQL Editor

-- 1. First, see all users who have properties
SELECT 
    u.id,
    u.email,
    u.clerk_id,
    u.is_verified_agent,
    COUNT(p.id) as total_properties
FROM users u
LEFT JOIN properties p ON p.owner_id = u.id
GROUP BY u.id
HAVING COUNT(p.id) > 0
ORDER BY total_properties DESC;

-- 2. To mark a specific user as verified agent (replace the email):
-- UPDATE users SET is_verified_agent = true WHERE email = 'your-agent@email.com';

-- 3. Or mark by user ID:
-- UPDATE users SET is_verified_agent = true WHERE id = 'user-uuid-here';

-- 4. Quick test - mark ALL property owners as verified (USE WITH CAUTION):
-- UPDATE users SET is_verified_agent = true 
-- WHERE id IN (
--     SELECT DISTINCT owner_id FROM properties WHERE owner_id IS NOT NULL
-- );

-- 5. Verify the changes:
SELECT 
    u.id,
    u.email,
    u.is_verified_agent,
    COUNT(p.id) as properties
FROM users u
LEFT JOIN properties p ON p.owner_id = u.id
WHERE u.is_verified_agent = true
GROUP BY u.id;
