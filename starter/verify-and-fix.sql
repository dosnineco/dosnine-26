-- RUN THIS IN SUPABASE SQL EDITOR TO FIX ALL ISSUES

-- 1. Check current user roles
SELECT clerk_id, email, role FROM users;

-- 2. Set yourself as admin (replace YOUR_CLERK_ID with your actual clerk_id from above)
-- Find your clerk_id in the users table, it looks like: user_xxxxxxxxxxxxx
-- UPDATE users SET role = 'admin' WHERE clerk_id = 'YOUR_CLERK_ID';

-- 3. Check property statuses
SELECT 
  id, 
  title, 
  status,
  CASE 
    WHEN status IS NULL THEN 'NULL'
    WHEN status = '' THEN 'EMPTY'
    ELSE status
  END as status_display
FROM properties
LIMIT 10;

-- 4. Count properties by status
SELECT 
  COALESCE(status, 'NULL/EMPTY') as status, 
  COUNT(*) as count 
FROM properties 
GROUP BY status;

-- 5. Update all NULL or empty statuses to 'available'
UPDATE properties 
SET status = 'available' 
WHERE status IS NULL OR status = '' OR status NOT IN ('available', 'rented', 'coming_soon');

-- 6. Verify the fix worked
SELECT 
  COALESCE(status, 'NULL/EMPTY') as status, 
  COUNT(*) as count 
FROM properties 
GROUP BY status;
