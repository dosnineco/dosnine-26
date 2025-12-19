-- Sync Agent Verification Status with Users Table
-- This syncs agents.verification_status with users.agent_is_verified and users.verified_at

-- =====================================================
-- STEP 1: Add columns to users table if they don't exist
-- =====================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_is_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;


-- =====================================================
-- STEP 2: Check current agents and their verification status
-- =====================================================
SELECT 
    id,
    user_id,
    verification_status,
    created_at,
    updated_at
FROM agents
ORDER BY created_at DESC;


-- =====================================================
-- STEP 3: Sync verified agents from agents table to users table
-- Update users where their corresponding agent is APPROVED (not 'verified')
-- =====================================================
UPDATE users 
SET 
    agent_is_verified = true,
    verified_at = COALESCE(users.verified_at, NOW())
WHERE id IN (
    SELECT user_id 
    FROM agents 
    WHERE verification_status = 'approved'
    AND user_id IS NOT NULL
);


-- =====================================================
-- STEP 4: Verify the sync worked
-- Check users who are now marked as verified agents
-- =====================================================
SELECT 
    u.id as user_id,
    u.email,
    u.agent_is_verified,
    u.verified_at,
    a.verification_status as agent_status,
    COUNT(p.id) as total_properties
FROM users u
LEFT JOIN agents a ON a.user_id = u.id
LEFT JOIN properties p ON p.owner_id = u.id
WHERE u.agent_is_verified = true
GROUP BY u.id, u.email, u.agent_is_verified, u.verified_at, a.verification_status;


-- =====================================================
-- STEP 5: Check which properties belong to verified agents
-- =====================================================
SELECT 
    p.id,
    p.title,
    p.slug,
    u.email as owner_email,
    u.agent_is_verified,
    u.verified_at,
    a.verification_status
FROM properties p
JOIN users u ON p.owner_id = u.id
LEFT JOIN agents a ON a.user_id = u.id
WHERE u.agent_is_verified = true
LIMIT 20;


-- =====================================================
-- STEP 6: Create a trigger to auto-sync in the future
-- When an agent's verification_status changes to 'approved', update users table
-- =====================================================
CREATE OR REPLACE FUNCTION sync_agent_verification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.verification_status = 'approved' AND (OLD.verification_status IS NULL OR OLD.verification_status != 'approved') THEN
        UPDATE users 
        SET 
            agent_is_verified = true,
            verified_at = COALESCE(verified_at, NOW())
        WHERE id = NEW.user_id;
    ELSIF NEW.verification_status != 'approved' AND (OLD.verification_status = 'approved') THEN
        UPDATE users 
        SET 
            agent_is_verified = false,
            verified_at = NULL
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS agent_verification_sync ON agents;

-- Create the trigger
CREATE TRIGGER agent_verification_sync
AFTER UPDATE ON agents
FOR EACH ROW
EXECUTE FUNCTION sync_agent_verification();


-- =====================================================
-- STEP 7: Manual verification for testing
-- To manually mark a user as verified agent:
-- =====================================================
-- First, find the user:
-- SELECT id, email, agent_is_verified FROM users WHERE email = 'your@email.com';

-- Then update manually:
-- UPDATE users SET agent_is_verified = true, verified_at = NOW() WHERE id = 'user-id-here';


-- =====================================================
-- STEP 8: Verify everything is working
-- =====================================================
SELECT 
    'Total Agents' as type,
    COUNT(*) as count
FROM agents
UNION ALL
SELECT 
    'Approved Agents' as type,
    COUNT(*) as count
FROM agents WHERE verification_status = 'approved'
UNION ALL
SELECT 
    'Users Marked as Verified' as type,
    COUNT(*) as count
FROM users WHERE agent_is_verified = true;
