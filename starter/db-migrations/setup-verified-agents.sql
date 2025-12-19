-- Setup Verified Agents Feature
-- This script ensures the is_verified_agent column exists and sets up sample verified agents

-- Step 1: Add is_verified_agent column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'is_verified_agent'
    ) THEN
        ALTER TABLE users ADD COLUMN is_verified_agent BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_verified_agent column to users table';
    ELSE
        RAISE NOTICE 'is_verified_agent column already exists';
    END IF;
END $$;

-- Step 2: Check current verified agents
SELECT 
    id,
    clerk_id,
    email,
    is_verified_agent,
    created_at
FROM users
WHERE is_verified_agent = true;

-- Step 3: View all users with their verification status
SELECT 
    u.id,
    u.clerk_id,
    u.email,
    u.is_verified_agent,
    COUNT(p.id) as property_count
FROM users u
LEFT JOIN properties p ON p.owner_id = u.id
GROUP BY u.id, u.clerk_id, u.email, u.is_verified_agent
ORDER BY property_count DESC;

-- Step 4: TO MARK A USER AS VERIFIED AGENT, run this (replace with actual user ID):
-- UPDATE users SET is_verified_agent = true WHERE id = 'your-user-id-here';
-- or by email:
-- UPDATE users SET is_verified_agent = true WHERE email = 'agent@example.com';

-- Step 5: TO TEST - Mark the first user with properties as verified (UNCOMMENT TO RUN)
-- UPDATE users 
-- SET is_verified_agent = true 
-- WHERE id = (
--     SELECT u.id 
--     FROM users u
--     INNER JOIN properties p ON p.owner_id = u.id
--     GROUP BY u.id
--     ORDER BY COUNT(p.id) DESC
--     LIMIT 1
-- );

-- Step 6: Verify properties from verified agents
SELECT 
    p.id,
    p.title,
    p.slug,
    u.email as owner_email,
    u.is_verified_agent
FROM properties p
JOIN users u ON p.owner_id = u.id
WHERE u.is_verified_agent = true
LIMIT 10;
